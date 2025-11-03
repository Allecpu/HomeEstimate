import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.omi import client as omi_client_module


@pytest.fixture(autouse=True)
def reset_omi_client():
    omi_client_module._omi_client = None
    yield
    omi_client_module._omi_client = None

SAMPLE_API_RESPONSE = {
    "success": True,
    "data": {
        "codice_comune": "F205",
        "comune": "Milano",
        "metri_quadri": 1,
        "zones": [
            {
                "zona_omi": "B1",
                "categorie": [
                    {
                        "categoria": "Abitazioni civili",
                        "conservazione": "ottimo",
                        "prezzo": {
                            "acquisto": {"minimo": 2400, "massimo": 3200, "mediano": 2800},
                            "affitto": {"minimo": 14.0, "massimo": 19.0, "mediano": 16.5},
                        },
                    }
                ],
            }
        ],
    },
}


def build_client() -> TestClient:
    return TestClient(app)


def test_purchase_and_rental_price_endpoints_return_values(monkeypatch):
    client = build_client()

    async def fake_get(self, url, params=None, **kwargs):
        request = httpx.Request("GET", url, params=params)
        return httpx.Response(200, request=request, json=SAMPLE_API_RESPONSE)

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    params = {
        "city": "Milano",
        "metri_quadri": 100,
        "tipo_immobile": "residenziale",
        "zona_omi": "B1",
    }

    purchase_response = client.get("/api/omi/purchase-price", params=params)
    assert purchase_response.status_code == 200
    purchase = purchase_response.json()
    assert purchase["medio_mq"] == pytest.approx(2800)
    assert purchase["max_mq"] == pytest.approx(3200)
    assert purchase["medio"] == pytest.approx(2800 * params["metri_quadri"])

    rental_response = client.get("/api/omi/rental-price", params=params)
    assert rental_response.status_code == 200
    rental = rental_response.json()
    assert rental["medio_mq"] == pytest.approx(16.5)
    assert rental["max"] == pytest.approx(19.0 * params["metri_quadri"])


def test_purchase_price_endpoint_returns_user_friendly_error(monkeypatch):
    client = build_client()

    async def failing_get(self, url, params=None, **kwargs):
        request = httpx.Request("GET", url, params=params)
        response = httpx.Response(
            500,
            request=request,
            json={"error": "getOmibasePrice is not defined"},
        )
        raise httpx.HTTPStatusError("error", request=request, response=response)

    monkeypatch.setattr(httpx.AsyncClient, "get", failing_get)

    params = {
        "city": "Milano",
        "metri_quadri": 50,
        "tipo_immobile": "residenziale",
        "zona_omi": "B1",
    }

    response = client.get("/api/omi/purchase-price", params=params)
    assert response.status_code == 502
    detail = response.json()["detail"]
    assert "Servizio quotazioni OMI temporaneamente non disponibile" in detail
    assert "getOmibasePrice is not defined" in detail
