class AppError(Exception):
    pass


class DeviceNotFoundError(AppError):
    def __init__(self, serial_number: str):
        self.serial_number = serial_number
        super().__init__(f"Device with serial number {serial_number} not found")


class DeviceAlreadyExists(AppError):
    def __init__(self, serial_number: str):
        super().__init__(f"Device with serial number {serial_number} already exists")


class DatabaseError(AppError):
    pass


class InvalidStatusError(AppError):
    pass