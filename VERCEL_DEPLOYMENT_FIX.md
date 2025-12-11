# Vercel Deployment Fix - 405 Error

## Problem
Frontend on Vercel was calling `/api/auth/register` on itself instead of the Render backend, causing a 405 error.

## Root Cause
The `api.ts` was using a relative path `baseURL: '/api'` which only works in development with Vite's proxy. In production, it needs to use the full Render backend URL.

## ✅ Fix Applied

### Updated `frontend/src/services/api.ts`:
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',  // ✅ Now uses environment variable
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## 🚀 Vercel Environment Variable Setup

### Step 1: Go to Vercel Dashboard
1. Open your project: https://vercel.com/dashboard
2. Select your `file-share-frontend-six` project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add the Backend URL
Add this environment variable:

**Variable Name:**
```
VITE_API_URL
```

**Value (Replace with your actual Render backend URL):**
```
https://fileshare-backend.onrender.com/api
```

**Important:** Make sure to include `/api` at the end!

### Step 3: Apply to All Environments
- ✅ Production
- ✅ Preview
- ✅ Development

### Step 4: Redeploy
After adding the environment variable:
1. Go to **Deployments** tab
2. Click the **three dots** on the latest deployment
3. Click **Redeploy**
4. Or just push a new commit to trigger auto-deployment

## How It Works Now

### Development (localhost:5173):
- Uses Vite proxy: `baseURL: '/api'` → proxied to `http://localhost:5000`

### Production (Vercel):
- Uses environment variable: `baseURL: 'https://fileshare-backend.onrender.com/api'`
- Direct calls to Render backend ✅

## CORS Configuration

⚠️ **Important:** Make sure your Render backend has the correct CORS_ORIGIN set!

On your Render backend dashboard, verify this environment variable:

```
CORS_ORIGIN=https://file-share-frontend-six.vercel.app
```

If you have a custom domain, add that instead.

## Testing After Deployment

1. Open: https://file-share-frontend-six.vercel.app
2. Try to register a new user
3. Check browser console - the API call should now go to:
   ```
   POST https://fileshare-backend.onrender.com/api/auth/register
   ```
4. Should get 200/201 response instead of 405 ✅

## Verification Checklist

- ✅ `api.ts` updated to use `import.meta.env.VITE_API_URL`
- ⏳ `VITE_API_URL` environment variable added on Vercel
- ⏳ `CORS_ORIGIN` environment variable set on Render backend
- ⏳ Frontend redeployed on Vercel
- ⏳ Test registration/login

## Troubleshooting

### Still getting 405?
- Check Vercel environment variables are saved
- Redeploy after adding env vars
- Clear browser cache

### Getting CORS error?
- Update `CORS_ORIGIN` on Render backend
- Make sure it matches your Vercel URL exactly

### Getting connection refused?
- Check if Render backend is running
- Verify the backend URL is correct
