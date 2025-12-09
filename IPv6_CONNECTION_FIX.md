# IPv6 Connection Issue - Fix

## ❌ Error

```
Error: connect ENETUNREACH 2406:da1a:6b0:f61c:bf9f:3e8:6b5d:cc22:5432 - Local (:::0)
```

## What This Means

- Render is trying to connect to Supabase using **IPv6** address
- IPv6 connection is not reachable (network unreachable)
- Need to force **IPv4** connection instead

## ✅ Solutions (Try in Order)

### **Solution 1: Use Direct Connection (Port 5432) - RECOMMENDED**

Instead of using the pooler connection, use the **direct connection string**:

**In Supabase Dashboard:**
1. Go to Settings → Database
2. Under "Connection string", select **URI** tab
3. Look for **Direct connection** (not Session pooling)
4. Copy the connection string with **port 5432**

**Example:**
```
❌ Bad (pooler - might use IPv6):
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres

✅ Good (direct - IPv4):
postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

**Update in Render:**
- Go to Backend service → Environment
- Update `DATABASE_URL` to use port **5432** (direct connection)
- Save Changes

### **Solution 2: Add IPv4 DNS Preference**

If Solution 1 doesn't work, add Node.js IPv4 preference:

**Update render.yaml:**

```yaml
# Backend API
- type: web
  name: fileshare-backend
  env: node
  plan: free
  region: oregon
  buildCommand: cd backend && npm install && npm run build
  startCommand: cd backend && NODE_OPTIONS='--dns-result-order=ipv4first' npm start
```

This tells Node.js to prefer IPv4 DNS resolution.

### **Solution 3: Use Connection String with IPv4 Host**

If Supabase gives you an IPv6 address, try these alternatives:

**Get IPv4 address manually:**
```bash
# Run locally to get IPv4
nslookup db.xxxxxxxxxxxxx.supabase.co

# Look for the IPv4 address (e.g., 54.123.45.67)
```

**Then use in DATABASE_URL:**
```
postgresql://postgres:[PASSWORD]@54.123.45.67:5432/postgres?sslmode=require
```

### **Solution 4: Change Render Region**

Sometimes specific Render regions have IPv6 issues. Try changing:

**In render.yaml:**
```yaml
region: oregon  # Change to: singapore, frankfurt, or us-east
```

## 🔧 What I Already Fixed in Code

Updated `backend/src/config/database.ts`:
- Increased `connectionTimeoutMillis` to 10000ms (from 2000ms)
- This gives more time for IPv4 fallback if IPv6 fails

## ✅ Recommended Action

**Step 1:** Use Direct Connection (Port 5432)
1. Get direct connection string from Supabase (port 5432, not 6543)
2. Update `DATABASE_URL` in Render
3. Should look like: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
4. Save and redeploy

**Step 2:** If still failing, add IPv4 preference
1. Update code to prefer IPv4 (see Solution 2)
2. Commit and push
3. Render will redeploy

## 🐛 Troubleshooting

### "Still getting IPv6 error"
- Make sure you're using **direct connection** (port 5432)
- Check the host is `db.xxxxx.supabase.co` not `aws-0-xxx.pooler.supabase.com`
- Try adding `?sslmode=require` to the connection string

### "Connection timeout"
- Check Supabase project is active (not paused)
- Try increasing timeout in database config
- Check firewall settings in Supabase (should allow all IPs for free tier)

### "Other network errors"
- Try different Render region
- Contact Render support about IPv6 connectivity
- Consider using Supabase connection pooling service

## 📝 Example Connection Strings

**✅ GOOD (Direct, IPv4):**
```
postgresql://postgres:MyPass123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**❌ BAD (Pooler, might use IPv6):**
```
postgresql://postgres.abcdefghijklmnop:MyPass123@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**✅ GOOD (With SSL mode):**
```
postgresql://postgres:MyPass123@db.abcdefghijklmnop.supabase.co:5432/postgres?sslmode=require
```

## 🎯 Quick Fix Checklist

- [ ] Using direct connection (port 5432, not 6543)
- [ ] Host is `db.xxxxx.supabase.co` not pooler
- [ ] Password is correct (no brackets)
- [ ] SSL is enabled in connection
- [ ] Supabase project is active
- [ ] Connection string updated in Render
- [ ] Service redeployed
- [ ] Check logs for successful connection
