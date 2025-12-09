# Quick Start Guide - FileShare with ML Features

Get your FileShare application running in 5 minutes!

## Prerequisites

- Node.js 16+ ([Download](https://nodejs.org/))
- PostgreSQL 12+ ([Download](https://www.postgresql.org/download/))
- Python 3.8+ ([Download](https://www.python.org/downloads/))
- Git

## Step 1: Database Setup (2 minutes)

```bash
# Create database
createdb fileshare

# Run migrations
psql fileshare < database/migrations/001_initial_schema.sql
```

## Step 2: Backend Setup (1 minute)

```bash
cd backend
npm install
cp .env.example .env
```

**Edit `.env` file** - Update these lines:
```env
DB_PASSWORD=your_postgres_password
JWT_SECRET=change_this_to_a_random_secret_key
```

Start backend:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

## Step 3: Frontend Setup (1 minute)

**Open a new terminal:**
```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

## Step 4: ML Service Setup (Optional - 2 minutes)

**Open a new terminal:**
```bash
cd ml-service
python -m venv venv
```

**Activate virtual environment:**
- Windows: `venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

**Install dependencies:**
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
/pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
cp .env.example .env
```

**Start ML service:**
```bash
python main.py
```

ML service will run on `http://localhost:8001`

## Step 5: Access the Application

Open your browser and go to: **http://localhost:5173**

### Create Your First Account

1. Click "Register"
2. Enter your details:
   - Name: Your Name
   - Email: your@email.com
   - Password: (secure password)
3. Click "Create Account"

### Upload Your First File

1. Login with your credentials
2. Click "Upload File" button
3. Select a file from your computer
4. File will appear in your dashboard

### Try Folder Management

1. Click "New Folder" button
2. Enter folder name
3. Click on folder to navigate
4. Upload files to folders
5. Use breadcrumb to navigate back

### Share a File

1. Click the share icon (🔗) next to any file
2. Optionally set:
   - Password protection
   - Expiration time (in hours)
   - Download limit
3. Click "Create Share Link"
4. Copy the link and share it!

### Try ML Features (if ML service is running)

The ML features work automatically in the background:

1. **Auto-Categorization**: Files are automatically categorized when uploaded
2. **PII Detection**: Sensitive files are flagged
3. **Semantic Search**: Search with natural language (coming soon in UI)

## Verify Everything is Working

### Check Backend
```bash
curl http://localhost:5000/health
```
Should return: `{"status":"ok",...}`

### Check Frontend
Open `http://localhost:5173` - Should see login page

### Check ML Service (Optional)
```bash
curl http://localhost:8001/health
```
Should return: `{"status":"healthy",...}`

## Quick Test Workflow

1. **Register** → Create account
2. **Upload** → Upload a PDF file
3. **Organize** → Create folder, move file
4. **Share** → Create share link with password
5. **Access** → Open share link in incognito window

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running: `pg_ctl status` or `sudo service postgresql status`
- Verify credentials in `backend/.env`
- Ensure database exists: `psql -l | grep fileshare`

### Port Already in Use
- Backend (5000): Change `PORT` in `backend/.env`
- Frontend (5173): Change in `vite.config.ts`
- ML Service (8001): Change in `ml-service/.env`

### ML Service Not Loading Models
- Check internet connection (first-time download)
- Run manually: `python -m spacy download en_core_web_sm`
- Check Python version: `python --version` (need 3.8+)

### Frontend Can't Connect to Backend
- Verify backend is running on port 5000
- Check CORS settings in `backend/src/config/index.ts`
- Clear browser cache and cookies

## Default Storage Quotas

- **Regular Users**: 5GB
- **Admin Users**: 50GB

## API Documentation

- Backend API: Run backend and check console for endpoints
- ML Service API: `http://localhost:8001/docs` (interactive Swagger UI)

## Next Steps

- Read [COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md) for full features list
- Check [ML_SERVICE_SETUP.md](docs/ML_SERVICE_SETUP.md) for ML details
- See [API.md](docs/API.md) for complete API reference

## Running in Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve the 'dist' folder with nginx or similar
```

### ML Service
```bash
cd ml-service
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Stopping Services

Press `Ctrl+C` in each terminal window running the services.

## Need Help?

- Check [COMPLETE_SUMMARY.md](COMPLETE_SUMMARY.md) for comprehensive documentation
- Review [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md) for feature status
- See error logs in each service's terminal

---

**Congratulations!** You now have a fully functional file sharing application with ML features running locally! 🎉
