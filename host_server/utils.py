import requests
from config import settings


def send_message_to_telegram(text: str):
    data = {
        "chat": settings.ADMIN_ID,
        "text": text
    }
    requests.post(f"https://api.telegram.org/bot{settings.TOKEN}/sendMessage", data=data)