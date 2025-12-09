"""
Model Manager for lazy loading ML models.
Only one model is loaded at a time to optimize memory usage on systems with 8GB RAM.
"""

import gc
from typing import Optional, Literal
from sentence_transformers import SentenceTransformer
import spacy
import torch

ModelType = Literal["semantic_search", "pii_detection"]

class ModelManager:
    """
    Manages ML models with lazy loading and memory optimization.
    Only loads one model at a time to stay within 8GB RAM constraint.
    """

    def __init__(self):
        self.current_model: Optional[str] = None
        self.semantic_model: Optional[SentenceTransformer] = None
        self.pii_model: Optional[spacy.Language] = None

    def _unload_all_models(self):
        """Unload all models to free memory."""
        if self.semantic_model is not None:
            del self.semantic_model
            self.semantic_model = None

        if self.pii_model is not None:
            del self.pii_model
            self.pii_model = None

        # Force garbage collection
        gc.collect()

        # Clear PyTorch cache if available
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        self.current_model = None

    def get_semantic_model(self) -> SentenceTransformer:
        """
        Get the semantic search model (MiniLM-L3-v2).
        Unloads other models if necessary.
        """
        if self.current_model != "semantic_search":
            print("📥 Loading semantic search model...")
            self._unload_all_models()

            try:
                # Load lightweight sentence transformer model (~80MB)
                # Set cache_folder and use local files if available
                import os
                cache_dir = os.path.join(os.getcwd(), 'models', 'sentence-transformers')
                os.makedirs(cache_dir, exist_ok=True)
                
                print(f"Using cache directory: {cache_dir}")
                
                # Use the more common and stable all-MiniLM-L6-v2 model
                self.semantic_model = SentenceTransformer(
                    'all-MiniLM-L6-v2',
                    device='cpu',  # Force CPU usage
                    cache_folder=cache_dir
                )
                self.current_model = "semantic_search"
                print("✅ Semantic search model loaded (all-MiniLM-L6-v2)")
            except Exception as e:
                print(f"❌ Error loading semantic search model: {str(e)}")
                raise Exception(
                    f"Failed to load semantic search model. "
                    f"Please run 'python download_models.py' first to download required models. "
                    f"Original error: {str(e)}"
                )

        return self.semantic_model

    def get_pii_model(self) -> spacy.Language:
        """
        Get the PII detection model (spaCy).
        Unloads other models if necessary.
        """
        if self.current_model != "pii_detection":
            print("📥 Loading PII detection model...")
            self._unload_all_models()

            try:
                # Try to load the model if it's already downloaded
                self.pii_model = spacy.load("en_core_web_sm")
            except OSError:
                # If not downloaded, download it first
                print("📦 Downloading spaCy model (one-time only)...")
                import subprocess
                subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
                self.pii_model = spacy.load("en_core_web_sm")

            self.current_model = "pii_detection"
            print("✅ PII detection model loaded")

        return self.pii_model

    def cleanup(self):
        """Clean up all models and free memory."""
        print("🧹 Cleaning up models...")
        self._unload_all_models()
        print("✅ Cleanup complete")
