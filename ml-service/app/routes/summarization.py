"""
Summarization routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services.summarization_service import summarization_service

router = APIRouter()

class SummarizeRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150
    min_length: Optional[int] = 50
    num_sentences: Optional[int] = None

class BulletPointsRequest(BaseModel):
    text: str
    num_points: int = 5

class KeyPointsRequest(BaseModel):
    text: str
    top_k: int = 3

@router.post('/summarize')
async def summarize_text(request: SummarizeRequest):
    """
    Generate an abstractive summary of text
    
    Args:
        text: Input text to summarize
        max_length: Maximum summary length in tokens (default: 150)
        min_length: Minimum summary length in tokens (default: 50)
        num_sentences: Target number of sentences (optional)
        
    Returns:
        - summary: Generated summary
        - original_length: Word count of original text
        - summary_length: Word count of summary
        - compression_ratio: Summary length / Original length
        
    Example:
        {
            "text": "Long document text here...",
            "num_sentences": 3
        }
    """
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text is required")
        
        result = summarization_service.summarize_text(
            request.text,
            max_length=request.max_length,
            min_length=request.min_length,
            num_sentences=request.num_sentences
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Summarization failed'))
        
        return {
            'success': True,
            'data': result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

@router.post('/bullet-points')
async def generate_bullet_points(request: BulletPointsRequest):
    """
    Generate bullet-point summary
    
    Args:
        text: Input text
        num_points: Number of bullet points (default: 5)
        
    Returns:
        List of bullet points
    """
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text is required")
        
        result = summarization_service.summarize_in_bullets(
            request.text,
            num_points=request.num_points
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Bullet point generation failed'))
        
        return {
            'success': True,
            'data': result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bullet point generation failed: {str(e)}")

@router.post('/key-points')
async def extract_key_points(request: KeyPointsRequest):
    """
    Extract key points using extractive summarization
    
    Args:
        text: Input text
        top_k: Number of key sentences (default: 3)
        
    Returns:
        List of key sentences with analysis
    """
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text is required")
        
        result = summarization_service.extract_key_points(
            request.text,
            top_k=request.top_k
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Key point extraction failed'))
        
        return {
            'success': True,
            'data': result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Key point extraction failed: {str(e)}")

class AnalyzeDocumentRequest(BaseModel):
    text: str

@router.post('/analyze')
async def analyze_document(request: AnalyzeDocumentRequest):
    """
    Comprehensive document analysis
    
    Analyzes the entire document and provides:
    - Full summary
    - Structured bullet points
    - Key points
    - Document structure analysis
    - Key phrases and topics
    - Reading statistics
    
    Args:
        text: Input document text
        
    Returns:
        Comprehensive analysis including summary, bullets, key points, and metadata
        
    Example:
        {
            "text": "Your long document text here..."
        }
        
    Response:
        {
            "success": true,
            "data": {
                "summary": "Overall summary...",
                "bullet_points": ["Point 1", "Point 2", ...],
                "key_points": ["Key sentence 1", ...],
                "document_structure": {
                    "total_sentences": 50,
                    "total_words": 1000,
                    "headings": [...],
                    ...
                },
                "key_phrases": ["phrase 1", "phrase 2", ...],
                "statistics": {
                    "total_words": 1000,
                    "estimated_reading_time_minutes": 5.0,
                    ...
                }
            }
        }
    """
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text is required")
        
        result = summarization_service.analyze_document(request.text)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error', 'Document analysis failed'))
        
        return {
            'success': True,
            'data': result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document analysis failed: {str(e)}")
