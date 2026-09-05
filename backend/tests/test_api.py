from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "scanner_available" in data


def test_capabilities_endpoint():
    response = client.get("/api/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert "scanner_source" in data
    assert "supported_fields" in data


def test_scan_and_get_latest():
    # Trigger scan
    response = client.post("/api/scan")
    assert response.status_code == 200
    data = response.json()
    assert "scan_id" in data
    assert "started_at" in data

    # Get latest scan status / results
    get_res = client.get("/api/scans/latest")
    assert get_res.status_code == 200
    scan_data = get_res.json()
    if scan_data:
        assert "scan_id" in scan_data


def test_history_endpoint():
    response = client.get("/api/history?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "records" in data
    assert isinstance(data["records"], list)
