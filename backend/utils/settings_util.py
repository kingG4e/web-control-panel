import os
from typing import Optional

try:
    from dotenv import dotenv_values
except Exception:
    dotenv_values = None  # type: ignore


def _backend_env_path() -> str:
    # backend/.env (same dir where app.py lives)
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    return os.path.join(backend_dir, '.env')


def get_env_or_dotenv(key: str, default: Optional[str] = None) -> Optional[str]:
    val = os.environ.get(key)
    if val is not None and str(val).strip() != '':
        return val
    try:
        if dotenv_values is not None:
            path = _backend_env_path()
            if os.path.exists(path):
                data = dotenv_values(path)
                val2 = data.get(key)
                if val2 is not None and str(val2).strip() != '':
                    return val2
    except Exception:
        pass
    return default


def get_dns_default_ip() -> str:
    # Order: env var -> backend/.env -> fallback
    return get_env_or_dotenv('DNS_DEFAULT_IP', default='127.0.0.1') or '127.0.0.1'


