# Quick Start - ML Service

## ⚡ Quick Commands

### First Time Setup (One-time only)
```bash
cd Desktop/ALLprojects/fileshare/ml-service
.\venv\Scripts\python.exe download_models.py
```

### Start ML Service (Every time)
```bash
cd Desktop/ALLprojects/fileshare/ml-service
.\venv\Scripts\python.exe main.py
```

## ✅ Expected Output

When starting the service, you should see:
```
🚀 Starting ML Service...
✅ ML Service ready!
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

## 🔍 Test It's Working

Open a new terminal and run:
```bash
curl http://localhost:8001/health
```

Expected response:
```json
{"status":"healthy","service":"ml-service","version":"1.0.0"}
```

## 🚨 Troubleshooting

### Error: "No module named 'sentence_transformers'"
**Fix:** Make sure you're using the venv Python:
```bash
.\venv\Scripts\python.exe main.py
```

### Error: "Model not found"
**Fix:** Download models first:
```bash
.\venv\Scripts\python.exe download_models.py
```

### Port already in use
**Fix:** Kill the existing process or use a different port:
```bash
# Find process on port 8001
netstat -ano | findstr :8001
# Kill it (replace XXXX with PID)
taskkill /PID XXXX /F
```

## 📝 Important Notes

1. **Always use venv Python** - `.\venv\Scripts\python.exe`
2. **Models are cached** - First load takes longer, then it's fast
3. **Restart if needed** - Ctrl+C to stop, then restart
4. **Check logs** - All errors are printed to console

## 🎯 What This Service Does

- ✅ Semantic file search (search by meaning, not just keywords)
- ✅ PII detection (find sensitive information)
- ✅ OCR (extract text from images/PDFs)
- ✅ File summarization (generate summaries)
- ✅ Auto-categorization (smart file organization)

## 🔗 Related Services

Make sure these are also running:

**Backend (Port 5000):**
```bash
cd Desktop/ALLprojects/fileshare/backend
npm run dev
```

**Frontend (Port 5173):**
```bash
cd Desktop/ALLprojects/fileshare/frontend
npm run dev
```

---

**Pro Tip:** Keep this terminal open while using the app. You can see real-time logs of ML operations!
