import importlib.util
from pathlib import Path

from fastapi.testclient import TestClient


ENTRY_PATH = Path(__file__).resolve().parents[1] / "EMPLOYEE DOCUMENT PACKER.py"
SPEC = importlib.util.spec_from_file_location("office_toolbox_entry", ENTRY_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
app = MODULE.app


def test_root_and_health_routes_exist():
    client = TestClient(app)

    root_response = client.get("/")
    health_response = client.get("/api/health")

    assert root_response.status_code == 200
    assert health_response.status_code == 200


def test_create_pack_route_exists():
    client = TestClient(app)

    response = client.post(
        "/api/create-pack",
        data={
            "employee_id": "EMP-101",
            "employee_name": "Alex Morgan",
            "document_types": '["Aadhaar"]'
        },
        files={"files": ("sample.pdf", b"%PDF-1.4\n%%EOF", "application/pdf")},
    )

    assert response.status_code in {200, 400}
