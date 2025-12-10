"""
Script to pre-download all required ML models.
Run this before starting the ML service for the first time.
"""

import os
import sys

def download_models():
    """Download all required models."""
    print("=" * 60)
    print("ML Models Download Script")
    print("=" * 60)
    
    # Create cache directory
    cache_dir = os.path.join(os.getcwd(), 'models', 'sentence-transformers')
    os.makedirs(cache_dir, exist_ok=True)
    print(f"\n📁 Cache directory: {cache_dir}")
    
    # 1. Download Sentence Transformer model
    print("\n1️⃣ Downloading Sentence Transformer model...")
    print("   Model: all-MiniLM-L6-v2 (~80MB)")
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(
            'all-MiniLM-L6-v2',
            device='cpu',
            cache_folder=cache_dir
        )
        print("   ✅ Sentence Transformer model downloaded successfully!")
        del model
    except Exception as e:
        print(f"   ❌ Error downloading Sentence Transformer: {str(e)}")
        print("   Make sure you have internet connection and sentence-transformers installed.")
        return False
    
    # 2. Download spaCy model
    print("\n2️⃣ Downloading spaCy model for PII detection...")
    print("   Model: en_core_web_sm (~13MB)")
    try:
        import spacy
        try:
            # Try to load first
            nlp = spacy.load("en_core_web_sm")
            print("   ✅ spaCy model already installed!")
        except OSError:
            # Download if not available
            print("   📦 Downloading spaCy model...")
            import subprocess
            result = subprocess.run(
                [sys.executable, "-m", "spacy", "download", "en_core_web_sm"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print("   ✅ spaCy model downloaded successfully!")
            else:
                print(f"   ❌ Error downloading spaCy model: {result.stderr}")
                return False
    except Exception as e:
        print(f"   ❌ Error with spaCy: {str(e)}")
        return False
    
    # 3. Download NLTK data for summarization
    print("\n3️⃣ Downloading NLTK data for summarization...")
    try:
        import nltk
        print("   📦 Downloading punkt tokenizer...")
        nltk.download('punkt', quiet=True)
        print("   📦 Downloading stopwords...")
        nltk.download('stopwords', quiet=True)
        print("   ✅ NLTK data downloaded successfully!")
    except Exception as e:
        print(f"   ❌ Error downloading NLTK data: {str(e)}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All models downloaded successfully!")
    print("=" * 60)
    print("\nYou can now start the ML service with: python main.py")
    return True

if __name__ == "__main__":
    print("\n")
    success = download_models()
    print("\n")
    
    if not success:
        print("❌ Model download failed. Please check the errors above.")
        sys.exit(1)
    else:
        print("🎉 Setup complete! ML service is ready to use.")
        sys.exit(0)
