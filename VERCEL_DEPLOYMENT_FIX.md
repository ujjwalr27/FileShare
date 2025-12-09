# Vercel Frontend Deployment Fix

## ❌ Error
```
sh: line 1: cd: frontend: No such file or directory
Error: Command "cd frontend && npm install && npm run build" exited with 1
```

## Why It Happened

Vercel's build process already changes to the **Root Directory** you specified in the project settings. When the build command runs, it's already inside `frontend/`, so running `cd frontend` again fails.

## ✅ Two Ways to Fix

### **Option 1: Fix in Vercel Dashboard (EASIEST)**

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **General**
4. Under **Build & Development Settings**:
   - **Root Directory**: `frontend` (leave as is)
   - **Build Command**: Change to `npm run build` (remove the `cd frontend &&` part)
   - **Output Directory**: `dist` (not `frontend/dist`)
5. Click **Save**
6. Go to **Deployments** → Click **Redeploy**

### **Option 2: Update vercel.json (Already Done)**

I've already updated `vercel.json` to fix this. You need to:

1. **Push the changes:**
   ```bash
   cd Desktop/ALLprojects/fil
   git add vercel.json
   git commit -m "Fix Vercel build command"
   git push
   ```

2. **Redeploy in Vercel:**
   - Go to Vercel Dashboard
   - Click **Redeploy**

## 📝 Correct Configuration

**In Vercel Dashboard:**
```
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**OR in vercel.json:**
```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## 🎯 How Vercel Build Works

```
1. Vercel clones your repo
2. Changes to Root Directory (frontend/)
3. Runs Install Command (npm install)
4. Runs Build Command (npm run build) ← Already in frontend/
5. Looks for Output Directory (dist/)
6. Deploys dist/ folder
```

## ⚡ Quick Fix Steps

**Easiest way:**
1. Vercel Dashboard → Your Project → Settings
2. Build & Development Settings → Edit
3. Build Command: `npm run build` (remove `cd frontend &&`)
4. Output Directory: `dist`
5. Save
6. Deployments → Redeploy

**Should see:**
```
✓ Installing dependencies
✓ Running build command
✓ Build completed
✓ Deployment ready
```

## 🐛 Common Issues

### "Cannot find package.json"
- Make sure Root Directory is set to `frontend`

### "Build failed: vite command not found"
- Install command should be `npm install` (not `npm ci`)
- Make sure package.json is in frontend/ folder

### "Cannot find dist folder"
- Output Directory should be `dist` (not `frontend/dist`)
- The path is relative to Root Directory

## ✅ Final Configuration

**Vercel Project Settings:**
```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node Version: 18.x (or 20.x)
```

**Environment Variables:**
```
VITE_API_URL=https://fileshare-backend.onrender.com
```

After fixing, redeploy and it should work!
