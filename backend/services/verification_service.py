"""
So sanh required (tu order) vs detected (tu inspection) -> tung dong SKU
OK/MISSING/EXCESS + unknown, roi ket luan tong the.

Chi con 2 ket qua: dung du tung SKU yeu cau VA khong co vat la (unknown)
thi moi la COMPLETE (dat) - con lai (thieu/du hang HOAC co unknown) deu la
INCOMPLETE (chua dat).
"""


def verify(products: list[dict], detected_counts: dict, unknown_count: int):
    """
    products: [{"sku", "name", "required_quantity"}, ...] (tu Order).
    detected_counts: {sku: so luong phat hien duoc} (khong bao gom unknown).

    Tra ve (verification_rows, overall_result).
    """
    rows = []
    has_missing = False
    has_excess = False

    for p in products:
        sku, name, required = p["sku"], p["name"], p["required_quantity"]
        detected = detected_counts.get(sku, 0)
        diff = detected - required
        if diff < 0:
            status = "MISSING"
            has_missing = True
        elif diff > 0:
            status = "EXCESS"
            has_excess = True
        else:
            status = "OK"
        rows.append({
            "sku": sku, "name": name, "required": required,
            "detected": detected, "difference": diff, "status": status,
        })

    required_skus = {p["sku"] for p in products}
    for sku, detected in detected_counts.items():
        if sku not in required_skus:
            rows.append({
                "sku": sku, "name": sku, "required": 0,
                "detected": detected, "difference": detected, "status": "EXCESS",
            })
            has_excess = True

    if unknown_count > 0:
        rows.append({
            "sku": "unknown", "name": "Unknown", "required": 0,
            "detected": unknown_count, "difference": unknown_count, "status": "UNKNOWN",
        })

    overall = "INCOMPLETE" if (has_missing or has_excess or unknown_count > 0) else "COMPLETE"

    return rows, overall
