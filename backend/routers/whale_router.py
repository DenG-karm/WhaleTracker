from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
import asyncio
import json
import logging
import jwt
import os
from cache import get_pubsub, WHALE_CHANNEL

router = APIRouter()
_logger = logging.getLogger(__name__)

_SECRET_KEY = os.getenv("SECRET_KEY", "")
_ALGORITHM  = "HS256"


def _authenticate_ws_token(token: str | None) -> int | None:
    """Token geçerliyse user_id döner, geçersizse None."""
    if not token or not _SECRET_KEY:
        return None
    try:
        payload = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
        uid = payload.get("sub")
        return int(uid) if uid else None
    except jwt.InvalidTokenError:
        return None


@router.websocket("/ws/whale-alerts")
async def websocket_whale_alerts(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    """
    Redis pub/sub üzerinden balina transferlerini dinler.
    Kimlik doğrulama: ?token=<jwt> query param ile yapılır.
    """
    user_id = _authenticate_ws_token(token)
    if user_id is None:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    _logger.info("[WhaleWS] Kullanıcı %s bağlandı", user_id)

    pubsub = get_pubsub()
    pubsub.subscribe(WHALE_CHANNEL)

    try:
        async def forward_alerts():
            while True:
                message = pubsub.get_message(ignore_subscribe_messages=True)
                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
                await asyncio.sleep(0.5)

        async def check_client_disconnect():
            try:
                while True:
                    await websocket.receive_text()
            except WebSocketDisconnect:
                pass

        forward_task = asyncio.create_task(forward_alerts())
        client_task  = asyncio.create_task(check_client_disconnect())

        done, pending = await asyncio.wait(
            [forward_task, client_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        _logger.info("[WhaleWS] Kullanıcı %s bağlantısı kesildi", user_id)
    except Exception as e:
        _logger.error("[WhaleWS] Hata — user=%s: %s", user_id, e)
    finally:
        pubsub.unsubscribe(WHALE_CHANNEL)
        pubsub.close()
