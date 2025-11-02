import sys
from pathlib import Path

backend_dir = Path('backend').resolve()
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / '.env')

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

payload_url = {
    "photos": [
        "https://www.schueco.com/resource/blob/3655256/e2245b3f0c7e3d524af98f70b2d729a7/4065a42-data.jpg"
    ],
    "listing_id": "schueco-test",
    "locale": "it"
}

response_url = client.post("/api/analysis/photo-condition-with-download", json=payload_url)
print("URL endpoint status:", response_url.status_code)
print("URL endpoint body:", response_url.text)

from base64 import b64encode

photo_path = backend_dir / "storage" / "photos" / "schueco-test" / "photo_000.jpg"
if photo_path.exists():
    b64data = "data:image/jpeg;base64," + b64encode(photo_path.read_bytes()).decode('utf-8')
    payload_base64 = {
        "photos": [b64data],
        "listing_id": "schueco-test",
        "locale": "it"
    }
    response_b64 = client.post("/api/analysis/photo-condition-base64", json=payload_base64)
    print("Base64 endpoint status:", response_b64.status_code)
    print("Base64 endpoint body:", response_b64.text)
else:
    print("Photo file not found for base64 test:", photo_path)
