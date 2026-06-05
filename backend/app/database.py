from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str
    database_name: str = "techdispatch"

    class Config:
        env_file = ".env"


settings = Settings()

client = AsyncIOMotorClient(settings.mongodb_url)
db = client[settings.database_name]
