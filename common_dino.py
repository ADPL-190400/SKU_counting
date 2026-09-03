"""
============================================================
MODULE DUNG CHUNG: TRICH FEATURE DINOv3 + SO KHOP NHIEU NHAN
============================================================

Vieet MOI cho pipeline gan nhan/phan loai (khong import DINOv3_SAM.py -
file do chay `SAMPLES_DIR = sys.argv[1] if ...` o cap module, import vao
se doc nham sys.argv cua script khac). Logic trich feature giu nguyen tu
DINOv3_SAM.py (da kiem chung), chi mo rong tu 1 san pham duy nhat sang
nhieu nhan (LabelMatcher).

============================================================
HUONG DAN CAI DAT THU VIEN
============================================================
    pip install torch pillow "transformers>=4.56.0" huggingface_hub

    Dang nhap Hugging Face de duoc phep tai model DINOv3 (model dang bi
    "gate"): vao trang model tren huggingface.co (vd
    facebook/dinov3-vitb16-pretrain-lvd1689m), bam "Agree and access
    repository", roi chay `huggingface-cli login` (hoac set bien moi
    truong HF_TOKEN=hf_xxx...).
"""

import sys

try:
    import numpy as np
except ImportError:
    print("[LOI] Chua cai NumPy. Cai bang lenh: pip install numpy")
    sys.exit(1)

try:
    import torch
except ImportError:
    print("[LOI] Chua cai PyTorch. Cai bang lenh: pip install torch")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("[LOI] Chua cai Pillow. Cai bang lenh: pip install pillow")
    sys.exit(1)

try:
    from transformers import AutoImageProcessor, AutoModel
except ImportError:
    print('[LOI] Chua cai Transformers (>=4.56.0). Cai bang lenh: pip install "transformers>=4.56.0"')
    sys.exit(1)


# ====================================================================
# DINOv3 FEATURE EXTRACTOR (giong DINOv3_SAM.py)
# ====================================================================
class DINOFeatureExtractor:
    """
    Boc model DINOv3 (qua Hugging Face Transformers) de trich xuat
    feature vector toan anh (global embedding CLS token), dung de so
    khop san pham bang cosine similarity.
    """

    def __init__(self, model_id: str, device: str):
        self.model_id = model_id
        self.device = device
        self.processor = None
        self.model = None

    def load_model(self):
        """Tai AutoImageProcessor + AutoModel cua DINOv3 tu Hugging Face."""
        print(f"[DINOv3] Dang tai model '{self.model_id}' (device={self.device}) ...")
        self.processor = AutoImageProcessor.from_pretrained(self.model_id)
        self.model = AutoModel.from_pretrained(self.model_id)
        self.model.to(self.device)
        self.model.eval()
        print("[DINOv3] Tai model thanh cong.")

    @torch.inference_mode()
    def extract_feature(self, image_rgb: np.ndarray) -> np.ndarray:
        """
        image_rgb: anh numpy HxWx3, kenh mau RGB (KHONG phai BGR cua OpenCV!).
        Tra ve: vector feature float32, da L2-normalize, shape (hidden_size,).
        """
        pil_image = Image.fromarray(image_rgb)
        inputs = self.processor(images=pil_image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        outputs = self.model(**inputs)
        cls_token = outputs.last_hidden_state[:, 0, :]
        feature = cls_token[0].float().cpu().numpy()

        norm = np.linalg.norm(feature) + 1e-8
        feature = (feature / norm).astype(np.float32)
        return feature

    @torch.inference_mode()
    def extract_features_batch(self, images_rgb: list) -> np.ndarray:
        """
        images_rgb: list cac anh numpy HxWx3 RGB.
        Tra ve: mang feature (N, hidden_size), moi vector da L2-normalize.
        Gop nhieu anh vao 1 lan forward thay vi goi extract_feature() lap
        lai tung anh -> nhanh hon dang ke, nhat la tren GPU.
        """
        pil_images = [Image.fromarray(img) for img in images_rgb]
        inputs = self.processor(images=pil_images, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        outputs = self.model(**inputs)
        cls_tokens = outputs.last_hidden_state[:, 0, :]
        features = cls_tokens.float().cpu().numpy()

        norms = np.linalg.norm(features, axis=1, keepdims=True) + 1e-8
        features = (features / norms).astype(np.float32)
        return features


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Cosine similarity giua 2 vector (an toan cho ca vector chua normalize)."""
    denom = (np.linalg.norm(vec_a) * np.linalg.norm(vec_b)) + 1e-8
    return float(np.dot(vec_a, vec_b) / denom)


# ====================================================================
# LABEL MATCHER: SO KHOP 1 FEATURE VOI NHIEU NHAN (thay build_reference_feature)
# ====================================================================
class LabelMatcher:
    """
    Giu 1 reference feature (trung binh cac anh mau) cho MOI nhan, va so
    khop feature cua 1 vat moi voi TOAN BO cac nhan bang cosine similarity
    (argmax) - mo rong tu build_reference_feature (chi 1 san pham) cua
    DINOv3_SAM.py sang nhieu nhan.
    """

    def __init__(self, label_names: list, ref_matrix: np.ndarray):
        """
        label_names: list ten nhan, do dai L.
        ref_matrix: mang (L, D), moi hang la reference feature DA
            L2-normalize cua 1 nhan (cung thu tu voi label_names).
        """
        self.label_names = label_names
        self.ref_matrix = ref_matrix

    @classmethod
    def from_dataset_dir(cls, extractor: DINOFeatureExtractor, dataset_dir: str,
                          min_images_per_label: int = 1) -> "LabelMatcher":
        """
        Doc dataset_dir/<nhan>/*.{jpg,jpeg,png,bmp}, moi thu muc con la 1
        nhan. Trich feature tung anh bang DINOv3, lay trung binh + chuan
        hoa lai (L2-normalize) de ra reference feature dai dien cho nhan do.
        """
        import glob
        import os

        if not os.path.isdir(dataset_dir):
            print(f"[LOI] Khong tim thay thu muc dataset: {dataset_dir}. "
                  f"Hay chay enroll_samples.py truoc de gan nhan vat the.")
            sys.exit(1)

        label_dirs = sorted(
            d for d in os.listdir(dataset_dir)
            if os.path.isdir(os.path.join(dataset_dir, d))
        )
        if len(label_dirs) == 0:
            print(f"[LOI] Thu muc dataset '{dataset_dir}' chua co nhan nao. "
                  f"Hay chay enroll_samples.py truoc de gan nhan vat the.")
            sys.exit(1)

        import cv2

        label_names = []
        ref_features = []
        patterns = ["*.jpg", "*.jpeg", "*.png", "*.bmp"]

        for label in label_dirs:
            label_dir = os.path.join(dataset_dir, label)
            image_paths = []
            for pattern in patterns:
                image_paths.extend(glob.glob(os.path.join(label_dir, pattern)))
            image_paths.sort()

            images_rgb = []
            for path in image_paths:
                bgr = cv2.imread(path)
                if bgr is None:
                    print(f"[CANH BAO] Khong doc duoc anh: {path}, bo qua.")
                    continue
                images_rgb.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))

            if len(images_rgb) < min_images_per_label:
                print(f"[CANH BAO] Nhan '{label}' chi co {len(images_rgb)} anh hop le "
                      f"(can >= {min_images_per_label}), bo qua nhan nay.")
                continue

            features = extractor.extract_features_batch(images_rgb)
            ref_feature = features.mean(axis=0)
            norm = np.linalg.norm(ref_feature) + 1e-8
            ref_feature = (ref_feature / norm).astype(np.float32)

            label_names.append(label)
            ref_features.append(ref_feature)
            print(f"[DINOv3] Nhan '{label}': {len(images_rgb)} anh mau.")

        if len(label_names) == 0:
            print(f"[LOI] Khong co nhan nao hop le trong '{dataset_dir}' "
                  f"(can >= {min_images_per_label} anh moi nhan).")
            sys.exit(1)

        ref_matrix = np.stack(ref_features, axis=0)
        print(f"[DINOv3] Da nap {len(label_names)} nhan tu '{dataset_dir}'.")
        return cls(label_names, ref_matrix)

    def subset(self, labels: list) -> "LabelMatcher":
        """
        Tra ve 1 LabelMatcher moi chi gom cac nhan trong `labels`, dung lai
        hang co san trong ref_matrix (KHONG tinh lai embedding). Dung khi
        biet truoc danh sach san pham can doi chieu (vd tu 1 don hang cu
        the) de so khop chi trong pham vi do, giam nham lan voi cac nhan
        khong lien quan trong dataset. Nhan nao trong `labels` chua co du
        lieu mau (chua enroll) se tu dong bi bo qua.
        """
        keep_idx = [i for i, name in enumerate(self.label_names) if name in labels]
        if not keep_idx:
            return LabelMatcher([], np.zeros((0, self.ref_matrix.shape[1]), dtype=np.float32))
        names = [self.label_names[i] for i in keep_idx]
        matrix = self.ref_matrix[keep_idx]
        return LabelMatcher(names, matrix)

    def match(self, feature: np.ndarray):
        """So khop 1 feature (da normalize) voi tat ca nhan. Tra ve (label, similarity)."""
        sims = self.ref_matrix @ feature
        best_idx = int(np.argmax(sims))
        return self.label_names[best_idx], float(sims[best_idx])

    def match_batch(self, features: np.ndarray):
        """
        So khop nhieu feature cung luc (vectorized, nhanh hon goi match()
        lap lai tung cai). features: (N, D) da normalize.
        Tra ve: list (label, similarity), cung thu tu voi features.
        """
        if features.shape[0] == 0:
            return []
        sims = features @ self.ref_matrix.T  # (N, D) @ (D, L) -> (N, L)
        best_idx = np.argmax(sims, axis=1)
        return [
            (self.label_names[idx], float(sims[i, idx]))
            for i, idx in enumerate(best_idx)
        ]
