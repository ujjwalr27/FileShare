# ML Service Setup Guide

## Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Internet connection (for first-time model download)
- ~500MB free disk space for models

## Installation Steps

### 1. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Download ML Models (IMPORTANT!)

Before running the service for the first time, download the required models:

```bash
python download_models.py
```

This will download:
- **Sentence Transformer Model** (all-MiniLM-L6-v2) - ~80MB
- **spaCy NER Model** (en_core_web_sm) - ~13MB  
- **NLTK Data** (punkt, stopwords) - ~5MB

**Expected Output:**
```
============================================================
ML Models Download Script
============================================================

📁 Cache directory: C:\path\to\ml-service\models\sentence-transformers

1️⃣ Downloading Sentence Transformer model...
   Model: all-MiniLM-L6-v2 (~80MB)
   ✅ Sentence Transformer model downloaded successfully!

2️⃣ Downloading spaCy model for PII detection...
   Model: en_core_web_sm (~13MB)
   ✅ spaCy model downloaded successfully!

3️⃣ Downloading NLTK data for summarization...
   ✅ NLTK data downloaded successfully!

============================================================
✅ All models downloaded successfully!
============================================================
```

### 4. Configure Environment

Create/edit `.env` file:

```env
ML_SERVICE_PORT=8001
ML_SERVICE_HOST=0.0.0.0
BACKEND_API_URL=http://localhost:5000
MODEL_CACHE_DIR=./models
ENABLE_GPU=false
LOG_LEVEL=info
```

### 5. Start the Service

```bash
python main.py
```

The service will be available at: http://localhost:8001

## Troubleshooting

### Error: "Model not found" or "not a valid model identifier"

**Solution:** Run the model download script:
```bash
python download_models.py
```

### Error: "No module named 'sentence_transformers'"

**Solution:** Install dependencies:
```bash
pip install -r requirements.txt
```

### Error: "OSError: [E050] Can't find model 'en_core_web_sm'"

**Solution:** Download spaCy model manually:
```bash
python -m spacy download en_core_web_sm
```

### Memory Issues

If you encounter memory issues, try:

1. **Close other applications** to free up RAM
2. **Restart the service** - models are loaded on-demand
3. **Check your system has at least 4GB RAM available**

The service is designed to run on systems with 8GB RAM by:
- Loading only one model at a time
- Unloading unused models automatically
- Using CPU-only models (no GPU required)

## Testing the Service

### Health Check

```bash
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ml-service",
  "version": "1.0.0"
}
```

### Test Semantic Search

```bash
curl -X POST http://localhost:8001/api/semantic-search/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "resume",
    "files": [
      {"id": "1", "name": "john_doe_resume.pdf", "description": ""},
      {"id": "2", "name": "vacation_photo.jpg", "description": ""}
    ],
    "threshold": 0.3,
    "top_k": 5
  }'
```

## API Documentation

Once the service is running, visit:
- **Interactive API Docs**: http://localhost:8001/docs
- **Alternative Docs**: http://localhost:8001/redoc

## Available Features

### 1. Semantic Search (`/api/semantic-search/`)
- `/search` - Search files by meaning
- `/generate-embedding` - Generate text embeddings
- `/generate-tags` - Auto-generate file tags

### 2. PII Detection (`/api/pii/`)
- `/detect` - Detect personally identifiable information
- `/redact` - Redact PII from text

### 3. OCR (`/api/ocr/`)
- `/extract` - Extract text from images and PDFs

### 4. Summarization (`/api/summarization/`)
- `/summarize` - Generate text summaries

### 5. Categorization (`/api/categorization/`)
- `/predict` - Auto-categorize files

## Model Information

### Sentence Transformer (all-MiniLM-L6-v2)
- **Purpose**: Semantic search and similarity matching
- **Size**: ~80MB
- **License**: Apache 2.0
- **Source**: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2

### spaCy (en_core_web_sm)
- **Purpose**: Named Entity Recognition for PII detection
- **Size**: ~13MB
- **License**: MIT
- **Source**: https://spacy.io/models/en#en_core_web_sm

### NLTK
- **Purpose**: Text summarization and processing
- **Size**: ~5MB (data files)
- **License**: Apache 2.0
- **Source**: https://www.nltk.org/

## Production Deployment

For production deployment:

1. **Use a process manager** (e.g., PM2, systemd)
2. **Set up proper logging** (configure LOG_LEVEL)
3. **Use environment variables** for configuration
4. **Add monitoring** (health check endpoints)
5. **Consider horizontal scaling** for high load

Example with PM2:
```bash
pm2 start main.py --name ml-service --interpreter python
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the main project README
3. Check the FastAPI docs at http://localhost:8001/docs
