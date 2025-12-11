from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from ml_service.app.services.categorization import FileCategorizer

router = APIRouter()

class FileInfo(BaseModel):
    id: str
    mime_type: Optional[str] = None
    extension: Optional[str] = None

class CategorizeRequest(BaseModel):
    mime_type: Optional[str] = None
    extension: Optional[str] = None

class BatchCategorizeRequest(BaseModel):
    files: List[FileInfo]

class CategorizeResponse(BaseModel):
    category: str
    confidence: float
    tags: List[str]
    is_sensitive: bool

@router.post("/categorize", response_model=CategorizeResponse)
async def categorize_file(request: CategorizeRequest):
    """
    Categorize a single file based on its MIME type and extension.
    """
    try:
        result = FileCategorizer.categorize_file(
            mime_type=request.mime_type or "",
            extension=request.extension or ""
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/categorize-batch")
async def categorize_batch(request: BatchCategorizeRequest):
    """
    Categorize multiple files at once.
    """
    try:
        files_data = [
            {
                "id": file.id,
                "mime_type": file.mime_type,
                "extension": file.extension
            }
            for file in request.files
        ]

        results = FileCategorizer.categorize_batch(files_data)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
