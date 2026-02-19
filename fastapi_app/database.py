from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import update
from config import settings


engine = create_async_engine(url=settings.sqlite_config.db_url)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    def __repr__(self):
        cols = []
        for col in self.__table__.columns.keys():
            cols.append(f"{col}={getattr(self, col)}")
        return f"<{self.__class__.__name__}({', '.join(cols)})>"


async def preparing_table_after_restart() -> None:
    async with async_session() as session:
        from models import Device, SessionStatus, ConnectionStatus
        stmt = update(Device).values({"session_status": SessionStatus.INACTIVE, 
                                      "connection_status": ConnectionStatus.DISCONNECTED})
        await session.execute(stmt)
        await session.commit()


async def create_meta() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_async_session():
    async with async_session() as session:
        yield session

DatabaseSessionDep = Annotated[AsyncSession, Depends(get_async_session)]