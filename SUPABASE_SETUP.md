# Supabase Setup Guide

## Why Supabase?
- ✅ Free PostgreSQL database (forever, no 90-day limit)
- ✅ 500MB database storage
- ✅ 2GB file storage
- ✅ Built-in file storage (alternative to local uploads)
- ✅ Auto-backups
- ✅ SQL editor for running migrations

## Step 1: Create Supabase Project

1. **Go to**: https://supabase.com/

2. **Sign up/Login** (free account)

3. **Click "New Project"**
   - Name: `fileshare`
   - Database Password: (create a strong password - SAVE THIS!)
   - Region: Choose closest to you
   - Pricing Plan: Free
   - Click "Create new project"
   - Wait ~2 minutes for database to initialize

4. **Get Connection Details**
   - Go to Project Settings (⚙️ icon) → Database
   - Scroll to "Connection string" → URI
   - Copy the connection string (it looks like):
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with your actual password

## Step 2: Run Database Migrations

### Option A: Using SQL Editor (Easiest)

1. **Go to SQL Editor** (left sidebar)

2. **Click "New query"**

3. **Run migration 001** - Copy entire content from `database/migrations/001_initial_schema.sql` and click "Run"

4. **Run migration 002** - Copy entire content from `database/migrations/002_fix_shares_table.sql` and click "Run"

5. **Run migration 003** - Copy entire content from `database/migrations/003_fix_storage_used.sql` and click "Run"

6. **Verify** - Go to "Table Editor" → You should see all tables (users, files, folders, etc.)

### Option B: Using psql Command Line

```bash
# Install psql if not already installed
# Windows: https://www.postgresql.org/download/windows/

# Connect to Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"

# Run migrations
\i database/migrations/001_initial_schema.sql
\i database/migrations/002_fix_shares_table.sql
\i database/migrations/003_fix_storage_used.sql

# Exit
\q
```

## Step 3: Configure Backend

### Update backend/.env
```env
NODE_ENV=production
PORT=5000

# Supabase Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# JWT
JWT_SECRET=your-secret-key-change-this-to-random-string
JWT_EXPIRES_IN=7d

# Upload (Local storage or use Supabase Storage)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600

# CORS (Your Vercel frontend URL)
CORS_ORIGIN=https://your-app.vercel.app

# ML Service (Your Render ML service URL)
ML_SERVICE_URL=https://fileshare-ml-service.onrender.com
ML_SERVICE_ENABLED=true
```

## Step 4: Update Render Configuration

Update `render.yaml`:

```yaml
services:
  # Backend API (No database service needed)
  - type: web
    name: fileshare-backend
    env: node
    plan: free
    region: oregon
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: DATABASE_URL
        sync: false  # Add manually in Render dashboard
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 7d
      - key: UPLOAD_DIR
        value: /opt/render/project/src/uploads
      - key: MAX_FILE_SIZE
        value: 104857600
      - key: CORS_ORIGIN
        sync: false
      - key: ML_SERVICE_URL
        sync: false
      - key: ML_SERVICE_ENABLED
        value: true
    
  # ML Service
  - type: web
    name: fileshare-ml-service
    env: python
    plan: free
    region: oregon
    buildCommand: cd ml-service && pip install -r requirements.txt && python -m spacy download en_core_web_sm
    startCommand: cd ml-service && uvicorn main:app --host 0.0.0.0 --port 8001
    envVars:
      - key: PORT
        value: 8001
      - key: GEMINI_API_KEY
        sync: false
      - key: MODEL_CACHE_DIR
        value: /opt/render/project/src/ml-service/models
```

## Step 5: Optional - Use Supabase Storage for Files

Instead of storing files on Render (ephemeral), use Supabase Storage:

### Enable Storage in Supabase

1. Go to Storage (left sidebar)
2. Click "Create bucket"
3. Name: `uploads`
4. Public bucket: `No` (private)
5. Click "Create bucket"

### Get Storage Credentials

1. Go to Project Settings → API
2. Copy:
   - Project URL: `https://xxxxx.supabase.co`
   - Project API Key: `anon` key

### Install Supabase Client (Backend)

```bash
cd backend
npm install @supabase/supabase-js
```

### Update backend/.env

```env
# Add these
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key
USE_SUPABASE_STORAGE=true
```

I can create the Supabase storage integration code if you want!

## Connection String Format

Your Supabase connection string should look like:
```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Or the direct connection:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

Use the direct connection (port 5432) for better compatibility.

## Test Connection Locally

```bash
cd backend
npm run dev
# Should see: "✅ Database connected successfully"
```

## Deployment Checklist

- [ ] Supabase project created
- [ ] Database password saved
- [ ] All 3 migrations run successfully
- [ ] Tables visible in Supabase Table Editor
- [ ] DATABASE_URL copied
- [ ] Backend .env updated with DATABASE_URL
- [ ] Connection tested locally
- [ ] Ready to deploy to Render!

## Supabase Free Tier Limits

- ✅ 500MB database storage
- ✅ 2GB file storage (if using Supabase Storage)
- ✅ 50,000 monthly active users
- ✅ 500MB bandwidth/month
- ✅ Unlimited API requests
- ✅ 7-day log retention
- ✅ Community support

More than enough for development and small production apps!

## Next Steps

1. Complete Supabase setup above
2. Update Render services with new DATABASE_URL
3. Deploy to Render + Vercel
4. (Optional) Migrate to Supabase Storage for file uploads
