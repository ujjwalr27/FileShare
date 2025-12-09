# Supabase Storage Setup - Complete Guide

## ✅ What I've Done

### 1. **Installed Supabase Client**
```bash
npm install @supabase/supabase-js
```

### 2. **Created New Files**
- `backend/src/config/supabase.ts` - Supabase client configuration
- `backend/src/services/storageService.ts` - File upload/download/delete service

### 3. **Updated Existing Files**
- `backend/src/config/index.ts` - Added `useSupabaseStorage` config option
- `backend/src/services/fileService.ts` - Updated upload & delete to support Supabase
- `backend/src/controllers/fileController.ts` - Updated download to support Supabase

## 🔧 How It Works

### **Upload Flow:**
1. User uploads file → multer saves to temp local directory
2. If `USE_SUPABASE_STORAGE=true`:
   - File is uploaded to Supabase Storage bucket
   - Local temp file is deleted
   - Database stores Supabase path (e.g., `userId/filename.pdf`)
3. If `USE_SUPABASE_STORAGE=false`:
   - File stays in local `uploads/` directory
   - Database stores local path

### **Download Flow:**
1. User requests file download
2. If `USE_SUPABASE_STORAGE=true`:
   - Download file buffer from Supabase
   - Stream to user
3. If `USE_SUPABASE_STORAGE=false`:
   - Serve from local disk

### **Delete Flow:**
1. User deletes file
2. If `USE_SUPABASE_STORAGE=true`:
   - Delete from Supabase Storage
3. If `USE_SUPABASE_STORAGE=false`:
   - Delete from local disk

## 📦 Supabase Setup Steps

### **Step 1: Create Storage Bucket**

1. Go to your Supabase project: https://supabase.com/dashboard

2. Navigate to **Storage** (left sidebar)

3. Click **"Create bucket"**
   - Bucket name: `uploads`
   - Public bucket: **No** (keep private)
   - Click **"Create bucket"**

### **Step 2: Set Bucket Policies (Important!)**

By default, the bucket is completely locked down. You need to add policies:

1. Click on the `uploads` bucket

2. Go to **"Policies"** tab

3. Click **"New Policy"**

4. **Policy for Upload** (INSERT):
   ```sql
   -- Policy name: Enable insert for authenticated users
   CREATE POLICY "Enable insert for authenticated users"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

5. **Policy for Download** (SELECT):
   ```sql
   -- Policy name: Enable read for own files
   CREATE POLICY "Enable read for own files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

6. **Policy for Delete** (DELETE):
   ```sql
   -- Policy name: Enable delete for own files
   CREATE POLICY "Enable delete for own files"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

⚠️ **Note:** These policies use Supabase Auth. Since your app uses custom JWT auth, we'll use the **service role key** instead (see below).

### **Step 3: Get Supabase Credentials**

1. Go to **Project Settings** → **API**

2. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (different long string)

3. **Use service_role key** (not anon key) since you're bypassing Supabase Auth

### **Step 4: Update Environment Variables**

Update your `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Supabase Storage
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=your-service-role-key-here  # Use service_role, not anon!
USE_SUPABASE_STORAGE=true

# These are still needed for multer temp storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600

# ... rest of your env vars
```

### **Step 5: For Render Deployment**

Add these environment variables in Render dashboard:

**Backend Service:**
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=your-service-role-key
USE_SUPABASE_STORAGE=true
UPLOAD_DIR=/tmp/uploads
MAX_FILE_SIZE=104857600
```

Note: On Render, use `/tmp/uploads` for temp files (they're auto-cleaned)

## 🧪 Testing Locally

### **1. Start backend with Supabase Storage**

```bash
cd backend

# Create .env with Supabase credentials
# USE_SUPABASE_STORAGE=true

npm run dev
```

### **2. Test file upload**

```bash
# Register/login to get JWT token
# Then upload a file

curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test.pdf"
```

### **3. Check Supabase Storage**

Go to Storage → uploads bucket → You should see: `userId/filename.pdf`

### **4. Test file download**

```bash
curl -X GET http://localhost:5000/api/files/download/FILE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output downloaded.pdf
```

## 🔄 Migration Strategy

### **Option A: Fresh Deployment (Recommended)**

- Set `USE_SUPABASE_STORAGE=true` from the beginning

### **Option B: Migrate Existing Files**
If you already have files in local storage:

```typescript
// Run this migration script once
import { query } from './config/database';
import StorageService from './services/storageService';
import fs from 'fs';

async function migrateToSupabase() {
  const result = await query('SELECT * FROM files WHERE is_deleted = false');
  
  for (const file of result.rows) {
    if (fs.existsSync(file.path)) {
      try {
        // Upload to Supabase
        const buffer = fs.readFileSync(file.path);
        const newPath = `${file.user_id}/${path.basename(file.path)}`;
        
        await supabase.storage
          .from('uploads')
          .upload(newPath, buffer, { contentType: file.mime_type });
        
        // Update database
        await query('UPDATE files SET path = $1 WHERE id = $2', [newPath, file.id]);
        
        console.log(`Migrated: ${file.original_name}`);
      } catch (error) {
        console.error(`Failed to migrate ${file.original_name}:`, error);
      }
    }
  }
}
```

## 📊 Storage Limits

### **Supabase Free Tier:**
- ✅ 1GB storage
- ✅ 2GB bandwidth/month
- ✅ 50MB max file size (configurable up to 5GB on pro)



## 🔐 Security Note

**Important:** We're using the `service_role` key which bypasses Row Level Security (RLS). This is okay because:

1. Your backend already has authentication/authorization
2. Backend validates user permissions before storage operations
3. service_role key is never exposed to frontend

**Never expose service_role key in frontend code!**

## ✅ Deployment Checklist

- [ ] Supabase bucket `uploads` created
- [ ] Bucket policies configured (or using service_role key)
- [ ] SUPABASE_URL and SUPABASE_KEY copied
- [ ] Backend .env updated with Supabase credentials
- [ ] USE_SUPABASE_STORAGE=true set
- [ ] Tested upload locally
- [ ] Tested download locally
- [ ] Tested delete locally
- [ ] Ready to deploy to Render!

## 🚀 Final Deployment

Now you can deploy with permanent file storage:

1. Push code to GitHub
2. Deploy to Render (backend + ML)
3. Add Supabase env vars in Render
4. Deploy to Vercel (frontend)
5. Files will be stored permanently in Supabase! 🎉

## 💡 Pro Tips

1. **File Organization**: Files are organized by userId: `uploads/user-id-1/file.pdf`
2. **Signed URLs**: For temporary public access, use `StorageService.getSignedUrl()`
3. **Direct Upload**: For large files, consider direct browser → Supabase upload
4. **Monitoring**: Check Supabase dashboard → Storage for usage stats

## 🐛 Troubleshooting

### "Error: Invalid JWT"
- Make sure you're using `service_role` key, not `anon` key
- Check SUPABASE_KEY is set correctly

### "Row Level Security policy violation"
- Using `service_role` key bypasses RLS
- If using `anon` key, you need proper RLS policies

### "File not found" on download
- Check file path in database matches Supabase storage path
- Verify file exists in Supabase Storage dashboard

### Files not uploading
- Check bucket name is `uploads`
- Verify SUPABASE_URL and SUPABASE_KEY are correct
- Check Supabase logs in dashboard
