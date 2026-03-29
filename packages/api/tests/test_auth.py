from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.database import get_engine
from app.main import create_application


@pytest.fixture
def client(tmp_path, monkeypatch) -> Iterator[TestClient]:
    database_path = tmp_path / 'auth-test.db'
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{database_path}')
    monkeypatch.setenv('AUTH_BOOTSTRAP_EMAIL', 'admin@example.com')
    monkeypatch.setenv('AUTH_BOOTSTRAP_PASSWORD', 'super-secret-password')
    monkeypatch.setenv('AUTH_BOOTSTRAP_FULL_NAME', 'Test Admin')
    monkeypatch.setenv('AUTH_COOKIE_SECURE', 'false')

    get_settings.cache_clear()
    get_engine.cache_clear()

    try:
        with TestClient(create_application()) as test_client:
            yield test_client
    finally:
        get_engine.cache_clear()
        get_settings.cache_clear()


def test_protected_routes_require_authentication(client: TestClient):
    response = client.get('/api/patients')

    assert response.status_code == 401
    assert response.json() == {'detail': 'Authentication required.'}


def test_login_sets_a_session_cookie_and_allows_access(client: TestClient):
    response = client.post(
        '/api/auth/login',
        json={'email': 'admin@example.com', 'password': 'super-secret-password'},
    )

    assert response.status_code == 200
    assert response.json()['email'] == 'admin@example.com'
    assert response.cookies.get('techconnect_session')

    protected_response = client.get('/api/patients')
    assert protected_response.status_code == 200
    assert protected_response.json() == []


def test_invalid_login_returns_unauthorized(client: TestClient):
    response = client.post(
        '/api/auth/login',
        json={'email': 'admin@example.com', 'password': 'wrong-password'},
    )

    assert response.status_code == 401
    assert response.json() == {'detail': 'Invalid email or password.'}


def test_current_user_endpoint_returns_the_authenticated_user(client: TestClient):
    login_response = client.post(
        '/api/auth/login',
        json={'email': 'admin@example.com', 'password': 'super-secret-password'},
    )
    assert login_response.status_code == 200

    response = client.get('/api/auth/me')

    assert response.status_code == 200
    assert response.json() == {
        'id': response.json()['id'],
        'email': 'admin@example.com',
        'full_name': 'Test Admin',
        'is_admin': True,
    }


def test_logout_revokes_the_browser_session(client: TestClient):
    login_response = client.post(
        '/api/auth/login',
        json={'email': 'admin@example.com', 'password': 'super-secret-password'},
    )
    assert login_response.status_code == 200

    logout_response = client.post('/api/auth/logout')

    assert logout_response.status_code == 204

    me_response = client.get('/api/auth/me')
    assert me_response.status_code == 401

    protected_response = client.get('/api/patients')
    assert protected_response.status_code == 401