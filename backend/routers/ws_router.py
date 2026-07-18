from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import json
import asyncio
import websockets
import ssl
import logging
import os
from collections import defaultdict
from cache import cache_price
import jwt
import os

_logger = logging.getLogger(__name__)
_WS_MAX_RECONNECTS = 5
_WS_BACKOFF_BASE   = 1.0  # seconds

_SECRET_KEY = os.getenv("SECRET_KEY", "fallback_key_degistir")
_ALGORITHM = "HS256"

# ── Radar Connection Manager ──
class RadarConnectionManager:
    """
    Bağlantıları user_id bazında tutar.
    Bir kullanıcı birden fazla sekme açsa bile tüm bağlantılarına mesaj gönderilir.
    """
    def __init__(self):
        # user_id -> [WebSocket, ...]
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id].append(websocket)
        _logger.info("[WS-RADAR] Kullanıcı %s bağlandtı. Toplam: %d", user_id, self._total())

    def disconnect(self, user_id: int, websocket: WebSocket):
        conns = self.active_connections.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_connections.pop(user_id, None)
        _logger.info("[WS-RADAR] Kullanıcı %s koptu. Toplam: %d", user_id, self._total())

    async def send_to_user(self, user_id: int, message: dict):
        """Sadece belirtilen kullanıcının tüm açık bağlantılarına gönderir."""
        dead = []
        for ws in self.active_connections.get(user_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)

    async def broadcast(self, message: dict):
        """Tüm bağlı kullanıcılara gönderir (sistem geneli duyurular için)."""
        for user_id in list(self.active_connections):
            await self.send_to_user(user_id, message)

    def _total(self) -> int:
        return sum(len(v) for v in self.active_connections.values())

radar_manager = RadarConnectionManager()

router = APIRouter()

@router.websocket("/ws/radar")
async def websocket_radar(
    websocket: WebSocket,
    token: str = Query(..., description="JWT erişim token'ı")
):
    """
    Akıllı Radar WebSocket endpoint'i.
    Client bağlanırken ?token=<JWT> query parametresi göndermek zorunda.
    Her kullanıcıya yalnızca kendi açık pozisyonlarına ait uyarılar iletilir.
    """
    # ── JWT doğrulama ──
    try:
        payload = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
        user_id: int = int(payload.get("sub"))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        await websocket.close(code=4001, reason="Geçersiz token")
        return

    await radar_manager.connect(user_id, websocket)
    try:
        while True:
            # Ping/pong veya client komutlarını bekle
            await websocket.receive_text()
    except WebSocketDisconnect:
        radar_manager.disconnect(user_id, websocket)
    except Exception:
        radar_manager.disconnect(user_id, websocket)

@router.websocket("/ws/live-prices")
async def websocket_live_prices(websocket: WebSocket):
    """
    Frontend'den gelen sembol listesine göre Binance WebSocket ağına bağlanır,
    verileri işler ve anlık olarak Frontend'e aktarır.
    Binance bağlantısı koptuğunda exponential backoff ile otomatik yeniden bağlanır.
    """
    await websocket.accept()
    try:
        data = await websocket.receive_text()
        payload = json.loads(data)
        symbols = payload.get("symbols", [])

        _logger.info("[WS] Semboller alındı: %s", symbols)

        if not symbols:
            _logger.warning("[WS] Sembol listesi boş, bağlantı kapatılıyor")
            await websocket.close()
            return

        streams = "/".join([f"{sym.lower()}@ticker" for sym in symbols])
        binance_url = f"wss://stream.binance.com:9443/ws/{streams}"

        # Production'da tam SSL doğrulaması; geliştirmede check_hostname kapatılabilir
        ssl_context = ssl.create_default_context()
        if os.getenv("ENVIRONMENT", "development").lower() != "production":
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

        client_disconnected = asyncio.Event()

        async def _pump_binance():
            reconnect_count = 0
            while reconnect_count <= _WS_MAX_RECONNECTS:
                if client_disconnected.is_set():
                    return
                try:
                    async with websockets.connect(binance_url, ssl=ssl_context) as bws:
                        reconnect_count = 0  # başarılı bağlantıda sayacı sıfırla
                        _logger.info("[WS] Binance'e bağlandı")
                        async for msg in bws:
                            if client_disconnected.is_set():
                                return
                            try:
                                raw = json.loads(msg)
                                if 's' in raw and 'c' in raw:
                                    clean_data = {
                                        "symbol": raw['s'],
                                        "price":  raw['c'],
                                        "change": raw['P'],
                                        "isUp":   float(raw['P']) >= 0,
                                    }
                                    try:
                                        cache_price(clean_data["symbol"], clean_data)
                                    except Exception as cache_exc:
                                        _logger.warning("[WS] Cache error: %s", cache_exc)
                                    await websocket.send_json(clean_data)
                            except json.JSONDecodeError as jde:
                                _logger.warning("[WS] JSON parse error: %s", jde)
                            except Exception as msg_exc:
                                _logger.error("[WS] Message processing error: %s", msg_exc)
                except asyncio.CancelledError:
                    return
                except Exception as conn_exc:
                    if client_disconnected.is_set():
                        return
                    reconnect_count += 1
                    if reconnect_count > _WS_MAX_RECONNECTS:
                        _logger.error("[WS] Binance max reconnect aşıldı, bağlantı sonlandırılıyor")
                        break
                    delay = _WS_BACKOFF_BASE * (2 ** (reconnect_count - 1))
                    _logger.warning(
                        "[WS] Binance bağlantısı kesildi: %s. %.1fs sonra yeniden bağlanılacak (deneme %d/%d)",
                        conn_exc, delay, reconnect_count, _WS_MAX_RECONNECTS,
                    )
                    try:
                        await websocket.send_json({"status": "reconnecting", "attempt": reconnect_count})
                    except Exception:
                        return
                    await asyncio.sleep(delay)

        async def _watch_client():
            try:
                while True:
                    await websocket.receive_text()
            except (WebSocketDisconnect, asyncio.CancelledError):
                pass
            except Exception as exc:
                _logger.warning("[WS] Client watch error: %s", exc)
            finally:
                client_disconnected.set()

        pump_task  = asyncio.create_task(_pump_binance())
        watch_task = asyncio.create_task(_watch_client())

        done, pending = await asyncio.wait(
            [pump_task, watch_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    except WebSocketDisconnect:
        _logger.info("[WS] Client WebSocket bağlantısını kesti")
    except Exception as exc:
        _logger.error("[WS] WebSocket Hatası: %s: %s", type(exc).__name__, exc)
        try:
            await websocket.send_json({"error": str(exc)})
        except Exception:
            pass