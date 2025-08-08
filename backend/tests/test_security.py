import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.security import is_safe_path  # noqa: E402

def test_is_safe_path_detects_prefix_attack():
    base = "/var/www"
    unsafe = "/var/wwwmalicious/file.txt"
    assert not is_safe_path(base, unsafe)

def test_is_safe_path_allows_subdir():
    base = "/var/www"
    safe_relative = "subdir/file.txt"
    assert is_safe_path(base, safe_relative)
