"""Test the endpoint through FastAPI's test client."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("Testing /api/omi/suggest endpoint...")
response = client.get("/api/omi/suggest?address=Via Roma 10&city=Milano")

print(f"Status Code: {response.status_code}")
print(f"Response Headers: {dict(response.headers)}")
print(f"Response Body: {response.text}")

if response.status_code != 200:
    print("\nError occurred!")
else:
    print(f"\nJSON Response: {response.json()}")
