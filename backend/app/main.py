"""TaskFlow FastAPI application entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, boards, tasks, ws
from app.core.config import settings
from app.db.base import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup. On a fresh/free database this means the app
    # is self-provisioning with no manual migration step required to boot.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Collaborative task & project management platform — REST + WebSocket API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["health"])
async def root():
    return {"service": "TaskFlow API", "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy"}


# REST routers (all under /api)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(boards.router, prefix=settings.API_V1_PREFIX)
app.include_router(tasks.router, prefix=settings.API_V1_PREFIX)

# WebSocket router (no /api prefix)
app.include_router(ws.router)
