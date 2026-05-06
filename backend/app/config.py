from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Literal


class Settings(BaseSettings):
    # Database
    database_url: str = Field(..., alias="DATABASE_URL")
    database_sync_url: str = Field(..., alias="DATABASE_SYNC_URL")

    # Security
    secret_key: str = Field(..., alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=480, alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Banxico
    banxico_api_key: str = Field(default="", alias="BANXICO_API_KEY")

    # Licensing
    license_mode: Literal["none", "offline_key", "online_activation"] = Field(
        default="none", alias="LICENSE_MODE"
    )
    license_public_key: str = Field(default="", alias="LICENSE_PUBLIC_KEY")
    license_activation_server: str = Field(default="", alias="LICENSE_ACTIVATION_SERVER")

    # Demo
    demo_mode: bool = Field(default=False, alias="DEMO_MODE")

    # Business
    business_name: str = Field(default="Mi Negocio", alias="BUSINESS_NAME")
    business_type: str = Field(default="general", alias="BUSINESS_TYPE")

    # CORS
    cors_origins: list[str] = Field(default=["http://localhost:3000"], alias="CORS_ORIGINS")

    # Backup
    backup_path: str = Field(default="/backups", alias="BACKUP_PATH")
    drive_backup_enabled: bool = Field(default=False, alias="DRIVE_BACKUP_ENABLED")

    # Print Bridge
    print_bridge_url: str = Field(default="http://localhost:9100", alias="PRINT_BRIDGE_URL")
    print_bridge_enabled: bool = Field(default=False, alias="PRINT_BRIDGE_ENABLED")

    # Telemetry
    telemetry_enabled: bool = Field(default=False, alias="TELEMETRY_ENABLED")
    telemetry_endpoint: str = Field(default="", alias="TELEMETRY_ENDPOINT")

    # Support
    support_whatsapp: str = Field(default="", alias="SUPPORT_WHATSAPP")

    # Environment
    env: Literal["development", "production", "test"] = Field(
        default="development", alias="ENV"
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    model_config = {"env_file": ".env", "populate_by_name": True}

    @property
    def is_production(self) -> bool:
        return self.env == "production"


settings = Settings()
