from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    TG_API_ID: str = ""
    TG_API_HASH: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    UZBEKVOICE_API_KEY: str = ""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://shoda:shoda@postgres:5432/shoda"
    JWT_SECRET: str = "change-me"
    JWT_EXPIRE_MINUTES: int = 720
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:8080"
    STORAGE_LOCAL_DIR: str = "/var/shoda/files"
    BOOTSTRAP_SUPERADMIN_USERNAME: str = "azizbek_piima"
    BOOTSTRAP_SUPERADMIN_PASSWORD: str = "059501032004piima"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
