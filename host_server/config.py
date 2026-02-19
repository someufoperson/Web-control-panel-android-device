from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='./.env', extra="ignore")

class Setting(Settings):
    TOKEN: str
    ADMIN_ID: int

settings = Setting()