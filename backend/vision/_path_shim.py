"""
Them thu muc goc sku_counting/ vao sys.path de import truc tiep
common_pipeline.py / common_dino.py (nam ngoai backend/) ma KHONG can
sua/di chuyen 2 file do - giu nguyen cac script CLI hien co van chay duoc.
"""

import os
import sys

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)
