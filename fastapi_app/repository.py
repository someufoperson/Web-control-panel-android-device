from schemas import DeviceCreateSchema, DeviceSchema
from models import Device, DeviceStatus
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, update
from exceptions import DeviceNotFoundError, DeviceAlreadyExists, DatabaseError


class DeviceRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def already_exists(self, serial_number: str):
        stmt = select(Device.serial_number).where(Device.serial_number == serial_number)
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            return True
        else:
            return False


    async def create_device(self, device: DeviceCreateSchema) -> DeviceSchema:
        exists = await self.already_exists(device.serial_number)
        if exists:
            raise DeviceAlreadyExists(device.serial_number)
        new_device = Device(**device.model_dump())
        self.db.add(new_device)
        await self.db.commit()
        return new_device
        

    async def get_all_devices(self) -> list[DeviceSchema]:
        stmt = select(Device)
        result = await self.db.execute(stmt)
        return result.scalars().all()


    async def get_all_online_devices(self):
        stmt = select(Device.serial_number).where(Device.status_device == DeviceStatus.ONLINE)
        result = await self.db.execute(stmt)
        return result.scalars().all()


    async def get_device_by_serial_number(self, serial_number: str) -> DeviceSchema:
        stmt = select(Device).where(Device.serial_number == serial_number)
        result = await self.db.execute(stmt)
        data = result.scalar_one_or_none()
        if not data:
            raise DeviceNotFoundError(serial_number)
        return data


    async def update_device(self,
                            serial_number: str | None = None,
                            **update_fields) -> DeviceSchema | list[DeviceSchema]:
        stmt = update(Device)
        if serial_number:
            exists = await self.already_exists(serial_number)
            if not exists:
                raise DeviceNotFoundError(serial_number)
            stmt = stmt.where(Device.serial_number == serial_number)
        stmt = stmt.values(**update_fields).returning(Device)
        result = await self.db.execute(stmt)
        try:
            await self.db.commit()
            if serial_number:
                return result.scalar_one_or_none()
            else:
                row = result.scalars().all()
                return [DeviceSchema.model_validate(x) for x in row]
        except Exception as e:
            raise DatabaseError(e)


    async def get_status_device_by_serial_number(self, serial_number: str):
        stmt = (select(Device.status_device, 
                      Device.session_status, 
                      Device.connection_status, 
                      Device.label)
                .where(Device.serial_number == serial_number))
        result = await self.db.execute(stmt)
        row = result.mappings().one_or_none()
        if not row:
            raise DeviceNotFoundError(serial_number)
        return row