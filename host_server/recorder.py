import subprocess
import os
import queue
import threading
from loguru import logger

# TODO: refactoring


class Recorder:
    def __init__(self, filename, serial):
        self.filename = filename
        self.serial = serial
        self.process = None
        self.queue = queue.Queue()
        self.running = False
        self.thread = None
        self.buffer = bytearray()
        self.header_sent = False
        self.packet_count = 0

    def start(self):
        os.makedirs(os.path.dirname(self.filename), exist_ok=True)
        cmd = [
            "ffmpeg",
            "-y",
            "-f",
            "h264",
            "-i",
            "pipe:0",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-tune",
            "zerolatency",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "25",
            "-vsync",
            "cfr",
            self.filename,
        ]
        try:
            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=False,
            )
        except FileNotFoundError:
            return
        self.running = True
        self.thread = threading.Thread(target=self._writer, daemon=True)
        self.thread.start()
        threading.Thread(target=self._read_stderr, daemon=True).start()

    def _read_stderr(self):
        if self.process:
            for line in self.process.stderr:
                ...

    def _writer(self):
        while self.running:
            try:
                data = self.queue.get(timeout=0.5)
                if data is None:
                    break
                self.process.stdin.write(data)
                self.process.stdin.flush()
                self.packet_count += 1
                if self.packet_count % 100 == 0:
                    ...
            except queue.Empty:
                continue
            except Exception as e:
                break

    def write(self, data):
        if not self.running:
            return
        if len(data) < 4:
            return

        if not self.header_sent:
            self.buffer.extend(data)
            start_code = b"\x00\x00\x00\x01"
            pos = 0
            while pos <= len(self.buffer) - 4:
                if self.buffer[pos : pos + 4] == start_code:
                    nal_type = self.buffer[pos + 4] & 0x1F
                    if nal_type == 7:
                        self.queue.put(bytes(self.buffer[pos:]))
                        self.header_sent = True
                        self.buffer = None
                        return
                    pos += 4
                else:
                    pos += 1
            if len(self.buffer) > 1024 * 1024:
                self.queue.put(bytes(self.buffer))
                self.header_sent = True
                self.buffer = None
            return
        else:
            self.queue.put(data)

    def stop(self):
        logger.info(f"Остановка записи для {self.serial}, видео сохранено")
        self.running = False
        if self.thread:
            self.thread.join(timeout=3)
        if self.process:
            try:
                self.process.stdin.close()
            except:
                pass
            self.process.wait(timeout=5)
