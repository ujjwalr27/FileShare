"""
Lightweight Model Manager for ML models.
Optimized for Render free tier (512MB RAM limit).
Removes heavy models (Sentence Transformers, spaCy) and uses API-based alternatives.
"""
from __future__ import annotations

import gc
from typing import Optional, Literal


ModelType = Literal["semantic_search", "pii_detection"]


class ModelManager:
    """
    Manages ML models with memory optimization for 512MB RAM constraint.
    Uses lightweight alternatives instead of heavy ML models.
    """

    def __init__(self, init_quick: bool = False):
        """
        Initialize the model manager.
        
        Args:
            init_quick: If True, skip any heavy initialization (for fast startup)
        """
        self.current_model: Optional[str] = None
        self.semantic_model = None  # Not used - semantic search disabled for memory
        self.pii_model = None  # Not used - using regex-based PII detection
        self.is_loaded = True  # Always ready since we don't load heavy models
        
        if not init_quick:
            print("✅ ModelManager initialized (lightweight mode - no heavy models)")

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

        self.current_model = None

    def get_semantic_model(self):
        """
        Get the semantic search model.
        DISABLED: Returns None to save memory. Semantic search falls back to keyword search.
        """
        print("⚠️ Semantic search model disabled (memory optimization for 512MB limit)")
        print("   Falling back to keyword-based search in backend")
        return None

    def get_pii_model(self):
        """
        Get the PII detection model.
        DISABLED: Returns None. PII detection uses regex patterns instead of spaCy.
        """
        print("⚠️ spaCy PII model disabled (memory optimization for 512MB limit)")
        print("   Using regex-based PII detection instead")
        return None

    def load(self):
        """Load models - no-op in lightweight mode."""
        self.is_loaded = True
        print("✅ ModelManager ready (lightweight mode)")

    def cleanup(self):
        """Clean up all models and free memory."""
        print("🧹 Cleaning up models...")
        self._unload_all_models()
        gc.collect()
        print("✅ Cleanup complete")
