from gevent import monkey

monkey.patch_all()
from flask import Flask, render_template, request, abort
from flask_socketio import SocketIO, emit, join_room, leave_room
from scrcpy import Scrcpy
import queue
import subprocess
import socket
import random
import requests
from loguru import logger
import os
from utils import send_message_to_telegram
from typing import Dict, Set

# TODO: refactoring

active_connections: Dict[str, dict] = {}  # serial -> {scrcpy, queue, task}
sid_to_device: Dict[str, str] = {}  # sid -> serial
room_clients: Dict[str, Set[str]] = {}  # serial -> set(sid)

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"
socketio = SocketIO(
    app,
    async_mode="gevent",
    cors_allowed_origins="*",
    binary=True,
)


def find_free_port() -> int:
    while True:
        port = random.randint(30000, 40000)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("localhost", port)) != 0:
                return port


def is_device_available(serial: str) -> bool:
    try:
        result = subprocess.run(
            ["adb", "devices"], capture_output=True, text=True, check=True
        )
        lines = result.stdout.splitlines()
        for line in lines[1:]:
            if line.strip() and serial in line and "device" in line:
                return True
        return False
    except Exception as e:
        logger.error(f"ADB devices check failed: {e}")
        return False


def video_send_task(serial: str):
    conn = active_connections.get(serial)
    if not conn:
        return
    q = conn["queue"]
    logger.info(f"Video send task started for {serial}")
    while serial in active_connections:
        try:
            data = q.get(timeout=0.001)
            socketio.emit("video_data", data, room=serial)
        except queue.Empty:
            continue
        except Exception as e:
            logger.error(f"Error sending video for {serial}: {e}")
    logger.info(f"Video send task stopped for {serial}")


@app.route("/favicon.ico")
def favicon():
    return "", 204, {"Content-Type": "image/x-icon"}


@app.route("/<serial_number>")
def device_page(serial_number):
    if serial_number in room_clients and room_clients[serial_number]:
        return render_template("403.html"), 403

    try:
        res = requests.get(
            f"http://localhost:8000/v1/devices/device/status/{serial_number}"
        )
        if res.status_code == 404:
            return render_template("404.html"), 404
        res.raise_for_status()
        device_data = res.json()
        if (
            device_data.get("session_status") == "ACTIVE"
            and device_data.get("status_device") == "ONLINE"
        ):
            return render_template(
                "index.html", title=device_data.get("label", serial_number)
            )
        else:
            return {"status": "Device not available or offline"}
    except Exception as e:
        logger.error(f"Failed to fetch device status for {serial_number}: {e}")
        abort(500, description="Backend service unavailable")


@socketio.on("connect")
def handle_connect(auth=None):
    serial = request.args.get("device")
    if not serial:
        logger.warning("Connect without device parameter")
        return False

    if not is_device_available(serial):
        logger.warning(f"Device {serial} not available via ADB")
        return False

    if serial in room_clients and room_clients[serial]:
        logger.warning(
            f"Device {serial} already has active client(s). Rejecting new connection."
        )
        return False

    sid = request.sid
    sid_to_device[sid] = serial
    room_clients.setdefault(serial, set()).add(sid)

    if serial in active_connections:
        join_room(serial, sid=sid)
        return

    local_port = find_free_port()

    sc = Scrcpy(serial_number=serial, local_port=local_port)

    q = queue.Queue()

    def video_callback(data):
        q.put(data)

    requests.patch(
        f"http://localhost:8000/v1/devices/update-status/connect/{serial}/disconnect"
    )
    sc.scrcpy_start(video_callback, 1024000)
    label = requests.get(f"http://localhost:8000/v1/devices/device/{serial}")
    label = label.json()
    text_log = f"🟢Сессия с девайсом {label['label']} началась 🟢"
    logger.bind(connection=True).info(text_log)
    try:
        send_message_to_telegram(text_log)
    except:
        pass

    active_connections[serial] = {
        "scrcpy": sc,
        "queue": q,
        "task": socketio.start_background_task(video_send_task, serial),
    }

    join_room(serial, sid=sid)


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    serial = sid_to_device.pop(sid, None)
    if not serial:
        return

    leave_room(serial, sid=sid)
    clients = room_clients.get(serial, set())
    clients.discard(sid)
    requests.patch(
        f"http://localhost:8000/v1/devices/update-status/connect/{serial}/disconnect"
    )
    label = requests.get(f"http://localhost:8000/v1/devices/device/{serial}")
    label = label.json()
    text_log = f"🔴Сессия с девайсом {label['label']} закончилась 🔴"
    logger.bind(connection=True).info(text_log)
    try:
        send_message_to_telegram(text_log)
    except:
        pass

    if not clients:
        conn = active_connections.pop(serial, None)
        if conn:
            logger.info(f"Stopping scrcpy for {serial} (no clients)")
            conn["scrcpy"].scrcpy_stop()
        room_clients.pop(serial, None)
    else:
        logger.debug(f"Client {sid} left, still {len(clients)} clients for {serial}")


@socketio.on("control_data")
def handle_control_data(data):
    sid = request.sid
    serial = sid_to_device.get(sid)
    if not serial:
        return
    conn = active_connections.get(serial)
    if conn:
        conn["scrcpy"].scrcpy_send_control(data)


@socketio.on("inactivity_timeout")
def handle_inactivity_timeout():
    handle_disconnect()


if __name__ == "__main__":
    subprocess.Popen(
        [
            rf"{os.getcwd()}\venv\Scripts\python.exe",
            rf"{os.getcwd()}\host_server\device_support.py",
        ]
    )
    logger.info(f"Starting server on port 5000")
    socketio.run(app, host="0.0.0.0", port=5000)
