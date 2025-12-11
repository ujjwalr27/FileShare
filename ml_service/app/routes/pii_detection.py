from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from ml_service.app.services.pii_detection import PIIDetector

router = APIRouter()

class DetectPIIRequest(BaseModel):
    text: str

class RedactPIIRequest(BaseModel):
    text: str
    redaction_char: Optional[str] = "*"

@router.post("/detect")
async def detect_pii(request: DetectPIIRequest, app_request: Request):
    """
    Detect PII in the given text.
    Returns detailed findings including entities and patterns.
    """
    try:
        # Get model manager from app state
        model_manager = app_request.app.state.model_manager
        nlp = model_manager.get_pii_model()

        # Detect PII
        findings = PIIDetector.detect_pii(nlp, request.text)

        return findings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/redact")
async def redact_pii(request: RedactPIIRequest, app_request: Request):
    """
    Detect and redact PII from text.
    Returns both the findings and redacted text.
    """
    try:
        # Get model manager from app state
        model_manager = app_request.app.state.model_manager
        nlp = model_manager.get_pii_model()

        # Detect PII
        findings = PIIDetector.detect_pii(nlp, request.text)

        # Redact PII
        redacted_text = PIIDetector.redact_pii(
            text=request.text,
            findings=findings,
            redaction_char=request.redaction_char
        )

        return {
            "original_length": len(request.text),
            "redacted_text": redacted_text,
            "findings": findings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assess-sensitivity")
async def assess_sensitivity(request: DetectPIIRequest, app_request: Request):
    """
    Assess the sensitivity level of text based on PII content.
    Provides recommendations for handling the data.
    """
    try:
        # Get model manager from app state
        model_manager = app_request.app.state.model_manager
        nlp = model_manager.get_pii_model()

        # Detect PII
        findings = PIIDetector.detect_pii(nlp, request.text)

        # Assess sensitivity
        assessment = PIIDetector.assess_file_sensitivity(findings)

        return assessment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
