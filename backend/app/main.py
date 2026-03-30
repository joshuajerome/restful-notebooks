import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import config, endpoints, requests, variables
from app.services import endpoint_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    # Load endpoints from generated module or file
    endpoints_path = os.environ.get("POSTIT_ENDPOINTS_MODULE", "sfm_endpoints")
    endpoint_service.load_endpoints(endpoints_path)

    yield


app = FastAPI(title="post-it Desktop", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(endpoints.router)
app.include_router(requests.router)
app.include_router(variables.router)
app.include_router(config.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
