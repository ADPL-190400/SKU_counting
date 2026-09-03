"""
Singleton quan ly nguon anh (RealSense hoac anh tinh) dung chung cho ca
API camera (start/stop/stream) va API inspection (lay frame hien tai).
Boc lai RealSenseFrameSource / ImageFrameSource cua common_pipeline.py
(khong sua logic).
"""

import threading

from backend.vision import _path_shim  # noqa: F401

from common_pipeline import ImageFrameSource, RealSenseFrameSource


class CameraUnavailableError(RuntimeError):
    pass


class CameraService:
    def __init__(self, cfg: dict):
        self._cfg = cfg
        self._source = None
        self._lock = threading.Lock()

    @property
    def is_running(self) -> bool:
        return self._source is not None

    def start(self):
        with self._lock:
            if self._source is not None:
                return
            if self._cfg["camera_source"] == "static":
                path = self._cfg.get("static_image_path") or ""
                if not path:
                    raise CameraUnavailableError(
                        "camera_source='static' nhung chua cau hinh static_image_path."
                    )
                try:
                    self._source = ImageFrameSource(path)
                except (SystemExit, Exception) as exc:
                    # ImageFrameSource.__init__ goi sys.exit(1) neu doc anh
                    # loi (quy uoc cua script CLI) - PHAI bat SystemExit o
                    # day, neu khong no se thoat luon ca tien trinh uvicorn
                    # (da tung xay ra: mot request /api/camera/start lam
                    # sap toan bo server thay vi chi tra loi request do).
                    raise CameraUnavailableError(f"Khong doc duoc anh tinh '{path}': {exc}") from exc
            else:
                try:
                    self._source = RealSenseFrameSource(
                        self._cfg["stream_width"], self._cfg["stream_height"], self._cfg["stream_fps"]
                    )
                except (SystemExit, Exception) as exc:
                    raise CameraUnavailableError(f"Khong ket noi duoc camera RealSense: {exc}") from exc

    def stop(self):
        with self._lock:
            if self._source is not None:
                self._source.close()
                self._source = None

    def get_frame(self):
        with self._lock:
            if self._source is None:
                raise CameraUnavailableError("Camera chua duoc khoi dong. Goi /api/camera/start truoc.")
            frame = self._source.get_frame()
        if frame is None:
            raise CameraUnavailableError("Khong doc duoc frame tu camera.")
        return frame
