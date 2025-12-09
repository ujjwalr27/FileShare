from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional

from app.services.semantic_search import SemanticSearch

router = APIRouter()

class FileData(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    files: List[FileData]
    threshold: Optional[float] = 0.3
    top_k: Optional[int] = 10

class GenerateEmbeddingRequest(BaseModel):
    text: str

class GenerateTagsRequest(BaseModel):
    filename: str
    content_preview: Optional[str] = None

@router.post("/search")
async def semantic_search(request: SearchRequest, app_request: Request):
    """
    Perform semantic search on files.
    Returns files ranked by semantic similarity to the query.
    """
    try:
        # Get model manager from app state
        model_manager = app_request.app.state.model_manager
        
        # Try to load the model
        try:
            model = model_manager.get_semantic_model()
        except Exception as model_error:
            error_msg = str(model_error)
            if "not a local folder" in error_msg or "not a valid model identifier" in error_msg:
                raise HTTPException(
                    status_code=503,
                    detail="Semantic search model not available. Please run 'python download_models.py' to download required models."
                )
            raise

        # Convert Pydantic models to dicts
        files_data = [
            {
                "id": file.id,
                "name": file.name,
                "description": file.description
            }
            for file in request.files
        ]

        # Perform search
        results = SemanticSearch.search_files(
            model=model,
            query=request.query,
            files=files_data,
            threshold=request.threshold,
            top_k=request.top_k
        )

        return {"results": results, "count": len(results)}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)

@router.post("/generate-embedding")
async def generate_embedding(request: GenerateEmbeddingRequest, app_request: Request):
    """
    Generate an embedding vector for the given text.
    Useful for pre-computing embeddings for storage.
    """
    try:
        model_manager = app_request.app.state.model_manager
        model = model_manager.get_semantic_model()

        embedding = SemanticSearch.generate_embedding(model, request.text)
        return {"embedding": embedding, "dimensions": len(embedding)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-tags")
async def generate_tags(request: GenerateTagsRequest, app_request: Request):
    """
    Generate relevant tags for a file based on its name and content.
    """
    try:
        model_manager = app_request.app.state.model_manager
        model = model_manager.get_semantic_model()

        tags = SemanticSearch.generate_file_tags(
            model=model,
            filename=request.filename,
            content_preview=request.content_preview or ""
        )

        return {"tags": tags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
