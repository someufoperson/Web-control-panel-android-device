from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import uvicorn
import redis.asyncio as redis

from database import create_meta, preparing_table_after_restart
from exceptions import DatabaseError, DeviceNotFoundError, InvalidStatusError
from redis_client import redis_pool
from api import router as devices_router
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis.Redis(connection_pool=redis_pool)
    await create_meta()
    await preparing_table_after_restart()
    yield
    await redis_pool.disconnect()


app = FastAPI(title="Device Remote Control", lifespan=lifespan)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    "http://frontend:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(devices_router)


@app.exception_handler(DeviceNotFoundError)
async def device_not_found_handler(request: Request, exc: DeviceNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(exc)}
    )


@app.exception_handler(DatabaseError)
async def database_error_handler(request: Request, exc: DatabaseError):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Database error"},
    )


@app.exception_handler(InvalidStatusError)
async def invalid_status_error_handler(request: Request, exc: InvalidStatusError):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Invalid status for update"},
    )


if __name__ == "__main__":
    uvicorn.run(
        app="main:app",
        host=settings.fastapi_config.fastapi_host,
        port=settings.fastapi_config.fastapi_port,
    )
