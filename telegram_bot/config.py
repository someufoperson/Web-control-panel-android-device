from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    TOKEN: str
    LINK: str
    REDIRECT_LINK: str


settings = Settings()
