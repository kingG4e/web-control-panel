import os
import sys
from flask import Flask

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import routes.auth as auth_module  # noqa: E402


def create_app(monkeypatch):
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'test-secret'
    app.register_blueprint(auth_module.auth_bp)

    def mock_refresh(token):
        return 'new-token' if token == 'old-token' else None

    monkeypatch.setattr(
        auth_module.auth_service, 'refresh_token', mock_refresh
    )
    return app


def test_refresh_token_success(monkeypatch):
    app = create_app(monkeypatch)
    client = app.test_client()
    response = client.post(
        '/api/auth/refresh',
        headers={'Authorization': 'Bearer old-token'}
    )
    assert response.status_code == 200
    assert response.get_json()['token'] == 'new-token'


def test_refresh_token_missing_token(monkeypatch):
    app = create_app(monkeypatch)
    client = app.test_client()
    response = client.post('/api/auth/refresh')
    assert response.status_code == 401
