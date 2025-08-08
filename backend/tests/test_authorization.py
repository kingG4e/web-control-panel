import os
import sys
from datetime import datetime, timedelta

import jwt
import pytest
import types

# Provide stub for mysql.connector if unavailable
mysql_module = types.ModuleType("mysql")
mysql_connector = types.ModuleType("connector")
mysql_module.connector = mysql_connector
mysql_connector.Error = Exception
sys.modules.setdefault("mysql", mysql_module)
sys.modules.setdefault("mysql.connector", mysql_connector)

# Stub RoundcubeService to avoid external dependency during tests
roundcube_module = types.ModuleType("services.roundcube_service")

class DummyRoundcubeService:
    def __init__(self, *args, **kwargs):
        pass

roundcube_module.RoundcubeService = DummyRoundcubeService
sys.modules.setdefault("services.roundcube_service", roundcube_module)

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app import create_app  # noqa: E402
from config import TestingConfig  # noqa: E402
from models.database import db  # noqa: E402
from models.user import User  # noqa: E402


@pytest.fixture
def app():
    app = create_app(TestingConfig)
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


def _generate_token(app, user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")


def test_dns_requires_auth(client):
    res = client.get("/api/dns/zones")
    assert res.status_code == 401


def test_database_requires_auth(client):
    res = client.get("/api/databases")
    assert res.status_code == 401


def test_ssl_requires_auth(client):
    res = client.get("/api/ssl/certificates")
    assert res.status_code == 401


def test_dns_create_requires_permission(app, client):
    with app.app_context():
        user = User(username="testuser", role="user")
        user.set_password("password")
        user.roles = []
        db.session.add(user)
        db.session.commit()
        token = _generate_token(app, user.id)

    res = client.post(
        "/api/dns/zones",
        json={"domain_name": "example.com"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403

