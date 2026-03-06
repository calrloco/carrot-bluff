from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "carrot-api"
    database_url: str = "postgresql+psycopg2://postgres:postgres@db:5432/carrot"
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "qwen2.5:1.5b"
    cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
