# Quick Deployment Checklist

## Setup Order

### 1️⃣ Supabase (10 minutes)

**Database Setup:**
- [ ] Go to https://supabase.com and create account
- [ ] Create new project named "fileshare"
- [ ] Set database password (SAVE IT!)
- [ ] Wait for database to initialize
- [ ] Go to SQL Editor
- [ ] Run migration 001: Copy/paste from `database/migrations/001_initial_schema.sql`
- [ ] Run migration 002: Copy/paste from `database/migrations/002_fix_shares_table.sql`
- [ ] Run migration 003: Copy/paste from `database/migrations/003_fix_storage_used.sql`
- [ ] Go to Settings → Database → Copy connection string (URI format)
- [ ] Replace `[YOUR-PASSWORD]` with your actual password

**Storage Setup:**
- [ ] Go to Storage (left sidebar)
- [ ] Click "Create bucket"
- [ ] Name: `uploads`, Public: No
- [ ] Click "Create bucket"
- [ ] Go to Project Settings → API
- [ ] Copy: Project URL (https://xxxxx.supabase.co)
- [ ] Copy: service_role key (NOT anon key!)

**Connection String Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### 2️⃣ Get Gemini API Key (2 minutes)
- [ ] Go to https://makersuite.google.com/app/apikey
- [ ] Click "Create API Key"
- [ ] Copy the key (starts with `AIza...`)

### 3️⃣ Push to GitHub (2 minutes)
```bash
cd Desktop/ALLprojects/fil
git init
git add .
git commit -m "Initial deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fileshare.git
git push -u origin main
```

### 4️⃣ Deploy to Render (10 minutes)
- [ ] Go to https://dashboard.render.com
- [ ] Sign up/Login with GitHub
- [ ] Click "New +" → "Blueprint"
- [ ] Connect your GitHub repository
- [ ] Render will detect `render.yaml` and create 2 services
- [ ] Wait for services to be created

**Add Environment Variables:**

**Backend Service:**
- [ ] Click on `fileshare-backend` service
- [ ] Go to "Environment" tab
- [ ] Add: `DATABASE_URL` = Your Supabase connection string
- [ ] Add: `SUPABASE_URL` = Your Supabase project URL (e.g., https://xxxxx.supabase.co)
- [ ] Add: `SUPABASE_KEY` = Your Supabase service_role key (from Project Settings → API)
- [ ] Add: `USE_SUPABASE_STORAGE` = `true`
- [ ] Add: `UPLOAD_DIR` = `/tmp/uploads`
- [ ] Add: `ML_SERVICE_URL` = `https://fileshare-ml-service.onrender.com`
- [ ] Add: `CORS_ORIGIN` = (will add after Vercel deployment)
- [ ] Click "Save Changes" (backend will redeploy)

**ML Service:**
- [ ] Click on `fileshare-ml-service` service
- [ ] Go to "Environment" tab
- [ ] Add: `GEMINI_API_KEY` = Your Gemini API key
- [ ] Click "Save Changes" (ML service will redeploy)

**Copy Backend URL:**
- [ ] Copy your backend URL: `https://fileshare-backend.onrender.com`

### 5️⃣ Deploy to Vercel (5 minutes)
- [ ] Go to https://vercel.com
- [ ] Sign up/Login with GitHub
- [ ] Click "Add New" → "Project"
- [ ] Import your GitHub repository
- [ ] Configure:
  - Framework Preset: Vite
  - Root Directory: `frontend`
  - Build Command: `npm run build`
  - Output Directory: `dist`
- [ ] Add Environment Variable:
  - `VITE_API_URL` = Your Render backend URL
- [ ] Click "Deploy"
- [ ] Wait for deployment (~2-3 minutes)
- [ ] Copy your Vercel URL: `https://your-app.vercel.app`

### 6️⃣ Update CORS (1 minute)
- [ ] Go back to Render dashboard
- [ ] Click on `fileshare-backend` service
- [ ] Go to "Environment" tab
- [ ] Update: `CORS_ORIGIN` = Your Vercel URL
- [ ] Click "Save Changes"
- [ ] Wait for backend to redeploy

### 7️⃣ Test Everything! 🎉
- [ ] Visit your Vercel URL
- [ ] Register a new account
- [ ] Login
- [ ] Upload a file
- [ ] Test ML features (OCR, summarization)
- [ ] Create a folder
- [ ] Share a file

## Your URLs

After deployment, save these:

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://fileshare-backend.onrender.com`
- **ML Service**: `https://fileshare-ml-service.onrender.com`
- **Database**: Supabase dashboard

## Troubleshooting

### Backend not connecting to database
- Check DATABASE_URL is correct in Render
- Verify password is correct (no brackets)
- Try the direct connection string (port 5432)

### Frontend can't reach backend
- Check VITE_API_URL in Vercel
- Verify CORS_ORIGIN in Render
- Check backend service is running (not failed)

### First request is slow
- Render free tier sleeps after 15 minutes
- First request takes ~30 seconds to wake up
- This is normal for free tier

### ML features not working
- Verify GEMINI_API_KEY is set correctly
- Check ML_SERVICE_URL in backend
- Review ML service logs in Render

## Cost Summary

- Supabase: **FREE** forever
- Render Backend: **FREE** (with sleep)
- Render ML Service: **FREE** (with sleep)
- Vercel Frontend: **FREE** forever

**Total: $0/month** 🎉

## Keep Services Awake (Optional)

Free tier services sleep after 15 minutes. To keep them awake:

1. **UptimeRobot** (free)
   - Sign up at https://uptimerobot.com
   - Create monitors for:
     - Backend URL every 14 minutes
     - ML Service URL every 14 minutes
   
2. **Or upgrade to paid** ($7/month per service)

## File Storage Note

⚠️ Render's free tier has ephemeral storage. Uploaded files will be deleted when the service restarts.

**Solutions:**
1. Use Supabase Storage (see SUPABASE_SETUP.md)
2. Use AWS S3
3. Use Cloudinary
4. Upgrade to Render's persistent disk

## Next Steps After Deployment

1. Set up custom domain (optional)
2. Configure Supabase Storage for permanent file storage
3. Set up email verification
4. Add monitoring/analytics
5. Enable backups

## Support

If you run into issues:
- Check Render logs: Dashboard → Service → Logs tab
- Check browser console for frontend errors
- Verify all environment variables are set
- Review Supabase logs: Dashboard → Logs
