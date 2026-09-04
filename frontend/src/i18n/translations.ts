export type Lang = "vi" | "ja";

export const LOCALE_OF: Record<Lang, string> = { vi: "vi-VN", ja: "ja-JP" };

// Dictionary phang (khong long nhau) - key dat theo dang "vung.ten", gia tri
// la chuoi don, {param} duoc thay the qua t(key, params) (xem LanguageContext.tsx).
// VI/JA deu khong chia so it/nhieu theo ngu phap (khac tieng Anh), nen khong
// can co che plural rieng - chi can 1 chuoi tu nhien co {count} la du.
export const translations: Record<Lang, Record<string, string>> = {
  vi: {
    // nav
    "nav.inspection": "Kiểm tra",
    "nav.sku": "Quản lý SKU",
    "nav.history": "Lịch sử",

    // header
    "header.brand": "SKU INSPECTION",
    "header.title": "SKU INSPECTION SYSTEM",
    "header.auth_disabled": "Đăng nhập tạm tắt (chờ API công ty)",
    "header.backend_online": "BACKEND HOẠT ĐỘNG",
    "header.vision_settings": "Cài đặt xử lý ảnh",
    "header.logout": "Đăng xuất",

    // login
    "login.connect_error": "Không kết nối được máy chủ.",
    "login.subtitle": "Đăng nhập để tiếp tục",
    "login.email_label": "Tài khoản (email)",
    "login.email_placeholder": "ten@congty.com",
    "login.password_label": "Mật khẩu",
    "login.submit_loading": "Đang đăng nhập...",
    "login.submit": "Đăng nhập",

    // history
    "history.load_error": "Không tải được lịch sử.",
    "history.filter_all": "Tất cả",
    "history.filter_complete": "Đạt",
    "history.filter_incomplete": "Chưa đạt",
    "history.heading": "LỊCH SỬ KIỂM TRA",
    "history.search_placeholder": "Tìm theo mã đơn...",
    "history.col_code": "Mã",
    "history.col_date": "Ngày",
    "history.col_result": "Kết quả",
    "history.col_products": "Sản phẩm",
    "history.col_unknown": "Không rõ",
    "history.col_operator": "Người thực hiện",
    "history.col_action": "Thao tác",
    "history.view": "Xem",
    "history.empty": "Không có bản ghi nào khớp bộ lọc.",
    "history.detail_heading": "CHI TIẾT — ",
    "history.detail_col_required": "Yêu cầu",
    "history.detail_col_detected": "Phát hiện",
    "history.threshold_label": "Ngưỡng: ",
    "history.processing_time_label": "Thời gian xử lý: ",
    "history.operator_label": "Người thực hiện: ",

    // inspection
    "inspection.camera_required": "Kết nối camera trước khi quét.",
    "inspection.order_load_error": "Không tải được đơn hàng.",
    "inspection.run_error": "Kiểm tra thất bại.",
    "inspection.camera_offline_error": "Camera ngoại tuyến.",
    "inspection.timing": "Tổng: {total}ms · SAM2: {sam2}ms · DINOv3: {dinov3}ms · Khớp: {matching}ms",

    // sku management
    "sku.load_error": "Không tải được danh sách SKU.",
    "sku.roi_save_error": "Không lưu được ROI.",
    "sku.roi_clear_error": "Không xoá được ROI.",
    "sku.samples_load_error": "Không tải được mẫu.",
    "sku.capture_failed": "Chụp thất bại.",
    "sku.name_required": "Nhập tên SKU trước khi thêm mẫu.",
    "sku.save_failed": "Lưu thất bại.",
    "sku.skipped_files": "Bỏ qua {count} file không đọc được: {files}",
    "sku.segment_failed": "Tách vật thất bại.",
    "sku.add_samples_heading": "THÊM MẪU",
    "sku.name_label": "Tên SKU",
    "sku.tab_camera": "Camera",
    "sku.tab_upload": "Tải ảnh lên",
    "sku.segmenting": "Đang tách vật...",
    "sku.capture_segment": "Chụp & Tách vật",
    "sku.select_roi": "Chọn ROI",
    "sku.full_frame": "Toàn khung hình",
    "sku.upload_segment_btn": "Tách vật ({count} ảnh)",
    "sku.dropzone_hint": "Kéo thả ảnh vào đây hoặc bấm để chọn",
    "sku.dropzone_subhint": "Ảnh toàn cảnh (chưa crop), có thể chọn nhiều ảnh",
    "sku.add_more_images": "+ Thêm ảnh",
    "sku.crops_detected": "Phát hiện {count} vật thể — thêm vào \"{label}\" hoặc bỏ qua:",
    "sku.add": "Thêm",
    "sku.skip": "Bỏ qua",
    "sku.registered_heading": "SKU ĐÃ ĐĂNG KÝ",
    "sku.empty": "Chưa có SKU nào. Thêm mẫu ở trên để bắt đầu.",
    "sku.hide_samples": "Ẩn mẫu",
    "sku.view_samples": "Xem mẫu",
    "sku.delete_sku": "Xóa SKU",
    "sku.delete_sample": "Xóa",

    // shared across CameraView + SkuManagement
    "common.connect_camera": "Kết nối Camera",
    "common.disconnect_camera": "Ngắt kết nối Camera",
    "common.camera_offline": "Camera ngoại tuyến",
    "common.sample_count": "{count} mẫu",

    // camera view (Inspection page)
    "camera.no_order": "CHƯA QUÉT ĐƠN HÀNG",
    "camera.connected": "ĐÃ KẾT NỐI",
    "camera.disconnected": "CHƯA KẾT NỐI",
    "camera.captured": "ĐÃ CHỤP",
    "camera.capture": "Chụp",
    "camera.connect_first": "Kết nối camera trước",
    "camera.scan_first": "Quét mã đơn hàng trước",
    "camera.running": "Đang chạy...",
    "camera.run_inspection": "CHẠY KIỂM TRA",
    "camera.reset": "Đặt lại",

    // settings panel
    "settings.heading": "CÀI ĐẶT XỬ LÝ ẢNH",
    "settings.loading": "Đang tải...",
    "settings.load_error": "Không tải được cài đặt.",
    "settings.save_error": "Không lưu được cài đặt.",
    "settings.saving": "Đang lưu...",
    "settings.save": "Lưu",
    "settings.saved": "Đã lưu — áp dụng cho lần kiểm tra tiếp theo.",
    "settings.similarity_threshold_label": "Ngưỡng độ tương đồng",
    "settings.similarity_threshold_hint": "Dưới điểm số này, vật thể được phân loại là không rõ.",
    "settings.min_area_label": "Diện tích mask tối thiểu (px)",
    "settings.min_area_hint": "Mask nhỏ hơn giá trị này sẽ bị loại bỏ như nhiễu.",
    "settings.max_area_ratio_label": "Tỷ lệ diện tích tối đa",
    "settings.max_area_ratio_hint": "Mask lớn hơn tỷ lệ này so với ROI sẽ được coi là nền.",
    "settings.mask_containment_label": "Ngưỡng chứa mask",
    "settings.mask_containment_hint": "Mức độ chồng lấn tối thiểu để 1 mask nhỏ được gộp vào mask lớn hơn.",
    "settings.bbox_padding_label": "Tỷ lệ đệm khung bao",
    "settings.bbox_padding_hint": "Phần ngữ cảnh thêm giữ lại quanh mỗi vật thể trước khi trích xuất đặc trưng.",
    "settings.min_unknown_score_label": "Điểm tối thiểu cho vật lạ",
    "settings.min_unknown_score_hint": "Vật thể không rõ có điểm dưới ngưỡng này sẽ bị loại bỏ như nhiễu tách (không vẽ, không đếm).",
    "settings.yolo_conf_threshold_label": "Ngưỡng tin cậy YOLO",
    "settings.yolo_conf_threshold_hint": "Chỉ áp dụng khi detection_backend = \"yolo\" — vật thể có độ tin cậy dưới ngưỡng này sẽ bị bỏ qua.",
    "settings.detection_backend_label": "Backend nhận diện",
    "settings.detection_backend_sam2_dino": "SAM2+DINOv3",
    "settings.detection_backend_yolo": "YOLO",
    "settings.yolo_unavailable_hint": "Chưa cấu hình yolo_model_path trong config.json — không thể chuyển sang YOLO.",

    // scan input
    "scan.label": "Quét mã đơn hàng / sản phẩm",
    "scan.placeholder_camera_required": "Kết nối camera trước khi quét...",
    "scan.button": "QUÉT",

    // result card / banner
    "result.ready": "SẴN SÀNG",
    "result.ready_hint": "Bấm {btn} để bắt đầu kiểm tra.",
    "result.complete_title": "ĐẠT",
    "result.complete_sub": "Đủ số lượng yêu cầu",
    "result.error_title": "LỖI",
    "result.error_sub": "Không hoàn tất được lần kiểm tra",
    "result.incomplete_title": "CHƯA ĐẠT",
    "result.reason_missing": "thiếu",
    "result.reason_excess": "dư",
    "result.reason_unknown": "có vật lạ",
    "result.incomplete_fallback": "Không đạt yêu cầu",
    "result.incomplete_template": "Sản phẩm {reasons} so với yêu cầu",
    "result.list_separator": ", ",

    // roi selector
    "roi.drag_hint": "KÉO CHUỘT ĐỂ CHỌN VÙNG QUAN TÂM (ROI)",
    "roi.confirm": "Xác nhận",
    "roi.redraw": "Vẽ lại",
    "roi.cancel": "Hủy",

    // detection overlay
    "detection.heading": "KẾT QUẢ NHẬN DIỆN",
    "detection.col_score": "Điểm",
    "detection.col_status": "Trạng thái",
    "detection.unknown": "KHÔNG RÕ",
    "detection.empty": "Không phát hiện vật thể nào.",
    "detection.object_prefix": "Vật thể ",
    "detection.prediction": "Dự đoán:",
    "detection.similarity": "Độ tương đồng: ",
    "detection.top_candidates": "Ứng viên hàng đầu:",

    // product table
    "product.heading": "SẢN PHẨM YÊU CẦU",
    "product.heading_verification": " · KIỂM CHỨNG",
    "product.empty_title": "Chưa quét đơn hàng nào",
    "product.empty_hint": "Quét mã đơn hàng ở trên để tải yêu cầu.",
    "product.col_product": "Sản phẩm",
    "product.col_req": "Y.cầu",
    "product.col_det": "P.hiện",
    "product.total": "Tổng",

    // result status (missing/excess/unknown detail)
    "result_status.missing_heading": "SẢN PHẨM THIẾU",
    "result_status.missing_row": "{name} — Yêu cầu: {required}, Phát hiện: {detected}, Thiếu: {missing}",
    "result_status.excess_heading": "SẢN PHẨM DƯ",
    "result_status.excess_row": "{name} — Yêu cầu: {required}, Phát hiện: {detected}, Dư: {excess}",
    "result_status.unknown_heading": "VẬT THỂ KHÔNG RÕ",
    "result_status.unknown_body": "Có {count} vật thể không phân loại được. Vui lòng kiểm tra ảnh đã chụp.",

    // sku picker
    "sku_picker.placeholder": "Chọn SKU có sẵn hoặc gõ tên mới...",
    "sku_picker.no_match": "Không có SKU khớp — sẽ tạo mới.",
    "sku_picker.empty": "Chưa có SKU nào, gõ tên để tạo mới.",
    "sku_picker.create_new": "+ Tạo SKU mới: \"{value}\"",

    // kpi strip
    "kpi.today": "HÔM NAY",
  },

  ja: {
    // nav
    "nav.inspection": "検査",
    "nav.sku": "SKU管理",
    "nav.history": "履歴",

    // header
    "header.brand": "SKU INSPECTION",
    "header.title": "SKU INSPECTION SYSTEM",
    "header.auth_disabled": "ログイン一時停止中(会社APIの復旧待ち)",
    "header.backend_online": "バックエンド稼働中",
    "header.vision_settings": "画像処理設定",
    "header.logout": "ログアウト",

    // login
    "login.connect_error": "サーバーに接続できませんでした。",
    "login.subtitle": "続けるにはログインしてください",
    "login.email_label": "アカウント(メール)",
    "login.email_placeholder": "name@company.com",
    "login.password_label": "パスワード",
    "login.submit_loading": "ログイン中...",
    "login.submit": "ログイン",

    // history
    "history.load_error": "履歴の読み込みに失敗しました。",
    "history.filter_all": "すべて",
    "history.filter_complete": "合格",
    "history.filter_incomplete": "不合格",
    "history.heading": "検査履歴",
    "history.search_placeholder": "注文コードで検索...",
    "history.col_code": "コード",
    "history.col_date": "日時",
    "history.col_result": "結果",
    "history.col_products": "製品",
    "history.col_unknown": "不明",
    "history.col_operator": "担当者",
    "history.col_action": "操作",
    "history.view": "表示",
    "history.empty": "フィルタに一致する記録がありません。",
    "history.detail_heading": "詳細 — ",
    "history.detail_col_required": "必要数",
    "history.detail_col_detected": "検出数",
    "history.threshold_label": "しきい値: ",
    "history.processing_time_label": "処理時間: ",
    "history.operator_label": "担当者: ",

    // inspection
    "inspection.camera_required": "スキャンする前にカメラを接続してください。",
    "inspection.order_load_error": "注文の読み込みに失敗しました。",
    "inspection.run_error": "検査に失敗しました。",
    "inspection.camera_offline_error": "カメラがオフラインです。",
    "inspection.timing": "合計: {total}ms・SAM2: {sam2}ms・DINOv3: {dinov3}ms・マッチング: {matching}ms",

    // sku management
    "sku.load_error": "SKU一覧の読み込みに失敗しました。",
    "sku.roi_save_error": "ROIの保存に失敗しました。",
    "sku.roi_clear_error": "ROIのクリアに失敗しました。",
    "sku.samples_load_error": "サンプルの読み込みに失敗しました。",
    "sku.capture_failed": "キャプチャに失敗しました。",
    "sku.name_required": "サンプルを追加する前にSKU名を入力してください。",
    "sku.save_failed": "保存に失敗しました。",
    "sku.skipped_files": "読み込めなかったファイルを{count}件スキップしました: {files}",
    "sku.segment_failed": "分割に失敗しました。",
    "sku.add_samples_heading": "サンプル追加",
    "sku.name_label": "SKU名",
    "sku.tab_camera": "カメラ",
    "sku.tab_upload": "画像をアップロード",
    "sku.segmenting": "分割処理中...",
    "sku.capture_segment": "キャプチャ&分割",
    "sku.select_roi": "ROIを選択",
    "sku.full_frame": "フルフレーム",
    "sku.upload_segment_btn": "分割する({count}枚)",
    "sku.dropzone_hint": "画像をドラッグ&ドロップ、またはクリックして選択",
    "sku.dropzone_subhint": "全景写真(切り抜き前)、複数選択可",
    "sku.add_more_images": "+ 画像を追加",
    "sku.crops_detected": "{count}個のオブジェクトを検出 — \"{label}\"として追加、またはスキップ:",
    "sku.add": "追加",
    "sku.skip": "スキップ",
    "sku.registered_heading": "登録済みSKU",
    "sku.empty": "SKUがまだありません。上でサンプルを追加して始めてください。",
    "sku.hide_samples": "サンプルを隠す",
    "sku.view_samples": "サンプルを見る",
    "sku.delete_sku": "SKUを削除",
    "sku.delete_sample": "削除",

    // shared across CameraView + SkuManagement
    "common.connect_camera": "カメラに接続",
    "common.disconnect_camera": "カメラを切断",
    "common.camera_offline": "カメラオフライン",
    "common.sample_count": "{count}件のサンプル",

    // camera view (Inspection page)
    "camera.no_order": "注文未スキャン",
    "camera.connected": "接続済み",
    "camera.disconnected": "未接続",
    "camera.captured": "キャプチャ済み",
    "camera.capture": "キャプチャ",
    "camera.connect_first": "先にカメラを接続してください",
    "camera.scan_first": "先に注文コードをスキャンしてください",
    "camera.running": "実行中...",
    "camera.run_inspection": "検査を実行",
    "camera.reset": "リセット",

    // settings panel
    "settings.heading": "画像処理設定",
    "settings.loading": "読み込み中...",
    "settings.load_error": "設定の読み込みに失敗しました。",
    "settings.save_error": "設定の保存に失敗しました。",
    "settings.saving": "保存中...",
    "settings.save": "保存",
    "settings.saved": "保存しました — 次回の検査から適用されます。",
    "settings.similarity_threshold_label": "類似度しきい値",
    "settings.similarity_threshold_hint": "このスコアを下回ると、オブジェクトは不明として分類されます。",
    "settings.min_area_label": "最小マスク面積(px)",
    "settings.min_area_hint": "この値より小さいマスクはノイズとして除外されます。",
    "settings.max_area_ratio_label": "最大面積比率",
    "settings.max_area_ratio_hint": "ROIに対してこの割合より大きいマスクは背景として扱われます。",
    "settings.mask_containment_label": "マスク包含しきい値",
    "settings.mask_containment_hint": "小さいマスクが大きいマスクに統合されるために必要な重なりの度合い。",
    "settings.bbox_padding_label": "バウンディングボックス余白比率",
    "settings.bbox_padding_hint": "特徴抽出前に各オブジェクトの切り抜き周囲に保持される余分な範囲。",
    "settings.min_unknown_score_label": "不明判定の最小スコア",
    "settings.min_unknown_score_hint": "このスコアを下回る不明オブジェクトは、セグメンテーションノイズとして除外されます(描画・カウントされません)。",
    "settings.yolo_conf_threshold_label": "YOLO信頼度しきい値",
    "settings.yolo_conf_threshold_hint": "detection_backend = \"yolo\" のときのみ適用 — このしきい値を下回る信頼度のオブジェクトは無視されます。",
    "settings.detection_backend_label": "検出バックエンド",
    "settings.detection_backend_sam2_dino": "SAM2+DINOv3",
    "settings.detection_backend_yolo": "YOLO",
    "settings.yolo_unavailable_hint": "config.json に yolo_model_path が設定されていません — YOLOに切り替えられません。",

    // scan input
    "scan.label": "注文/製品コードをスキャン",
    "scan.placeholder_camera_required": "スキャンする前にカメラを接続してください...",
    "scan.button": "スキャン",

    // result card / banner
    "result.ready": "準備完了",
    "result.ready_hint": "{btn}を押して検査を開始してください。",
    "result.complete_title": "合格",
    "result.complete_sub": "必要数量を満たしています",
    "result.error_title": "エラー",
    "result.error_sub": "検査を完了できませんでした",
    "result.incomplete_title": "不合格",
    "result.reason_missing": "数量不足",
    "result.reason_excess": "数量過剰",
    "result.reason_unknown": "不明物が混入",
    "result.incomplete_fallback": "要件を満たしていません",
    "result.incomplete_template": "{reasons}(要求内容と相違)",
    "result.list_separator": "、",

    // roi selector
    "roi.drag_hint": "ドラッグしてROI(関心領域)を選択",
    "roi.confirm": "確定",
    "roi.redraw": "再描画",
    "roi.cancel": "キャンセル",

    // detection overlay
    "detection.heading": "検出結果",
    "detection.col_score": "スコア",
    "detection.col_status": "ステータス",
    "detection.unknown": "不明",
    "detection.empty": "オブジェクトが検出されませんでした。",
    "detection.object_prefix": "オブジェクト ",
    "detection.prediction": "予測:",
    "detection.similarity": "類似度: ",
    "detection.top_candidates": "上位候補:",

    // product table
    "product.heading": "必要製品",
    "product.heading_verification": "・検証",
    "product.empty_title": "まだ注文がスキャンされていません",
    "product.empty_hint": "上で注文コードをスキャンして要件を読み込んでください。",
    "product.col_product": "製品",
    "product.col_req": "必要",
    "product.col_det": "検出",
    "product.total": "合計",

    // result status (missing/excess/unknown detail)
    "result_status.missing_heading": "不足製品",
    "result_status.missing_row": "{name} — 必要: {required}、検出: {detected}、不足: {missing}",
    "result_status.excess_heading": "過剰製品",
    "result_status.excess_row": "{name} — 必要: {required}、検出: {detected}、過剰: {excess}",
    "result_status.unknown_heading": "不明オブジェクト",
    "result_status.unknown_body": "{count}個のオブジェクトを分類できませんでした。撮影画像を確認してください。",

    // sku picker
    "sku_picker.placeholder": "既存のSKUを選択するか、新しい名前を入力...",
    "sku_picker.no_match": "一致するSKUがありません — 新規作成されます。",
    "sku_picker.empty": "SKUがまだありません。名前を入力して新規作成してください。",
    "sku_picker.create_new": "+ 新規SKUを作成: \"{value}\"",

    // kpi strip
    "kpi.today": "本日",
  },
};
