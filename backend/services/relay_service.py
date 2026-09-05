"""
Dieu khien relay HID (bang USBRelay4, www.dcttech.com) bao hieu KET QUA
inspection - port tu PROCESS_INSPECTION/relay.py (dung nguyen co che, xem
README project do). Relay 2 = COMPLETE (dat), Relay 1 = INCOMPLETE (chua
dat), hoat dong nhu 2 den bao trang thai: sang DUNG 1 trong 2 khi CO ket
qua, TAT CA HAI khi dang chay 1 lan inspection moi hoac khong co ket qua
hop le (loi he thong) - xem set_verdict_lights().
"""
# import hid co the that bai NGAY LUC LOAD MODULE (khong chi luc mo thiet
# bi) neu thu vien he thong libhidapi chua duoc cai (package pip `hidapi`
# chi la binding ctypes, tren Linux can cai them lib native qua apt, vd
# `sudo apt install libhidapi-hidraw0`) - bat try/except o day, KHONG de
# loi import lam sap ca server, dung tinh than "den bao ket qua la tinh
# nang phu" nhu ban goc PROCESS_INSPECTION.
try:
    import hid
    _HID_IMPORT_ERROR = None
except Exception as _exc:  # ImportError (thieu lib native) hoac loi khac
    hid = None
    _HID_IMPORT_ERROR = _exc

VENDOR_ID = 0x16C0
PRODUCT_ID = 0x05DF
CMD_ON = 0xFF
CMD_OFF = 0xFD

RELAY_PASS = 2
RELAY_FAIL = 1


def _control_relay(relay_num, state):
    """relay_num: 1..4. state: True (BAT) | False (TAT)."""
    if hid is None:
        raise RuntimeError(f"Package 'hid' khong nap duoc: {_HID_IMPORT_ERROR}")
    if not 1 <= relay_num <= 4:
        raise ValueError("Relay number must be between 1 and 4")
    cmd_byte = CMD_ON if state else CMD_OFF
    report = bytes([0x00, cmd_byte, relay_num, 0, 0, 0, 0, 0, 0])

    device = hid.device()
    device.open(VENDOR_ID, PRODUCT_ID)
    try:
        device.write(report)
    finally:
        device.close()


def set_verdict_lights(passed):
    """passed: True (COMPLETE -> sang relay PASS) | False (INCOMPLETE -> sang
    relay FAIL) | None (dang chay 1 lan inspection moi/chua co ket qua hop le
    -> tat ca hai, ve trang thai trung tinh). Luon TAT CA HAI truoc roi moi
    BAT ben con lai (neu co) - dam bao khong bao gio sang nham ca 2 cung luc.
    Loi phan cung (khong tim thay thiet bi, day USB long...) chi in canh bao
    ra log, KHONG lam sap server/dung inspection - den bao ket qua la tinh
    nang phu, khong phai nhan dien cot loi."""
    try:
        _control_relay(RELAY_PASS, False)
        _control_relay(RELAY_FAIL, False)
        if passed is True:
            _control_relay(RELAY_PASS, True)
        elif passed is False:
            _control_relay(RELAY_FAIL, True)
    except Exception as e:
        print(f"[relay] canh bao: khong dieu khien duoc relay bao ket qua: {e}")
