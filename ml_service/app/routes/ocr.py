"""
OCR routes for text extraction
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from ..services.ocr_service import ocr_service
from typing import Optional

router = APIRouter()

@router.post('/extract-text')
async def extract_text(
    file: UploadFile = File(...),
    max_pages: Optional[int] = 10
):
    """
    Extract text from image or PDF using OCR.space API
    
    Supported formats:
    - Images: jpg, jpeg, png, bmp, tiff, gif, webp
    - PDFs: Extract text from scanned pages
    
    Returns:
        - text: Extracted text content
        - word_count: Number of words extracted
        - confidence: OCR confidence (0-100)
        - page_count: Number of pages (for PDFs)
    """
    try:
        # Read file data
        file_data = await file.read()
        
        if len(file_data) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Get file type
        content_type = file.content_type or ''
        filename = file.filename or ''
        
        # Extract text (now async)
        result = await ocr_service.extract_text(file_data, content_type or filename)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'OCR failed'))
        
        return JSONResponse(content={
            'success': True,
            'data': result
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@router.post('/extract-from-url')
async def extract_from_url(url: str):
    """
    Extract text from image/PDF at URL
    """
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            
            file_data = response.content
            content_type = response.headers.get('content-type', '')
            
            result = await ocr_service.extract_text(file_data, content_type)
            
            if not result['success']:
                raise HTTPException(status_code=400, detail=result.get('error', 'OCR failed'))
            
            return JSONResponse(content={
                'success': True,
                'data': result
            })
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
