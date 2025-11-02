import sys
from pathlib import Path

backend_dir = Path('backend').resolve()
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / '.env')

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

payload = {
    "photos": ["https://img4.idealista.it/blur/WEB_DETAIL_TOP-L-L/0/id.pro.it.image.master/64/00/56/719535099.jpg"],
    "listing_id": "www-idealista-it-immobile-33312678",
    "referer": "https://www.idealista.it/immobile/33312678/",
    "locale": "it"
}

response = client.post("/api/analysis/photo-condition-with-download", json=payload)
print('Status:', response.status_code)
print('Body:', response.text)
