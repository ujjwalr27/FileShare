from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional


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
    Semantic search endpoint.
    DISABLED: Returns 503 to indicate semantic search is unavailable.
    The backend will fall back to keyword search.
    """
    raise HTTPException(
        status_code=503,
        detail="Semantic search is disabled (memory optimization for 512MB limit). Using keyword search instead."
    )


@router.post("/generate-embedding")
async def generate_embedding(request: GenerateEmbeddingRequest, app_request: Request):
    """
    Generate embedding endpoint.
    DISABLED: Returns 503 to indicate feature is unavailable.
    """
    raise HTTPException(
        status_code=503,
        detail="Embedding generation is disabled (memory optimization for 512MB limit)."
    )


@router.post("/generate-tags")
async def generate_tags(request: GenerateTagsRequest, app_request: Request):
    """
    Generate tags endpoint.
    Returns simple tags based on file extension instead of ML-based tags.
    """
    filename = request.filename.lower()
    tags = []
    
    # Simple extension-based tagging
    if filename.endswith(('.pdf',)):
        tags.append('document')
    elif filename.endswith(('.doc', '.docx')):
        tags.append('document')
        tags.append('word')
    elif filename.endswith(('.xls', '.xlsx', '.csv')):
        tags.append('spreadsheet')
        tags.append('data')
    elif filename.endswith(('.ppt', '.pptx')):
        tags.append('presentation')
    elif filename.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')):
        tags.append('image')
    elif filename.endswith(('.mp4', '.avi', '.mov', '.mkv')):
        tags.append('video')
    elif filename.endswith(('.mp3', '.wav', '.ogg', '.flac')):
        tags.append('audio')
    elif filename.endswith(('.zip', '.rar', '.7z', '.tar', '.gz')):
        tags.append('archive')
    elif filename.endswith(('.py', '.js', '.ts', '.java', '.cpp', '.c', '.h')):
        tags.append('code')
        tags.append('technical')
    elif filename.endswith(('.txt', '.md')):
        tags.append('text')
    elif filename.endswith(('.json', '.xml', '.yaml', '.yml')):
        tags.append('data')
        tags.append('technical')
    else:
        tags.append('other')

    return {"tags": tags}
