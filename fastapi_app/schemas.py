from pydantic import BaseModel, Field
from models import DeviceStatus, SessionStatus, ConnectionStatus

class Base(BaseModel):
    class Config:
        from_attributes = True


class DeviceCreateSchema(Base):
    serial_number: str = Field(..., max_length=128)
    label: str = Field(max_length=128)


class DeviceSchema(DeviceCreateSchema):
    status_device: DeviceStatus
    connection_status: ConnectionStatus
    session_status: SessionStatus


class StatusDeviceSchema(Base):
    status_device: DeviceStatus
    session_status: SessionStatus
    connection_status: ConnectionStatus
    label: str


class OnlyStatusSchema(DeviceCreateSchema):
    status_device: DeviceStatus
    connection_status: ConnectionStatus
    session_status: SessionStatus