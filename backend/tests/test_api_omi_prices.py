import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

import types

# Stub selenium and webdriver-manager dependencies to avoid heavy imports during tests
selenium_module = types.ModuleType("selenium")
webdriver_module = types.ModuleType("selenium.webdriver")


def _dummy_driver(*args, **kwargs):
    return types.SimpleNamespace(
        set_page_load_timeout=lambda *a, **k: None,
        get=lambda *a, **k: None,
        quit=lambda *a, **k: None,
    )


edge_service_module = types.ModuleType("selenium.webdriver.edge.service")
edge_service_module.Service = object

edge_options_module = types.ModuleType("selenium.webdriver.edge.options")
edge_options_module.Options = object

webdriver_module.Edge = _dummy_driver
webdriver_module.edge = types.SimpleNamespace(service=edge_service_module, options=edge_options_module)

common_exceptions_module = types.ModuleType("selenium.common.exceptions")
common_exceptions_module.TimeoutException = type("TimeoutException", (Exception,), {})
common_exceptions_module.WebDriverException = type("WebDriverException", (Exception,), {})

selenium_module.webdriver = webdriver_module
selenium_module.common = types.SimpleNamespace(exceptions=common_exceptions_module)

sys.modules.setdefault("selenium", selenium_module)
sys.modules.setdefault("selenium.webdriver", webdriver_module)
sys.modules.setdefault("selenium.webdriver.edge", types.ModuleType("selenium.webdriver.edge"))
sys.modules.setdefault("selenium.webdriver.edge.service", edge_service_module)
sys.modules.setdefault("selenium.webdriver.edge.options", edge_options_module)
sys.modules.setdefault("selenium.common", types.ModuleType("selenium.common"))
sys.modules.setdefault("selenium.common.exceptions", common_exceptions_module)

webdriver_manager_chrome = types.ModuleType("webdriver_manager.chrome")
webdriver_manager_chrome.ChromeDriverManager = lambda: types.SimpleNamespace(install=lambda: "chromedriver")
sys.modules.setdefault("webdriver_manager.chrome", webdriver_manager_chrome)

webdriver_manager_microsoft = types.ModuleType("webdriver_manager.microsoft")
webdriver_manager_microsoft.EdgeChromiumDriverManager = lambda: types.SimpleNamespace(install=lambda: "edgedriver")
sys.modules.setdefault("webdriver_manager.microsoft", webdriver_manager_microsoft)

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

SAMPLE_EMPTY_RESPONSE = {"success": True, "data": {"zones": []}}


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


def test_purchase_price_endpoint_returns_404_when_no_quotes(monkeypatch):
    client = build_client()

    async def empty_get(self, url, params=None, **kwargs):
        request = httpx.Request("GET", url, params=params)
        return httpx.Response(200, request=request, json=SAMPLE_EMPTY_RESPONSE)

    monkeypatch.setattr(httpx.AsyncClient, "get", empty_get)

    params = {
        "city": "Milano",
        "metri_quadri": 50,
        "tipo_immobile": "residenziale",
        "zona_omi": "B1",
    }

    response = client.get("/api/omi/purchase-price", params=params)
    assert response.status_code == 404
    detail = response.json()["detail"]
    assert "Quotazioni di acquisto non disponibili" in detail


def test_rental_price_endpoint_returns_404_when_no_quotes(monkeypatch):
    client = build_client()

    async def empty_get(self, url, params=None, **kwargs):
        request = httpx.Request("GET", url, params=params)
        return httpx.Response(200, request=request, json=SAMPLE_EMPTY_RESPONSE)

    monkeypatch.setattr(httpx.AsyncClient, "get", empty_get)

    params = {
        "city": "Milano",
        "metri_quadri": 50,
        "tipo_immobile": "residenziale",
        "zona_omi": "B1",
    }

    response = client.get("/api/omi/rental-price", params=params)
    assert response.status_code == 404
    detail = response.json()["detail"]
    assert "Quotazioni di affitto non disponibili" in detail
