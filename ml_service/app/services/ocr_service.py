"""
OCR Service for text extraction from images and PDFs
"""
import pytesseract
from PIL import Image
import pdf2image
import io
import tempfile
import os
from typing import Optional, Dict, Any

class OCRService:
    """Service for extracting text from images and PDFs using OCR"""
    
    def __init__(self):
        # Try to find tesseract executable
        # On Windows, it's usually in Program Files
        possible_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            '/usr/bin/tesseract',
            '/usr/local/bin/tesseract',
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                break
    
    def extract_text_from_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        Extract text from an image using OCR
        
        Args:
            image_data: Binary image data
            
        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            # Open image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Perform OCR
            text = pytesseract.image_to_string(image, lang='eng')
            
            # Get additional data
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            # Calculate confidence
            confidences = [int(conf) for conf in data['conf'] if conf != '-1']
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Count words
            words = text.split()
            word_count = len(words)
            
            return {
                'text': text.strip(),
                'word_count': word_count,
                'confidence': round(avg_confidence, 2),
                'language': 'eng',
                'success': True
            }
            
        except Exception as e:
            return {
                'text': '',
                'word_count': 0,
                'confidence': 0,
                'error': str(e),
                'success': False
            }
    
    def extract_text_from_pdf(self, pdf_data: bytes, max_pages: int = 10) -> Dict[str, Any]:
        """
        Extract text from PDF using OCR
        
        Args:
            pdf_data: Binary PDF data
            max_pages: Maximum number of pages to process
            
        Returns:
            Dictionary with extracted text and metadata
        """
        try:
            # Save PDF to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
                temp_pdf.write(pdf_data)
                temp_pdf_path = temp_pdf.name
            
            try:
                # Convert PDF to images
                images = pdf2image.convert_from_path(
                    temp_pdf_path,
                    dpi=300,
                    first_page=1,
                    last_page=min(max_pages, 100)  # Safety limit
                )
                
                # Extract text from each page
                all_text = []
                total_confidence = 0
                
                for page_num, image in enumerate(images, 1):
                    # Convert PIL image to bytes
                    img_byte_arr = io.BytesIO()
                    image.save(img_byte_arr, format='PNG')
                    img_byte_arr.seek(0)
                    
                    # Extract text
                    result = self.extract_text_from_image(img_byte_arr.read())
                    
                    if result['success'] and result['text']:
                        all_text.append(f"--- Page {page_num} ---\n{result['text']}")
                        total_confidence += result['confidence']
                
                # Combine results
                combined_text = '\n\n'.join(all_text)
                avg_confidence = total_confidence / len(images) if images else 0
                
                return {
                    'text': combined_text.strip(),
                    'word_count': len(combined_text.split()),
                    'page_count': len(images),
                    'confidence': round(avg_confidence, 2),
                    'success': True
                }
                
            finally:
                # Clean up temp file
                if os.path.exists(temp_pdf_path):
                    os.unlink(temp_pdf_path)
                    
        except Exception as e:
            return {
                'text': '',
                'word_count': 0,
                'page_count': 0,
                'confidence': 0,
                'error': str(e),
                'success': False
            }
    
    def extract_text(self, file_data: bytes, file_type: str) -> Dict[str, Any]:
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
            return self.extract_text_from_pdf(file_data)
        
        # Check if it's an image
        image_types = ['image/', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif']
        if any(img_type in file_type for img_type in image_types):
            return self.extract_text_from_image(file_data)
        
        return {
            'text': '',
            'error': f'Unsupported file type: {file_type}',
            'success': False
        }

# Global instance
ocr_service = OCRService()
