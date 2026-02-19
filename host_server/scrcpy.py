import os
from threading import Thread
import subprocess
import socket
import time
from loguru import logger
import datetime
from recorder import Recorder

# TODO: refactoring


class Scrcpy:
    def __init__(self, serial_number: str, local_port: int):
        self.video_socket = None
        self.audio_socket = None
        self.control_socket = None

        self.android_thread = None
        self.video_thread = None
        self.audio_thread = None
        self.control_thread = None
        self.android_process = None

        self.serial_number = serial_number
        self.local_port = local_port
        self.adb_path = "adb"
        self.server_path = rf"{os.getcwd()}\host_server\scrcpy-server"
        self.stop = False

    def push_server_to_device(self):
        device_server_path = "/data/local/tmp/scrcpy-server.jar"
        result = subprocess.run(
            [
                self.adb_path,
                "-s",
                self.serial_number,
                "push",
                self.server_path,
                device_server_path,
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            logger.error(f"Error pushing server: {result.stderr}")
            return False
        return True

    def setup_adb_forward(self):
        subprocess.run(
            [
                self.adb_path,
                "-s",
                self.serial_number,
                "forward",
                f"tcp:{self.local_port}",
                "localabstract:scrcpy",
            ],
            check=True,
        )

    def remove_adb_forward(self):
        subprocess.run(
            [
                self.adb_path,
                "-s",
                self.serial_number,
                "forward",
                "--remove",
                f"tcp:{self.local_port}",
            ],
            capture_output=True,
        )

    def start_server(self):
        device_server_path = "/data/local/tmp/scrcpy-server.jar"
        cmd = [
            self.adb_path,
            "-s",
            self.serial_number,
            "shell",
            f"CLASSPATH={device_server_path} app_process / com.genymobile.scrcpy.Server 3.1 "
            f"tunnel_forward=true log_level=VERBOSE video_bit_rate={self.video_bit_rate}",
        ]
        self.android_process = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        while not self.stop:
            stderr_line = self.android_process.stderr.readline().decode().strip()
            if not stderr_line:
                break
            if stderr_line:
                logger.error(f"Server error: {stderr_line}")
        self.android_process.wait()

    def receive_video_data(self):
        logger.info("Receiving video data (H.264)...")
        self.video_socket.settimeout(1.0)
        try:
            self.video_socket.recv(1)
        except socket.timeout:
            pass
        while not self.stop:
            try:
                data = self.video_socket.recv(262144)
                if not data:
                    break
                if self.recorder:
                    self.recorder.write(data)
                self.video_callback(data)
            except socket.timeout:
                continue
            except Exception as e:
                if self.stop:
                    break
                logger.error(f"Video socket error: {e}")
                break
        logger.warning("Video data reception stopped")

    def receive_audio_data(self):
        self.audio_socket.settimeout(1.0)
        try:
            self.audio_socket.recv(1)
        except socket.timeout:
            pass
        except Exception:
            pass
        while not self.stop:
            try:
                data = self.audio_socket.recv(1024)
                if not data:
                    break
                if self.recorder:
                    self.recorder.write(data)
            except socket.timeout:
                continue
            except (socket.error, ConnectionError) as e:
                if self.stop:
                    break
                break

    def handle_control_conn(self):
        if not self.control_socket:
            return
        self.control_socket.settimeout(1.0)
        try:
            self.control_socket.recv(1)
        except socket.timeout:
            pass
        except Exception:
            pass
        while not self.stop:
            try:
                data = self.control_socket.recv(1024)
                if not data:
                    break
            except socket.timeout:
                continue
            except (socket.error, ConnectionError) as e:
                if self.stop:
                    break
                break

    def scrcpy_start(self, video_callback, video_bit_rate, record=True):
        self.video_bit_rate = video_bit_rate
        self.video_callback = video_callback
        self.stop = False
        self.recorder = None

        if not self.push_server_to_device():
            return

        self.setup_adb_forward()
        self.android_thread = Thread(target=self.start_server, daemon=True)
        self.android_thread.start()
        time.sleep(2)

        # video connection
        self.video_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.video_socket.connect(("localhost", self.local_port))

        # audio connection
        self.audio_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.audio_socket.connect(("localhost", self.local_port))

        # control connection
        self.control_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.control_socket.connect(("localhost", self.local_port))

        if record:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"logs/recordings/{self.serial_number}_{timestamp}.mp4"
            self.recorder = Recorder(filename, self.serial_number)
            self.recorder.start()

        self.video_thread = Thread(target=self.receive_video_data, daemon=True)
        self.audio_thread = Thread(target=self.receive_audio_data, daemon=True)
        self.control_thread = Thread(target=self.handle_control_conn, daemon=True)
        self.video_thread.start()
        self.audio_thread.start()
        self.control_thread.start()

    def scrcpy_stop(self):
        self.stop = True
        if self.video_socket:
            self.video_socket.shutdown(socket.SHUT_RDWR)
            self.video_socket.close()
        if self.audio_socket:
            self.audio_socket.close()
        if self.control_socket:
            self.control_socket.shutdown(socket.SHUT_RDWR)
            self.control_socket.close()
        if self.recorder:
            self.recorder.stop()

        if self.video_thread:
            self.video_thread.join()
        if self.audio_thread:
            self.audio_thread.join()
        if self.control_thread:
            self.control_thread.join()

        if self.android_process:
            self.android_process.terminate()
        if self.android_thread:
            self.android_thread.join()

        self.remove_adb_forward()

    def scrcpy_send_control(self, data):
        if isinstance(data, str):
            data = data.encode("utf-8")
        self.control_socket.send(data)
