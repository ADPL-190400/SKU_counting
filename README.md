# SKU Counting — Web-based SKU Verification System

Hệ thống đếm & xác minh SKU hàng tạp hóa từ camera, dùng cho kiểm tra đơn hàng
(order) theo thời gian thực: quét mã đơn → camera chụp → AI tách vật + nhận diện
→ so sánh với số lượng yêu cầu → kết luận COMPLETE / INCOMPLETE / REVIEW REQUIRED.

Pipeline thị giác máy tính (giữ nguyên từ prototype gốc, không sửa logic):

```
Camera / Image → SAM2 segmentation → Object crop → DINOv3 embedding
              → Few-shot similarity matching → SKU classification → Counting
```

## Kiến trúc

```
Browser (React)  →  FastAPI backend  →  Vision pipeline (SAM2 → DINOv3 → matching)
                          │
                          ├── camera (RealSense hoặc ảnh tĩnh)
                          ├── dataset/<sku>/*.png   (ảnh mẫu tham chiếu, few-shot)
                          ├── backend/data/*.json   (orders, config, history)
                          └── backend/results/*.png (ảnh overlay kết quả)
```

- **Backend**: FastAPI (Python), load SAM2 + DINOv3 một lần lúc khởi động, giữ
  trong `app.state` để mọi request dùng chung — không load lại mỗi lần kiểm tra.
- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4, theme dark
  "control-room" (lấy cảm hứng từ project anh em `PROCESS_INSPECTION`).
- **Vision core**: `common_pipeline.py` (SAM2 + camera) và `common_dino.py`
  (DINOv3 + so khớp nhãn) — 2 file gốc của prototype, **không bị sửa**; backend
  chỉ bọc lại qua interface `Segmenter`/`FeatureMatcher` (`backend/vision/`) để
  sau này có thể đổi sang model khác (U2Net, YOLO-Seg, DINOv2, CLIP...) mà
  không phải sửa phần còn lại.

## Cấu trúc thư mục

```
sku_counting/
├── common_pipeline.py       # SAM2 + camera (RealSense/ảnh tĩnh) - CLI gốc, dùng chung
├── common_dino.py           # DINOv3 + so khớp nhãn - CLI gốc, dùng chung
├── enroll_samples.py        # CLI: chụp + gán nhãn mẫu (vẫn dùng được song song với Web UI)
├── live_classify.py         # CLI: pipeline phân loại trực tiếp (desktop, OpenCV window)
├── sam2_mask_view.py        # CLI: xem/đánh giá chất lượng mask SAM2
├── dataset/<sku>/*.png      # Ảnh mẫu tham chiếu cho từng SKU (few-shot)
│
├── backend/
│   ├── main.py               # FastAPI app, load model lúc startup, đăng ký router
│   ├── config.py             # Đọc/ghi backend/data/config.json (không hard-code tham số)
│   ├── api/                  # orders, camera, inspection, history, settings, sku, auth
│   ├── vision/                # Segmenter/FeatureMatcher (bọc common_pipeline/common_dino)
│   ├── services/              # camera_service, verification_service, history_service, auth
│   ├── models/schemas.py      # Pydantic schema (tài liệu hoá, phần lớn route trả dict thường)
│   ├── data/                  # config.json, orders.json, history.json (runtime)
│   └── results/                # Ảnh overlay kết quả mỗi lần inspection
│
└── frontend/
    ├── src/pages/              # Inspection, SkuManagement, History, Login
    ├── src/components/         # ScanInput, ProductTable, CameraView, DetectionOverlay,
    │                            # ResultStatus, RecentInspections, KpiStrip, SettingsPanel
    └── src/api/client.ts        # fetch wrapper gọi backend
```

## Cài đặt

### Backend

```bash
pip install -r backend/requirements.txt

# SAM2 không có trên PyPI, cài từ source - LƯU Ý: clone RA NGOÀI thư mục dự
# án (KHÔNG clone vào trong thư mục dự án này), vì repo cũng tên là "sam2"
# sẽ "che" mất package sam2 thật khi chạy uvicorn từ thư mục chứa nó (SAM2
# tự phát hiện và chặn tình huống này, báo lỗi "shadowed by the repository
# name"). Clone thẳng ra thư mục cha (../sam2) - không cần `cd` qua lại nên
# không phụ thuộc tên thư mục dự án của bạn là gì:
git clone https://github.com/facebookresearch/sam2.git ../sam2
pip install -e ../sam2

# DINOv3 là model bị "gate" trên Hugging Face - cần đăng nhập:
#   1. Vào trang model (vd facebook/dinov3-vitb16-pretrain-lvd1689m) trên
#      huggingface.co, bấm "Agree and access repository"
#   2. Đăng nhập trên MÁY sẽ chạy code (chỉ cần 1 lần/máy) - dùng lệnh `hf`
#      (CLI cũ `huggingface-cli` đã bị deprecated, không còn hoạt động):
#        Windows: venv\Scripts\hf.exe auth login
#        Linux:   venv/bin/hf auth login
```

Yêu cầu: Python 3.11+, khuyến nghị có GPU (CUDA) — chạy được trên CPU nhưng
chậm hơn nhiều.

### Chạy offline (không cần Internet mỗi lần mở)

Lần đầu chạy, backend tự tải checkpoint SAM2 + DINOv3 (cần đăng nhập +
Internet như trên) rồi cache lại cục bộ (`~/.cache/huggingface/hub`). Các lần
sau, dù dùng cache, backend vẫn gửi 1 request kiểm tra nhanh lên Hugging Face
mỗi lúc khởi động (thấy dòng `HTTP Request: HEAD https://huggingface.co/...`
trong log) — vẫn cần mạng cho request nhỏ này, dù không tải lại model.

Muốn chạy hẳn offline sau khi đã có cache (**bắt buộc phải chạy thành công ít
nhất 1 lần có mạng trước**), set biến môi trường `HF_HUB_OFFLINE=1` cố định
trên máy đó:

```bash
# Windows (mở terminal mới sau khi chạy lệnh này để có hiệu lực):
setx HF_HUB_OFFLINE 1

# Linux (bash):
echo 'export HF_HUB_OFFLINE=1' >> ~/.bashrc && source ~/.bashrc
```

### Frontend

Yêu cầu **Node.js ≥ 20.12** (Vite 8 dùng `rolldown`, cần API mới của
`node:util` mà Node 18 chưa có — sẽ báo lỗi `SyntaxError: ... does not
provide an export named 'styleText'` nếu Node quá cũ). Kiểm tra bằng
`node -v`; nếu cũ hơn, cài qua [nvm](https://github.com/nvm-sh/nvm) rồi
`nvm install --lts && nvm use --lts` thay vì đụng vào Node hệ thống.

```bash
cd frontend
npm install
```

## Chạy dự án (dev)

**1. Backend** (chạy từ thư mục `sku_counting/`):

```bash
uvicorn backend.main:app --port 8000
```

> **Không dùng `--reload`**: khi sửa code, worker cũ chưa giải phóng xong CUDA
> context (SAM2/DINOv3 trên GPU) trong lúc worker mới load lại model, dễ bị
> treo hoặc crash. Sửa code xong thì `Ctrl+C` rồi chạy lại lệnh trên.

Lần đầu chạy sẽ tự tải checkpoint SAM2 + DINOv3 (cần Internet), các lần sau
dùng cache cục bộ. Server sẵn sàng khi log hiện `READY`.

**2. Frontend** (terminal khác, từ thư mục `frontend/`):

```bash
npm run dev
```

Mở `http://localhost:5173` — Vite dev server proxy `/api`, `/results`,
`/dataset` sang backend ở `http://127.0.0.1:8000`.

## Camera: ảnh tĩnh vs RealSense

Mặc định `camera_source` trong `backend/data/config.json` là `"static"` — dùng
1 ảnh tĩnh (`static_image_path`) thay cho camera thật, tiện để dev/test khi
không có camera RealSense cắm sẵn. Để dùng camera thật:

```json
{ "camera_source": "realsense" }
```

rồi khởi động lại backend. Cần cài `pyrealsense2` và camera Intel RealSense
đã cắm.

## Detection backend: SAM2+DINOv3 vs YOLO

Mặc định `detection_backend` trong `backend/data/config.json` là
`"sam2_dino"` — pipeline gốc (segment class-agnostic rồi so khớp few-shot,
không cần train khi thêm SKU mới). Có thể chuyển sang dùng model YOLO
(ultralytics, đã train sẵn, 1 class = 1 tên SKU) thay cho bước detect này:

```json
{
  "detection_backend": "yolo",
  "yolo_model_path": "đường/dẫn/tới/model.pt",
  "yolo_conf_threshold": 0.5
}
```

rồi khởi động lại backend (đổi backend cần load lại model, giống
`camera_source`). `yolo_conf_threshold` sau đó chỉnh được trực tiếp qua
Settings panel (⚙ ở header) không cần restart.

Lưu ý:
- SAM2 + DINOv3 **luôn được nạp** bất kể `detection_backend` là gì, vì trang
  SKU Management vẫn cần SAM2 để chụp + tách vật lúc thêm mẫu mới — đổi sang
  YOLO chỉ đổi bước detect lúc **kiểm tra (inspection)**, không đụng tới
  trang SKU Management.
- YOLO là closed-set (đã train sẵn theo class) — thêm SKU mới cần train lại
  model YOLO (annotate bounding box + train), khác với SAM2+DINOv3 (chỉ cần
  thêm vài ảnh mẫu là dùng được ngay, không cần train).
- Model YOLO không có class "vật lạ" riêng thì chế độ này **không phát hiện
  được vật hoàn toàn lạ** (SAM2+DINOv3 làm được vì SAM2 tách được mọi vật
  thể, DINOv3 mới quyết định vật nào không khớp SKU nào). Bù lại, SKU nào
  YOLO nhận diện được nhưng KHÔNG có trong đơn hàng đang quét vẫn tự động
  hiện là **EXCESS** (sản phẩm dư/sai) — không cần cấu hình gì thêm.

## Các trang chính

| Trang | Chức năng |
|---|---|
| **Inspection** | Quét mã đơn → xem yêu cầu → Start Camera → Run Inspection → bảng so sánh Required/Detected/Status (gộp 1 bảng, chỉ hiện SKU có trong đơn) + ảnh overlay + banner COMPLETE/INCOMPLETE/REVIEW REQUIRED + callout Missing/Excess/Unknown |
| **SKU Management** | Thay thế `enroll_samples.py` bằng web: xem danh sách SKU + số mẫu, chụp camera → SAM2 tách vật → gán nhãn từng crop → lưu vào `dataset/<sku>/`, xoá mẫu/SKU |
| **History** | Lịch sử toàn bộ lần kiểm tra, lọc theo mã đơn/kết quả, xem chi tiết từng lần (ảnh + bảng required/detected) |
| **Settings** (icon ⚙ ở header) | Chỉnh `similarity_threshold`, `unknown_policy`, và các tham số SAM2 (min area, max area ratio...) — áp dụng ngay cho lần kiểm tra tiếp theo, không cần restart |

Dashboard (KPI tổng quan riêng) chưa làm — hiện có bản rút gọn (KPI strip) ngay
trên trang Inspection.

## Dữ liệu cấu hình (`backend/data/`)

- **`orders.json`**: danh sách đơn hàng và SKU yêu cầu — sửa/thêm đơn tại đây
  (không hard-code trong frontend).
- **`config.json`**: toàn bộ tham số vision + camera, đọc lúc backend khởi
  động, ghi lại khi đổi qua Settings panel.
- **`history.json`**: lịch sử inspection, ghi đè theo `order_code` (mỗi mã chỉ
  giữ bản ghi mới nhất).
- **`users.json`, `session_secret.key`**: không dùng nữa (xem phần Đăng nhập).

## Đăng nhập

Cơ chế xác thực dựa theo project anh em `PROCESS_INSPECTION`: gọi API xác
thực chung của công ty (`aiot-api.m2m-sol.co.jp`, xem
`backend/services/web_api.py`) thay vì tự lưu tài khoản/mật khẩu cục bộ.

**Hiện đang tạm tắt** (`AUTH_ENABLED = False` ở cả
`backend/main.py` và `frontend/src/App.tsx`) vì API xác thực trên đang trả
`502 Bad Gateway`. Có badge cảnh báo màu vàng ở header nhắc trạng thái này.
Khi công ty báo server đã hoạt động lại: đổi `AUTH_ENABLED = True` ở cả 2 file
rồi khởi động lại backend.

## API (tóm tắt)

```
GET  /api/orders/{code}              Lấy chi tiết đơn hàng
POST /api/camera/start|stop          Bật/tắt camera
GET  /api/camera/status              Trạng thái camera
GET  /api/camera/stream              MJPEG stream
POST /api/inspection                 Chạy 1 lần kiểm tra đầy đủ (segment→match→verify→lưu)
GET  /api/history                    Lịch sử inspection
GET  /api/settings   POST /api/settings     Xem / chỉnh tham số vision live
GET  /api/skus                       Danh sách SKU + số mẫu
POST /api/sku/capture                Chụp + tách vật (SAM2), trả crop preview (base64)
POST /api/sku/samples                Lưu 1 crop đã gán nhãn vào dataset/
DELETE /api/sku/{label}/samples/{filename}   Xoá 1 mẫu
DELETE /api/sku/{label}              Xoá cả SKU
POST /api/login   POST /api/logout   GET /api/whoami    Đăng nhập (xem phần Đăng nhập)
```

## CLI gốc (vẫn dùng được)

3 script CLI ban đầu không bị sửa, chạy độc lập song song với Web UI, dùng
chung `dataset/`:

```bash
python sam2_mask_view.py [đường/dẫn/ảnh.jpg]   # xem chất lượng mask SAM2
python enroll_samples.py [đường/dẫn/ảnh.jpg]   # chụp + gán nhãn mẫu (terminal)
python live_classify.py [đường/dẫn/ảnh.jpg]    # phân loại trực tiếp (cửa sổ OpenCV)
```

Không truyền tham số → mặc định dùng camera RealSense.
