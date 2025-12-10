# ML Service Render Deployment Fix

## Problem
ML Service deployment on Render failing with:
```
==> Running 'sh -lc "cd ml-service && gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:${PORT:-8000} --workers
sh: 1: gunicorn: not found
==> Exited with status 127
```

## Root Causes
1. **Render Dashboard Override**: Render was using cached/dashboard settings that override `render.yaml`
2. **Malformed gunicorn command**: The command had incomplete `--workers` flag
3. **Priority Issue**: `render.yaml` startCommand wasn't being used

## Solutions Applied

### Fix 1: Created Procfile (Highest Priority)
Created `ml-service/Procfile` which Render prioritizes over `render.yaml`:

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
```

**Why this works:**
- Render uses Procfile > Dashboard Settings > render.yaml (in that order)
- Simple uvicorn command without gunicorn wrapper
- `--workers 1` is optimal for free tier (512MB RAM)

### Fix 2: Verified render.yaml
Ensured `render.yaml` has the correct startCommand:

```yaml
startCommand: cd ml-service && python -m uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
```

### Fix 3: Verified Dependencies
Confirmed `requirements.txt` has all needed packages:
- ✅ uvicorn[standard]==0.24.0
- ✅ gunicorn==20.1.0 (for alternative deployment)
- ✅ fastapi==0.115.0

## Deployment Steps

### Option 1: Deploy with Procfile (Recommended)
1. Commit the changes:
   ```bash
   git add ml-service/Procfile
   git commit -m "Add Procfile for ML service deployment"
   git push
   ```

2. Render will automatically redeploy using the Procfile

### Option 2: Clear Render Dashboard Settings
If Procfile doesn't work, manually clear the dashboard settings:

1. Go to Render Dashboard → fileshare-ml-service
2. Go to "Settings" → "Build & Deploy"
3. **Clear the Start Command field** (leave it blank)
4. Save changes
5. Trigger manual deploy

This forces Render to use either Procfile or render.yaml

### Option 3: Manual Redeploy
1. Go to Render Dashboard
2. Find `fileshare-ml-service`
3. Click "Manual Deploy" → "Clear build cache & deploy"

## File Structure
```
ml-service/
├── Procfile                 ← NEW: Highest priority startup command
├── main.py                  ← FastAPI app definition
├── requirements.txt         ← All dependencies including uvicorn
├── runtime.txt             ← Python 3.11
└── app/
    ├── routes/             ← API endpoints
    └── services/           ← ML models
```

## Testing After Deployment

### 1. Check Deployment Logs
Look for:
```
==> Running 'uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1'
==> Uvicorn running on http://0.0.0.0:10000
==> Your service is live 🎉
```

### 2. Test Root Endpoint
```bash
curl https://fileshare-ml-service.onrender.com/
```

Expected response:
```json
{
  "service": "FileShare ML Service",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "/health",
    "categorization": "/api/categorization",
    "semantic_search": "/api/semantic-search",
    "pii_detection": "/api/pii",
    "ocr": "/api/ocr",
    "summarization": "/api/summarization"
  }
}
```

### 3. Test Health Endpoint
```bash
curl https://fileshare-ml-service.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ml-service",
  "version": "1.0.0"
}
```

## Understanding Render's Command Priority

1. **Procfile** (Highest priority) ← We added this
2. **Dashboard Start Command** (Overrides render.yaml if set)
3. **render.yaml startCommand** (Used if above are not set)
4. **Auto-detection** (Render guesses based on language/framework)

## Troubleshooting

### Issue: Still using gunicorn
**Solution:** 
- Ensure Procfile is committed and pushed
- Clear Render's build cache
- Check Render dashboard start command is empty

### Issue: Port binding timeout
**Solution:**
- Verify $PORT environment variable is available
- Check logs for "Uvicorn running on..."
- Ensure no errors during model loading

### Issue: Memory errors on free tier
**Solution:**
- Keep `--workers 1` (don't increase)
- Consider using lighter ML models
- Check ModelManager initialization

### Issue: Models not loading
**Solution:**
- Verify build command includes: `python -m spacy download en_core_web_sm`
- Check MODEL_CACHE_DIR is set correctly
- Ensure all model dependencies are in requirements.txt

## Alternative: Using Gunicorn with Uvicorn Workers
If you need gunicorn (for production with multiple workers):

**Procfile:**
```
web: gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

**Note:** Multiple workers not recommended for free tier (512MB RAM limit)

## Files Modified
- ✅ `ml-service/Procfile` - Created
- ✅ `ml-service/main.py` - Already has root endpoint
- ✅ `render.yaml` - Already updated with correct command

## Quick Deploy Command
```bash
cd Desktop/ALLprojects/fil
git add ml-service/Procfile
git commit -m "Fix ML service deployment with Procfile"
git push origin main
```

Monitor deployment at: https://dashboard.render.com
