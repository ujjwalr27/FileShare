"""
OCR Service for text extraction from images and PDFs
Uses OCR.space API - no local Tesseract installation needed
"""
from __future__ import annotations

import os
import base64
import httpx
from typing import Dict, Any


class OCRService:
    """Service for extracting text from images and PDFs using OCR.space API"""
    
    def __init__(self):
        self.api_key = os.getenv('OCR_SPACE_API_KEY', '')
        self.api_url = 'https://api.ocr.space/parse/image'
        
    def _is_available(self) -> bool:
        """Check if OCR service is configured"""
        return bool(self.api_key and self.api_key != 'your_ocr_space_api_key_here')
    
    async def extract_text_from_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        Extract text from an image using OCR.space API
        
        Args:
            image_data: Binary image data
            
        Returns:
            Dictionary with extracted text and metadata
        """
        if not self._is_available():
            return {
                'text': '',
                'word_count': 0,
                'confidence': 0,
                'error': 'OCR service not configured. Please set OCR_SPACE_API_KEY.',
                'success': False
            }
        
        try:
            # Convert image to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            # Prepare request
            payload = {
                'apikey': self.api_key,
                'base64Image': f'data:image/png;base64,{base64_image}',
                'language': 'eng',
                'isOverlayRequired': False,
                'detectOrientation': True,
                'scale': True,
                'OCREngine': 2,  # OCR Engine 2 is more accurate
            }
            
            # Call OCR.space API
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(self.api_url, data=payload)
                result = response.json()
            
            # Parse response
            if result.get('IsErroredOnProcessing', False):
                error_message = result.get('ErrorMessage', ['OCR processing failed'])[0]
                return {
                    'text': '',
                    'word_count': 0,
                    'confidence': 0,
                    'error': error_message,
                    'success': False
                }
            
            # Extract text from parsed results
            parsed_results = result.get('ParsedResults', [])
            if not parsed_results:
                return {
                    'text': '',
                    'word_count': 0,
                    'confidence': 0,
                    'error': 'No text found in image',
                    'success': False
                }
            
            # Combine text from all parsed results
            extracted_text = '\n'.join([
                pr.get('ParsedText', '') for pr in parsed_results
            ])
            
            # Calculate confidence (OCR.space returns exit code, not confidence)
            # We'll estimate based on whether text was found
            confidence = 85.0 if extracted_text.strip() else 0.0
            
            # Count words
            word_count = len(extracted_text.split())
            
            return {
                'text': extracted_text.strip(),
                'word_count': word_count,
                'confidence': confidence,
                'language': 'eng',
                'success': True
            }
            
        except httpx.TimeoutException:
            return {
                'text': '',
                'word_count': 0,
                'confidence': 0,
                'error': 'OCR request timed out. Please try again.',
                'success': False
            }
        except Exception as e:
            return {
                'text': '',
                'word_count': 0,
                'confidence': 0,
                'error': str(e),
                'success': False
            }
    
    async def extract_text_from_pdf(self, pdf_data: bytes, max_pages: int = 10) -> Dict[str, Any]:
        """
        Extract text from PDF using OCR.space API
        
        Args:
            pdf_data: Binary PDF data
            max_pages: Maximum number of pages to process (OCR.space free tier limit)
            
        Returns:
            Dictionary with extracted text and metadata
        """
        if not self._is_available():
            return {
                'text': '',
                'word_count': 0,
                'page_count': 0,
                'confidence': 0,
                'error': 'OCR service not configured. Please set OCR_SPACE_API_KEY.',
                'success': False
            }
        
        try:
            # Convert PDF to base64
            base64_pdf = base64.b64encode(pdf_data).decode('utf-8')
            
            # Prepare request for PDF
            payload = {
                'apikey': self.api_key,
                'base64Image': f'data:application/pdf;base64,{base64_pdf}',
                'language': 'eng',
                'isOverlayRequired': False,
                'detectOrientation': True,
                'scale': True,
                'OCREngine': 2,
                'filetype': 'PDF',
            }
            
            # Call OCR.space API
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(self.api_url, data=payload)
                result = response.json()
            
            # Parse response
            if result.get('IsErroredOnProcessing', False):
                error_message = result.get('ErrorMessage', ['OCR processing failed'])[0]
                return {
                    'text': '',
                    'word_count': 0,
                    'page_count': 0,
                    'confidence': 0,
                    'error': error_message,
                    'success': False
                }
            
            # Extract text from parsed results (one per page)
            parsed_results = result.get('ParsedResults', [])
            if not parsed_results:
                return {
                    'text': '',
                    'word_count': 0,
                    'page_count': 0,
                    'confidence': 0,
                    'error': 'No text found in PDF',
                    'success': False
                }
            
            # Combine text from all pages
            all_text = []
            for i, pr in enumerate(parsed_results, 1):
                page_text = pr.get('ParsedText', '').strip()
                if page_text:
                    all_text.append(f"--- Page {i} ---\n{page_text}")
            
            combined_text = '\n\n'.join(all_text)
            word_count = len(combined_text.split())
            page_count = len(parsed_results)
            confidence = 85.0 if combined_text.strip() else 0.0
            
            return {
                'text': combined_text.strip(),
                'word_count': word_count,
                'page_count': page_count,
                'confidence': confidence,
                'success': True
            }
            
        except httpx.TimeoutException:
            return {
                'text': '',
                'word_count': 0,
                'page_count': 0,
                'confidence': 0,
                'error': 'OCR request timed out. PDF may be too large.',
                'success': False
            }
        except Exception as e:
            return {
                'text': '',
                'word_count': 0,
                'page_count': 0,
                'confidence': 0,
                'error': str(e),
                'success': False
            }
    
    async def extract_text(self, file_data: bytes, file_type: str) -> Dict[str, Any]:
        """
        Extract text from file based on type
        
        Args:
            file_data: Binary file data
            file_type: MIME type or file extension
            
        Returns:
            Dictionary with extracted text and metadata
        """
        file_type = file_type.lower()
        
        # Check if it's a PDF
        if 'pdf' in file_type or file_type.endswith('.pdf'):
            return await self.extract_text_from_pdf(file_data)
        
        # Check if it's an image
        image_types = ['image/', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif', '.webp']
        if any(img_type in file_type for img_type in image_types):
            return await self.extract_text_from_image(file_data)
        
        return {
            'text': '',
            'error': f'Unsupported file type: {file_type}',
            'success': False
        }


# Global instance
ocr_service = OCRService()
