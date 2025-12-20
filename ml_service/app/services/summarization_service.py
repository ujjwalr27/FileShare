"""
File Summarization Service using Google Gemini API
Provides document summarization, bullet points, and key insights
"""
import google.generativeai as genai
from typing import Dict, Any, Optional, List
import re
import os
from collections import Counter

# NLTK imports - but don't download at import time
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize

# Lazy NLTK data loading flag
_nltk_data_loaded = False

def _ensure_nltk_data():
    """Load NLTK data lazily on first use"""
    global _nltk_data_loaded
    if _nltk_data_loaded:
        return
    
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt_tab', quiet=True)
    
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
    
    _nltk_data_loaded = True

class SummarizationService:
    """Service for generating text summaries using Google Gemini API"""
    
    def __init__(self):
        self.api_key = None
        self.model = None
        self.model_loaded = False
        self._stop_words = None
    
    @property
    def stop_words(self):
        """Lazy load stop words on first use"""
        if self._stop_words is None:
            _ensure_nltk_data()
            from nltk.corpus import stopwords
            self._stop_words = set(stopwords.words('english'))
        return self._stop_words
        
    def load_model(self):
        """Initialize Gemini API"""
        if self.model_loaded:
            return
        
        try:
            # Ensure NLTK data is available (needed for tokenization)
            _ensure_nltk_data()
            
            # Get API key from environment
            self.api_key = os.getenv('GEMINI_API_KEY')
            
            if not self.api_key or self.api_key == 'your_gemini_api_key_here':
                raise ValueError(
                    "GEMINI_API_KEY not set. Please add your Gemini API key to the .env file.\n"
                    "Get your API key from: https://makersuite.google.com/app/apikey"
                )
            
            # Configure Gemini
            genai.configure(api_key=self.api_key)
            
            # Use Gemini 2.5 Flash for fast, cost-effective summarization
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            
            self.model_loaded = True
            print("✓ Gemini API initialized successfully (gemini-2.5-flash)")
            
        except Exception as e:
            print(f"Failed to initialize Gemini API or load dependencies: {e}")
            import traceback
            traceback.print_exc()
            self.model_loaded = False
            raise
    
    def _split_into_chunks(self, text: str, max_chars: int = 30000) -> List[str]:
        """
        Split text into manageable chunks for processing.
        Gemini 2.5 Flash can handle very long texts, but we chunk for better results.
        """
        if len(text) <= max_chars:
            return [text]
        
        # Split by paragraphs first
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            if len(current_chunk) + len(para) + 2 <= max_chars:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        print(f"Split document into {len(chunks)} chunks for processing")
        return chunks
    
    def _extract_key_phrases(self, text: str, top_n: int = 10) -> List[str]:
        """
        Extract key phrases using TF-IDF-like approach
        
        Args:
            text: Input text
            top_n: Number of key phrases to extract
            
        Returns:
            List of key phrases
        """
        # Tokenize and remove stopwords
        words = word_tokenize(text.lower())
        words = [w for w in words if w.isalnum() and w not in self.stop_words and len(w) > 3]
        
        # Get word frequencies
        word_freq = Counter(words)
        
        # Extract bigrams and trigrams
        phrases = []
        for i in range(len(words) - 1):
            bigram = f"{words[i]} {words[i+1]}"
            phrases.append(bigram)
            
            if i < len(words) - 2:
                trigram = f"{words[i]} {words[i+1]} {words[i+2]}"
                phrases.append(trigram)
        
        phrase_freq = Counter(phrases)
        
        # Combine single words and phrases
        all_terms = list(word_freq.most_common(top_n // 2)) + list(phrase_freq.most_common(top_n // 2))
        
        return [term for term, _ in all_terms[:top_n]]
    
    def _detect_document_structure(self, text: str) -> Dict[str, Any]:
        """
        Analyze document structure and extract metadata
        
        Args:
            text: Input text
            
        Returns:
            Dictionary with structure information
        """
        sentences = sent_tokenize(text)
        words = word_tokenize(text)
        
        # Detect headings (lines that are short and may be capitalized)
        lines = text.split('\n')
        potential_headings = []
        
        for line in lines:
            line = line.strip()
            if line and len(line.split()) <= 10 and (line.isupper() or line.istitle()):
                potential_headings.append(line)
        
        # Calculate readability metrics
        avg_sentence_length = len(words) / len(sentences) if sentences else 0
        
        return {
            'total_sentences': len(sentences),
            'total_words': len(words),
            'total_paragraphs': len([p for p in text.split('\n\n') if p.strip()]),
            'avg_sentence_length': round(avg_sentence_length, 2),
            'headings': potential_headings[:10],
            'has_structure': len(potential_headings) > 0
        }

    def summarize_text(
        self,
        text: str,
        max_length: int = 150,
        min_length: int = 50,
        num_sentences: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive summary using Gemini API
        
        Args:
            text: Input text to summarize
            max_length: Maximum length of summary in tokens (approximate)
            min_length: Minimum length of summary in tokens (approximate)
            num_sentences: Target number of sentences (overrides max_length if provided)
            
        Returns:
            Dictionary with summary, metadata, and document analysis
        """
        try:
            # Load model if not loaded
            if not self.model_loaded:
                self.load_model()
            
            # Clean and validate text
            text = text.strip()
            
            if not text:
                return {
                    'summary': '',
                    'original_length': 0,
                    'summary_length': 0,
                    'compression_ratio': 0,
                    'success': False,
                    'error': 'Empty text provided'
                }
            
            # Check text length
            words = text.split()
            word_count = len(words)
            
            # If text is too short, return as-is with basic analysis
            if word_count < 100:
                return {
                    'summary': text,
                    'original_length': word_count,
                    'summary_length': word_count,
                    'compression_ratio': 1.0,
                    'success': True,
                    'message': 'Text too short to summarize',
                    'document_structure': self._detect_document_structure(text),
                    'key_phrases': self._extract_key_phrases(text, top_n=5)
                }
            
            # Create prompt based on requirements
            if num_sentences:
                prompt = f"""Summarize the following document in exactly {num_sentences} sentences. 
Be concise and capture the main points.

Document:
{text}

Summary:"""
            else:
                # Approximate words from tokens (1 token ≈ 0.75 words)
                target_words = int(max_length * 0.75)
                prompt = f"""Summarize the following document in approximately {target_words} words.
Be concise, clear, and capture the main points and key information.

Document:
{text}

Summary:"""
            
            print(f"Generating summary for {word_count} words using Gemini API...")
            
            # Generate summary using Gemini
            response = self.model.generate_content(prompt)
            final_summary = response.text.strip()
            
            summary_word_count = len(final_summary.split())
            compression_ratio = summary_word_count / word_count if word_count > 0 else 0
            
            # Ensure compression ratio is at least 0.01 if we have content
            if compression_ratio > 0 and compression_ratio < 0.01:
                compression_ratio = 0.01
            
            # Extract additional information
            document_structure = self._detect_document_structure(text)
            key_phrases = self._extract_key_phrases(text, top_n=10)
            
            print(f"Summary generated: {summary_word_count} words from {word_count} words")
            
            return {
                'summary': final_summary,
                'original_length': word_count,
                'summary_length': summary_word_count,
                'compression_ratio': round(compression_ratio, 3),
                'document_structure': document_structure,
                'key_phrases': key_phrases,
                'success': True
            }
            
        except Exception as e:
            print(f"Summarization error: {e}")
            import traceback
            traceback.print_exc()
            return {
                'summary': '',
                'error': str(e),
                'success': False
            }
    
    def _score_sentences(self, sentences: List[str], text: str) -> List[tuple]:
        """
        Score sentences based on importance using multiple factors
        
        Args:
            sentences: List of sentences
            text: Full text for context
            
        Returns:
            List of tuples (sentence, score)
        """
        scored_sentences = []
        
        # Get key phrases for importance scoring
        key_phrases = self._extract_key_phrases(text, top_n=20)
        
        for i, sentence in enumerate(sentences):
            score = 0.0
            sentence_lower = sentence.lower()
            sentence_words = word_tokenize(sentence_lower)
            
            # Factor 1: Position (first and last sentences are often important)
            if i == 0:
                score += 2.0
            elif i == len(sentences) - 1:
                score += 1.5
            elif i < len(sentences) * 0.2:  # First 20%
                score += 1.0
            
            # Factor 2: Length (avoid very short or very long sentences)
            word_count = len(sentence_words)
            if 10 <= word_count <= 25:
                score += 1.5
            elif 8 <= word_count <= 30:
                score += 1.0
            
            # Factor 3: Key phrase density
            phrase_matches = sum(1 for phrase in key_phrases if phrase in sentence_lower)
            score += phrase_matches * 0.8
            
            # Factor 4: Named entities (capitalized words)
            capital_words = [w for w in sentence.split() if w[0].isupper() and len(w) > 1]
            score += len(capital_words) * 0.3
            
            # Factor 5: Numbers and data (often important)
            if re.search(r'\d+', sentence):
                score += 0.5
            
            # Factor 6: Question sentences might be important
            if sentence.endswith('?'):
                score += 0.8
            
            scored_sentences.append((sentence, score))
        
        return scored_sentences

    def summarize_in_bullets(self, text: str, num_points: int = 5) -> Dict[str, Any]:
        """
        Generate structured bullet-point summary using Gemini API
        
        Args:
            text: Input text
            num_points: Number of bullet points
            
        Returns:
            Dictionary with bullet points and metadata
        """
        try:
            # Load model if not loaded
            if not self.model_loaded:
                self.load_model()
            
            text = text.strip()
            if not text:
                return {
                    'bullets': [],
                    'error': 'Empty text provided',
                    'success': False
                }
            
            word_count = len(text.split())
            
            # Create prompt for bullet points
            prompt = f"""Create exactly {num_points} concise bullet points that summarize the key information from the following document.
Each bullet point should:
- Capture a distinct main idea or important fact
- Be clear and self-contained
- Start with a capital letter and end with a period
- Not include bullet markers (no dashes, asterisks, or numbers)

Document:
{text}

Bullet points:"""
            
            print(f"Generating {num_points} bullet points for {word_count} words using Gemini API...")
            
            # Generate bullet points using Gemini
            response = self.model.generate_content(prompt)
            bullets_text = response.text.strip()
            
            # Parse bullet points from response
            bullets = []
            for line in bullets_text.split('\n'):
                line = line.strip()
                if not line:
                    continue
                # Remove any bullet markers
                line = re.sub(r'^[-*•]\s*', '', line)
                line = re.sub(r'^\d+\.\s*', '', line)
                # Capitalize first letter
                if line:
                    line = line[0].upper() + line[1:] if len(line) > 1 else line.upper()
                    # Ensure it ends with period
                    if not line.endswith(('.', '!', '?')):
                        line += '.'
                    bullets.append(line)
            
            # Ensure we have the right number of points
            bullets = bullets[:num_points]
            
            print(f"Generated {len(bullets)} bullet points")
            
            return {
                'bullets': bullets,
                'num_points': len(bullets),
                'original_length': word_count,
                'method': 'gemini_api',
                'key_phrases': self._extract_key_phrases(text, top_n=10),
                'document_structure': self._detect_document_structure(text),
                'success': True
            }
            
        except Exception as e:
            return {
                'bullets': [],
                'error': str(e),
                'success': False
            }
    
    def extract_key_points(self, text: str, top_k: int = 3) -> Dict[str, Any]:
        """
        Extract key points using Gemini API
        
        Args:
            text: Input text
            top_k: Number of key sentences to extract
            
        Returns:
            Dictionary with key points and analysis
        """
        try:
            # Load model if not loaded
            if not self.model_loaded:
                self.load_model()
            
            text = text.strip()
            if not text:
                return {
                    'key_points': [],
                    'error': 'Empty text provided',
                    'success': False
                }
            
            word_count = len(text.split())
            
            # Create prompt for key points extraction
            prompt = f"""Extract exactly {top_k} key sentences from the following document that capture the most important information.
Return only the sentences exactly as they appear in the document, maintaining their original wording.
List them in the order they appear in the document.

Document:
{text}

Key sentences:"""
            
            print(f"Extracting {top_k} key points from {word_count} words using Gemini API...")
            
            # Generate key points using Gemini
            response = self.model.generate_content(prompt)
            key_points_text = response.text.strip()
            
            # Parse key points from response
            key_points = []
            for line in key_points_text.split('\n'):
                line = line.strip()
                if not line:
                    continue
                # Remove any numbering or bullet markers
                line = re.sub(r'^[-*•]\s*', '', line)
                line = re.sub(r'^\d+\.\s*', '', line)
                if line:
                    key_points.append(line)
            
            # Ensure we have the right number of points
            key_points = key_points[:top_k]
            
            print(f"Extracted {len(key_points)} key points")
            
            return {
                'key_points': key_points,
                'num_points': len(key_points),
                'original_length': word_count,
                'method': 'gemini_api',
                'key_phrases': self._extract_key_phrases(text, top_n=8),
                'success': True
            }
            
        except Exception as e:
            return {
                'key_points': [],
                'error': str(e),
                'success': False
            }
    
    def analyze_document(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive document analysis including structure, topics, and summary
        
        Args:
            text: Input document text
            
        Returns:
            Dictionary with comprehensive analysis
        """
        try:
            if not text or not text.strip():
                return {
                    'error': 'Empty text provided',
                    'success': False
                }
            
            # Get full summary
            summary_result = self.summarize_text(text, max_length=200, min_length=50)
            
            # Get bullet points
            bullets_result = self.summarize_in_bullets(text, num_points=7)
            
            # Get key points
            key_points_result = self.extract_key_points(text, top_k=5)
            
            # Additional analysis
            sentences = sent_tokenize(text)
            words = word_tokenize(text)
            
            # Reading time estimate (average 200 words per minute)
            reading_time_minutes = len(words) / 200
            
            return {
                'summary': summary_result.get('summary', ''),
                'bullet_points': bullets_result.get('bullets', []),
                'key_points': key_points_result.get('key_points', []),
                'document_structure': summary_result.get('document_structure', {}),
                'key_phrases': summary_result.get('key_phrases', []),
                'statistics': {
                    'total_words': len(words),
                    'total_sentences': len(sentences),
                    'total_characters': len(text),
                    'avg_sentence_length': round(len(words) / len(sentences), 2) if sentences else 0,
                    'estimated_reading_time_minutes': round(reading_time_minutes, 1)
                },
                'compression_ratio': summary_result.get('compression_ratio', 0),
                'chunks_processed': summary_result.get('chunks_processed', 1),
                'success': True
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'success': False
            }

# Global instance - lazy initialization, no blocking operations at import time
summarization_service = SummarizationService()
