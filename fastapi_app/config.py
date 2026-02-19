from pydantic_settings import BaseSettings, SettingsConfigDict


class AppBaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        extra="ignore",
    )


class FastAPIConfig(AppBaseSettings):
    fastapi_host: str
    fastapi_port: int


class RedisConfig(AppBaseSettings):
    redis_host: str
    redis_port: int


class SQLiteConfig(AppBaseSettings):
    db_url: str


class Settings(BaseSettings):
    fastapi_config: FastAPIConfig = FastAPIConfig()
    redis_config: RedisConfig = RedisConfig()
    sqlite_config: SQLiteConfig = SQLiteConfig()


settings = Settings()