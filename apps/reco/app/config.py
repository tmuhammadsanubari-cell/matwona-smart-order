from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    """Konfigurasi dari .env root (lihat .env.example, bagian apps/reco)."""

    model_config = SettingsConfigDict(env_file=(ROOT_ENV, ".env"), extra="ignore")

    reco_database_url: str = "postgresql+psycopg://matwona:matwona@localhost:5432/matwona_smart_order"
    reco_internal_key: str = "dev-internal-key"
    reco_min_support: float = 0.01
    reco_min_confidence: float = 0.2
    reco_min_lift: float = 1.0
    reco_training_window_days: int = 180
    reco_holdout_ratio: float = 0.2


settings = Settings()
