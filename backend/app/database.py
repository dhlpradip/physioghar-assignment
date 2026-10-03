from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://physiodesk:physiodesk@localhost:5432/physiodesk"
    secret_key: str = "development-only-change-me"
    access_token_expire_minutes: int = 480
    cors_origins: str = "http://localhost:3000"
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
class Base(DeclarativeBase): pass

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
