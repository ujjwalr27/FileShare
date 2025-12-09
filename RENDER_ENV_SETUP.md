# 🔧 Render Environment Variables Setup

## ❌ Current Error

```
Error: getaddrinfo ENOTFOUND db.xxxxx.supabase.co
```

**Cause:** You haven't set the actual Supabase connection string in Render's environment variables.

## ✅ How to Fix

### **Step 1: Get Your Supabase Connection String**

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your `fileshare` project
3. Go to **Project Settings** (gear icon) → **Database**
4. Scroll to **Connection string**
5. Select **URI** tab
6. Copy the connection string (looks like):
   ```
   postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
7. **Replace `[YOUR-PASSWORD]`** with your actual database password

### **Step 2: Set Environment Variables in Render**

#### **For Backend Service:**

1. Go to Render Dashboard: https://dashboard.render.com
2. Click on **fileshare-backend** service
3. Go to **Environment** tab
4. Add/Update these variables:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=your-service-role-key-here
USE_SUPABASE_STORAGE=true
JWT_SECRET=your-random-secret-key-here
CORS_ORIGIN=https://your-app.vercel.app
ML_SERVICE_URL=https://fileshare-ml-service.onrender.com
```

**Where to get each value:**

| Variable | Where to Get It |
|----------|----------------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (URI) |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_KEY` | Supabase → Settings → API → service_role key (NOT anon!) |
| `USE_SUPABASE_STORAGE` | Set to `true` |
| `JWT_SECRET` | Generate random: `openssl rand -base64 32` |
| `CORS_ORIGIN` | Your Vercel frontend URL (add after Vercel deploy) |
| `ML_SERVICE_URL` | Your Render ML service URL |

5. Click **Save Changes**
6. Service will auto-redeploy

#### **For ML Service:**

1. Click on **fileshare-ml-service** service
2. Go to **Environment** tab
3. Add:

```env
GEMINI_API_KEY=your-gemini-api-key
```

**Where to get:**
- Go to https://makersuite.google.com/app/apikey
- Create API key
- Copy and paste

4. Click **Save Changes**
5. Service will auto-redeploy

### **Step 3: Verify Deployment**

**Backend:**
- Wait 2-3 minutes for redeploy
- Check logs for: `✅ Database connected successfully`
- Status should be **Live** (green)

**ML Service:**
- Wait 2-3 minutes for redeploy
- Check logs for service starting on PORT
- Status should be **Live** (green)

## 🔒 Security Notes

**Never commit these to git:**
- ❌ DATABASE_URL with password
- ❌ SUPABASE_KEY (service_role)
- ❌ GEMINI_API_KEY
- ❌ JWT_SECRET

These should ONLY be in Render's environment variables (encrypted and secure).

## 🐛 Troubleshooting

### "Still getting ENOTFOUND"
- Check you replaced `[YOUR-PASSWORD]` in DATABASE_URL
- Check the connection string doesn't have `xxxxx` placeholders
- Try the direct connection string (port 5432) not pooler (port 6543)

### "Connection timeout"
- Your Supabase project might be paused (free tier pauses after 7 days inactivity)
- Go to Supabase dashboard and wake it up

### "Invalid JWT" (Supabase Storage)
- Make sure you're using **service_role** key, not **anon** key
- Check SUPABASE_KEY is set correctly

### "ML service still not starting"
- Check GEMINI_API_KEY is valid
- Try regenerating the key
- Check Render logs for specific error

## ✅ Quick Checklist

Backend:
- [ ] DATABASE_URL set with real Supabase connection
- [ ] Password replaced (no [YOUR-PASSWORD])
- [ ] SUPABASE_URL set
- [ ] SUPABASE_KEY set (service_role)
- [ ] USE_SUPABASE_STORAGE=true
- [ ] JWT_SECRET generated and set
- [ ] Service redeployed
- [ ] Logs show database connected

ML Service:
- [ ] GEMINI_API_KEY set
- [ ] Service redeployed
- [ ] Logs show service started
- [ ] Status is Live

Frontend (Vercel):
- [ ] VITE_API_URL set to backend URL
- [ ] Deployed successfully

Final:
- [ ] Update backend CORS_ORIGIN with Vercel URL
- [ ] Test the app end-to-end

## 📝 Example (with fake values)

**Backend env vars:**
```env
DATABASE_URL=postgresql://postgres:MySecretPass123@db.abcdefghijklmnop.supabase.co:5432/postgres
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
USE_SUPABASE_STORAGE=true
JWT_SECRET=xK8vN2pQ9mR5tL7wY4uH6jG3fD1sA0zX
CORS_ORIGIN=https://my-fileshare-app.vercel.app
ML_SERVICE_URL=https://fileshare-ml-service.onrender.com
```

**ML Service env vars:**
```env
GEMINI_API_KEY=AIzaSyB1234567890abcdefghijklmnopqrstuvwxyz
```

Replace these with your actual values!
