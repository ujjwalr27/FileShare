from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv

from app.routes import categorization, semantic_search, pii_detection, ocr, summarization
from app.services.model_manager import ModelManager

# Load environment variables from .env file
load_dotenv()

# Global model manager instance
model_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the FastAPI app.
    Initializes resources on startup and cleans up on shutdown.
    """
    global model_manager

    # Startup
    print("🚀 Starting ML Service...")
    model_manager = ModelManager()
    app.state.model_manager = model_manager
    print("✅ ML Service ready!")

    yield

    # Shutdown
    print("🛑 Shutting down ML Service...")
    if model_manager:
        model_manager.cleanup()
    print("✅ ML Service stopped")

# Create FastAPI app
app = FastAPI(
    title="FileShare ML Service",
    description="Machine Learning service for file analysis and smart features",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ml-service",
        "version": "1.0.0"
    }

# Include routers
app.include_router(categorization.router, prefix="/api/categorization", tags=["categorization"])
app.include_router(semantic_search.router, prefix="/api/semantic-search", tags=["semantic-search"])
app.include_router(pii_detection.router, prefix="/api/pii", tags=["pii-detection"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])
app.include_router(summarization.router, prefix="/api/summarization", tags=["summarization"])

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
