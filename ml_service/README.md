# ML Service

Machine Learning service for FileShare application. Provides intelligent features using lightweight ML models optimized for 8GB RAM systems.

## Features

### 1. File Categorization
- Rule-based categorization by MIME type and extension
- Categories: documents, images, videos, audio, archives, code, spreadsheets, presentations
- Sensitivity detection for files that may contain PII

### 2. Semantic Search
- Intelligent file search based on meaning, not just keywords
- Uses MiniLM-L3-v2 model (17MB)
- Generate embeddings for files
- Auto-generate relevant tags

### 3. PII Detection
- Detect personally identifiable information in text
- Uses spaCy NER model (12MB)
- Pattern matching for emails, phones, SSNs, credit cards
- Risk assessment and security recommendations
- Text redaction capabilities

## Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Setup

1. Navigate to the ml-service directory:
```bash
cd ml-service
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Download spaCy model:
```bash
python -m spacy download en_core_web_sm
```

6. Create .env file:
```bash
cp .env.example .env
```

## Running the Service

Start the ML service:
```bash
python main.py
```

The service will be available at `http://localhost:8001`

API documentation: `http://localhost:8001/docs`

## API Endpoints

### Categorization
- `POST /api/categorization/categorize` - Categorize a single file
- `POST /api/categorization/categorize-batch` - Categorize multiple files

### Semantic Search
- `POST /api/semantic-search/search` - Semantic search across files
- `POST /api/semantic-search/generate-embedding` - Generate text embedding
- `POST /api/semantic-search/generate-tags` - Auto-generate file tags

### PII Detection
- `POST /api/pii/detect` - Detect PII in text
- `POST /api/pii/redact` - Detect and redact PII from text
- `POST /api/pii/assess-sensitivity` - Assess file sensitivity

## Memory Optimization

The ML service uses lazy loading - only one model is loaded at a time:
- Models are loaded on first use
- Switching between features automatically unloads unused models
- Designed for systems with 8GB RAM
- CPU-only operation (no GPU required)

## Model Information

| Feature | Model | Size | Device |
|---------|-------|------|--------|
| Semantic Search | all-MiniLM-L3-v2 | 17MB | CPU |
| PII Detection | en_core_web_sm | 12MB | CPU |
| Categorization | Rule-based | N/A | N/A |

## Integration with Backend

The backend Node.js service communicates with this ML service via HTTP:
- Backend sends requests to ML service endpoints
- ML service processes and returns results
- Asynchronous operation to avoid blocking

## Development

Run with auto-reload:
```bash
uvicorn main:app --reload --port 8001
```

Run tests:
```bash
pytest tests/
```

## Performance Tips

1. First request to each feature will be slower (model loading)
2. Subsequent requests to the same feature are fast
3. Switching features causes model swap (brief delay)
4. For production, consider caching embeddings
5. Batch operations are more efficient than individual calls
