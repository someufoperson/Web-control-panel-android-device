import time
import redis
import requests
import subprocess
from enum import Enum

LINK = "http://localhost:8000"

class RequestsType(Enum):
    GET = "GET"
    PATCH = "PATCH"


class RedisActionType(Enum):
    SREM = "SREM"
    SADD = "SADD"


def send_requests(path: str, type_requests: RequestsType) -> dict | None:
    while True:
        try:
            if type_requests == RequestsType.GET:
                res = requests.get(f"{LINK}{path}")
                return res.json()
            elif type_requests == RequestsType.PATCH:
                requests.patch(f"{LINK}{path}")
                return None
        except requests.exceptions.ConnectionError:
            print(f"{LINK}{path} недоступен! Скорее всего, docker-compose не запущен")
            time.sleep(1)


def redis_action(action_type: RedisActionType, data: str | list):
    redis_engine = redis.Redis(host="localhost", port=6379)
    try:
        if action_type == RedisActionType.SREM:
            redis_engine.srem("devices", data)
        elif action_type == RedisActionType.SADD:
            redis_engine.sadd("devices", *data)
    except ConnectionError:
        print("Redis недоступен")

def main():
    while True:
        result = subprocess.run(["adb", "devices"], capture_output=True, text=True)
        result = result.stdout.split("\n")[1:]
        list_device = [x.split("\t")[0] for x in result if x != "" or x == "List of device attached"]
        res = send_requests("/v1/devices/all-devices-online", RequestsType.GET)
        for device in res:
            if device in list_device:
                send_requests(f"/v1/devices/update-status/online/{device}/online", RequestsType.PATCH)
                list_device.remove(device)
                redis_action(RedisActionType.SREM, device)
            elif device not in list_device:
                send_requests(f"/v1/devices/update-status/online/{device}/offline", RequestsType.PATCH)
        if list_device:
            redis_action(RedisActionType.SADD, list_device)
        time.sleep(1)

if "__main__" == __name__:
    main()