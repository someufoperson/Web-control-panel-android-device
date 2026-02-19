from fastapi import APIRouter, HTTPException, status
from database import DatabaseSessionDep
from redis_client import RedisDep
from models import DeviceStatus, ConnectionStatus, SessionStatus
from schemas import (
    DeviceSchema,
    DeviceCreateSchema,
    OnlyStatusSchema,
    StatusDeviceSchema,
)
from repository import DeviceRepository
from exceptions import DeviceAlreadyExists, InvalidStatusError


router = APIRouter(
    prefix="/v1/devices",
    tags=["Devices"],
)


@router.get(
    "/",
    summary="Get complete information about all device",
    status_code=status.HTTP_200_OK,
)
async def get_all_device(db: DatabaseSessionDep) -> list[DeviceSchema]:
    result = await DeviceRepository(db).get_all_devices()
    return [DeviceSchema.model_validate(x) for x in result]


@router.post(
    "/add", summary="Add new device in db", status_code=status.HTTP_201_CREATED
)
async def create_device(
    device_create: DeviceCreateSchema, db: DatabaseSessionDep
) -> DeviceSchema:
    try:
        new_device = await DeviceRepository(db).create_device(device_create)
        return new_device
    except DeviceAlreadyExists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Device already exists"
        )


@router.patch(
    "/edit-label/{serial_number}",
    summary="Edit label by serial number",
    status_code=status.HTTP_200_OK,
)
async def edit_label_by_serial_number(
    serial_number: str, label: str, db: DatabaseSessionDep
) -> DeviceCreateSchema:
    data = await DeviceRepository(db).update_device(
        serial_number=serial_number, label=label
    )
    return DeviceCreateSchema.model_validate(data)


@router.get(
    "/status-and-label/{serial_number}",
    summary="Get all statuses and label values for a device by serial number",
    status_code=status.HTTP_200_OK,
)
async def get_status_and_label_by_serial_number(
    serial_number: str, db: DatabaseSessionDep
) -> StatusDeviceSchema:
    data = await DeviceRepository(db).get_status_device_by_serial_number(
        serial_number=serial_number
    )
    return StatusDeviceSchema.model_validate(data)


@router.patch(
    "/edit-status/device/{serial_number}", summary="Updates the device's device status"
)
async def edit_device_status_by_serial_number(
    serial_number: str, status: DeviceStatus, db: DatabaseSessionDep
) -> DeviceSchema:
    data = await DeviceRepository(db).update_device(
        serial_number=serial_number, status_device=status
    )
    return DeviceSchema.model_validate(data)


@router.patch(
    "/edit-status/session/{serial_number}",
    summary="Updates the device's session status",
)
async def edit_session_status_by_serial_number(
    serial_number: str, status: SessionStatus, db: DatabaseSessionDep
) -> DeviceSchema:
    data = await DeviceRepository(db).update_device(
        serial_number=serial_number, session_status=status
    )
    return DeviceSchema.model_validate(data)


@router.patch(
    "/edit-status/connect/{serial_number}",
    summary="Updates the device's connection status",
)
async def edit_connection_status_by_serial_number(
    serial_number: str, status: ConnectionStatus, db: DatabaseSessionDep
) -> DeviceSchema:
    data = await DeviceRepository(db).update_device(
        serial_number=serial_number, connection_status=status
    )
    return DeviceSchema.model_validate(data)


@router.post("/edit-all", summary="Updates all device's session status")
async def edit_all_device_session_status(
    status: SessionStatus, db: DatabaseSessionDep
) -> dict:
    await DeviceRepository(db).update_device(session_status=status)
    return {"message": f"{status=}"}


@router.get("/online-devices", summary="Get all devices online")
async def get_all_devices_online(db: DatabaseSessionDep) -> list[str]:
    return await DeviceRepository(db).get_all_online_devices()


@router.get("/not-auth-devices", summary="Get all unregistered devices")
async def get_all_unregister_device(redis: RedisDep) -> set:
    result = await redis.smembers("devices")
    return result


@router.get(
    "/{serial_number}",
    summary="Get complete information about the device by the serial number",
    status_code=status.HTTP_200_OK,
)
async def get_device_by_serial_number(
    serial_number: str, db: DatabaseSessionDep
) -> DeviceSchema:
    result = await DeviceRepository(db).get_device_by_serial_number(
        serial_number=serial_number
    )
    return DeviceSchema.model_validate(result)
