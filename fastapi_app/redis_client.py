import redis.asyncio as redis
from fastapi import Depends
from typing import Annotated
from config import settings


redis_pool = redis.ConnectionPool(
    host=settings.redis_config.redis_host,
    port=settings.redis_config.redis_port,
    decode_responses=True
)


async def get_redis() -> redis.Redis:
    return redis.Redis(connection_pool=redis_pool)


RedisDep = Annotated[redis.Redis, Depends(get_redis)]