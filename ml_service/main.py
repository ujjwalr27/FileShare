"""ml_service main.py

Improved FastAPI application entrypoint with non-blocking startup and
robust model-loading in the background so hosting platforms (Render,
Heroku, etc.) detect the bound port quickly.

Start command (recommended for Render):
  sh -c "uvicorn ml_service.main:app --host 0.0.0.0 --port $PORT --workers 1"

Notes:
 - ModelManager is handled flexibly: if it supports a lightweight
   constructor argument (init_quick=True) or a .load() method, those
   are used. Otherwise we instantiate in a background thread.
 - Health endpoint reports readiness while the model loads in the
   background.
 - Shutdown cancels/awaits the background loader and calls cleanup on
   the manager (if provided).
"""

import os
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

# Import your routers and ModelManager
from ml_service.app.routes import categorization, semantic_search, pii_detection, ocr, summarization
from ml_service.app.services.model_manager import ModelManager


# --------------------------- App configuration ---------------------------
app = FastAPI(
    title="FileShare ML Service",
    description="Machine Learning service for file analysis and smart features",
    version="1.0.0",
)

# CORS middleware (adjust allow_origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------- Application state ---------------------------
# We'll store the model manager and loader task on app.state
app.state.model_manager: Optional[ModelManager] = None
app.state._model_loader_task: Optional[asyncio.Task] = None


async def _background_init_model_manager() -> None:
    """Background job that initializes and loads the ModelManager.

    This function is designed to be resilient to different shapes of
    ModelManager:
      - If ModelManager accepts init_quick=True, we call that and then
        call .load() (if present) in a thread.
      - If not, we instantiate ModelManager in a background thread
        (so heavy __init__ work doesn't block the event loop) and
        consider it loaded.

    After this function completes, app.state.model_manager will be set
    and (if possible) an attribute `is_loaded` will be True.
    """
    try:
        # 1) Try "fast init" if supported
        try:
            mm = ModelManager(init_quick=True)  # type: ignore
            # If there's a separate load() method, run it in a thread
            if hasattr(mm, "load") and callable(mm.load):
                await asyncio.to_thread(mm.load)
            # mark loaded if possible
            if hasattr(mm, "is_loaded"):
                try:
                    setattr(mm, "is_loaded", True)
                except Exception:
                    pass
        except TypeError:
            # ModelManager doesn't accept init_quick; instantiate in a thread
            mm = await asyncio.to_thread(ModelManager)
            # If the class provides a separate load method (unlikely in this path), call it
            if hasattr(mm, "load") and callable(mm.load):
                await asyncio.to_thread(mm.load)
            if hasattr(mm, "is_loaded"):
                try:
                    setattr(mm, "is_loaded", True)
                except Exception:
                    pass

        # Store manager on app state
        app.state.model_manager = mm
        print("✅ ModelManager initialized and model(s) loaded in background.")

    except asyncio.CancelledError:
        # Task cancellation - exit quietly
        print("⚠️ Model loader task was cancelled before completion.")
        raise
    except Exception as e:
        # Keep exception accessible in app.state for debugging
        print(f"❌ Failed to initialize ModelManager in background: {e}")
        # Store the exception so health checks / logs can show it
        app.state.model_manager = None
        app.state._model_loader_error = e


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan manager: starts background model loading and
    ensures graceful shutdown."""
    print("🚀 Starting ML Service process (binding will happen immediately)...")

    # Start the background loader task (do not await it here)
    if not getattr(app.state, "_model_loader_task", None):
        app.state._model_loader_task = asyncio.create_task(_background_init_model_manager())

    try:
        yield

    finally:
        # Shutdown: cancel/await loader task and cleanup model manager
        print("🛑 Shutting down ML Service: waiting for background loader to finish/cancel...")
        task = getattr(app.state, "_model_loader_task", None)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                print("⚠️ Background loader cancelled during shutdown.")

        mm = getattr(app.state, "model_manager", None)
        if mm is not None:
            # call cleanup() in a thread if available
            if hasattr(mm, "cleanup") and callable(mm.cleanup):
                try:
                    await asyncio.to_thread(mm.cleanup)
                except Exception as e:
                    print(f"❌ Exception during model_manager.cleanup(): {e}")
        print("✅ ML Service stopped")


# Attach our lifespan manager to the app
app.router.lifespan_context = lifespan


# --------------------------- Routes & health ---------------------------
# Root + health endpoints
@app.get("/")
async def root():
    return {
        "service": "FileShare ML Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "categorization": "/api/categorization",
            "semantic_search": "/api/semantic-search",
            "pii_detection": "/api/pii",
            "ocr": "/api/ocr",
            "summarization": "/api/summarization",
        },
    }


@app.get("/health")
async def health_check():
    """Health endpoint that reports whether the model(s) are loaded.

    Returns `status: ready` when model is loaded, otherwise `starting`.
    If an error occurred during background init, it includes a short
    error hint (do not expose secrets).
    """
    mm = getattr(app.state, "model_manager", None)
    loader_task = getattr(app.state, "_model_loader_task", None)
    loader_error = getattr(app.state, "_model_loader_error", None)

    model_loaded = False
    if mm is not None:
        # prefer an explicit flag
        model_loaded = bool(getattr(mm, "is_loaded", True))
    else:
        # if manager not set yet, inspect task
        if loader_task is not None and loader_task.done() and not getattr(loader_task, "cancelled", lambda: False)():
            model_loaded = True

    status = "ready" if model_loaded else "starting"

    payload = {
        "status": status,
        "service": "ml-service",
        "version": "1.0.0",
        "model_loaded": model_loaded,
    }

    if loader_error is not None:
        # include brief error message for debugging (no sensitive details)
        payload["loader_error"] = str(loader_error)

    return payload


# Include routers
app.include_router(categorization.router, prefix="/api/categorization", tags=["categorization"])
app.include_router(semantic_search.router, prefix="/api/semantic-search", tags=["semantic-search"])
app.include_router(pii_detection.router, prefix="/api/pii", tags=["pii-detection"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])
app.include_router(summarization.router, prefix="/api/summarization", tags=["summarization"])


# HEAD method support for health checks (prevents 405 errors)
@app.head("/")
@app.head("/health")
async def head_check():
    """HEAD method support for health checks."""
    return Response(status_code=200)


# --------------------------- Local runner ---------------------------
if __name__ == "__main__":
    # For local development only. In production (Render) prefer the CLI with
    # the sh -c wrapper so $PORT expands correctly:
    #   sh -c "uvicorn ml_service.main:app --host 0.0.0.0 --port $PORT --workers 1"
    import uvicorn as _uvicorn

    _port = int(os.getenv("PORT", 8000))
    _uvicorn.run(
        "ml_service.main:app",
        host="0.0.0.0",
        port=_port,
        reload=False,
        log_level="info",
    )
