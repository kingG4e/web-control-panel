import os
from cryptography.fernet import Fernet


_FERNET_KEY_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'instance', 'fernet.key'))


def _ensure_key_file() -> bytes:
    os.makedirs(os.path.dirname(_FERNET_KEY_PATH), exist_ok=True)
    if not os.path.exists(_FERNET_KEY_PATH):
        key = Fernet.generate_key()
        with open(_FERNET_KEY_PATH, 'wb') as f:
            f.write(key)
        return key
    with open(_FERNET_KEY_PATH, 'rb') as f:
        return f.read()


def get_fernet() -> Fernet:
    key = os.environ.get('SIGNUP_SECRET_KEY')
    if key:
        try:
            return Fernet(key.encode('utf-8'))
        except Exception:
            pass
    # Fallback to instance key file
    file_key = _ensure_key_file()
    return Fernet(file_key)


def encrypt_text(plaintext: str) -> str:
    f = get_fernet()
    token = f.encrypt(plaintext.encode('utf-8'))
    return token.decode('utf-8')


def decrypt_text(token: str) -> str:
    f = get_fernet()
    plaintext = f.decrypt(token.encode('utf-8'))
    return plaintext.decode('utf-8')


