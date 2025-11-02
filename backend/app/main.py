import base64

from dotenv import load_dotenv
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from app.api import router as api_router

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="HomeEstimate API",
    description="API per la stima del valore immobiliare",
    version="1.0.0"
)

_FAVICON_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7pRXQAAAAASUVORK5CYII="
)
FAVICON_BYTES = base64.b64decode(_FAVICON_BASE64)

# CORS middleware per permettere richieste dal frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "HomeEstimate API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    return Response(content=FAVICON_BYTES, media_type="image/png")
