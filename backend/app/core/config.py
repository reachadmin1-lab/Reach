from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg://user:password@localhost:5432/reach"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # App
    app_url: str = "http://localhost:3000"
    environment: str = "development"

    # Encryption key for PII fields (Fernet key, base64-encoded 32 bytes)
    encryption_key: str = ""

    # ISR revalidation
    revalidation_secret: str = ""


settings = Settings()
