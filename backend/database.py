from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://whale:whale_secret_2024@postgres:5432/whaletracker")

# PostgreSQL için connect_args gerekmez; SQLite fallback için eklenir
_is_sqlite = DATABASE_URL.startswith("sqlite")
if _is_sqlite:
    _engine_kwargs = {"connect_args": {"check_same_thread": False}}
else:
    # PostgreSQL bağlantı havuzu: üretim yükleri için optimize edilmiş
    _engine_kwargs = {
        "pool_size": 10,          # sürekli açık bağlantı sayısı
        "max_overflow": 20,       # pik yükte eklenebilecek ek bağlantı
        "pool_pre_ping": True,    # "bağlantı canlı mı?" kontrolü (stale bağlantı önler)
        "pool_recycle": 1800,     # 30dk'da bir bağlantıları yenile
    }

engine = create_engine(DATABASE_URL, **_engine_kwargs)

# SQLite'a özgü pragma'lar sadece SQLite bağlantısında çalış
if _is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
