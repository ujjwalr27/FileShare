# Quick IPv6 Fix - Action Steps

## ❌ Error
```
Error: connect ENETUNREACH 2406:da1a:6b0:f61c:bf9f:3e8:6b5d:cc22:5432
```

**Meaning:** Render's container can't reach IPv6 address. Need IPv4 connection.

## ✅ IMMEDIATE FIX (Choose One)

### Option 1: Use Supabase Connection Pooler (RECOMMENDED)

1. Go to Supabase Dashboard
2. Settings → Database → Connection Pooling
3. Under **Connection string**, select **Transaction** mode
4. Copy the connection string (should have `pooler.supabase.com`)
5. In Render → Backend → Environment:
   ```
   DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
6. **Important:** Make sure the host is `pooler.supabase.com` (with region)
7. Save Changes

### Option 2: Force IPv4 in Connection String

If you're using `db.xxxxx.supabase.co`, that might be resolving to IPv6.

**Add these parameters to force IPv4:**
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?keepalives=1&keepalives_idle=30
```

### Option 3: Use PgBouncer Connection (Most Reliable)

1. Go to Supabase → Settings → Database
2. Under **Connection Pooling**, find the **connection string**
3. Use the **Session** mode connection:
   ```
   postgresql://postgres.xxxxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Update in Render
5. Save

## 🔍 How to Check What You're Currently Using

In Render logs, look for the exact hostname being used. The error shows the IPv6 address, but we need the hostname.

**Common Supabase hostnames:**
- `db.xxxxxxxxxxxxx.supabase.co` - Direct connection (might resolve to IPv6)
- `aws-0-[region].pooler.supabase.com` - Connection pooler (usually IPv4)

## 📝 Example Fixed DATABASE_URL

```bash
# ✅ GOOD - Uses connection pooler (IPv4)
DATABASE_URL=postgresql://postgres.abcdefg:MyPassword123@aws-0-us-west-1.pooler.supabase.com:5432/postgres

# ❌ BAD - Direct connection may use IPv6
DATABASE_URL=postgresql://postgres:MyPassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## ⚡ Quick Test

After updating DATABASE_URL in Render:
1. Save Changes (triggers redeploy)
2. Wait 2-3 minutes
3. Check logs for: `✅ Database connected successfully`

## 🐛 If Still Failing

1. Check the password has no special characters that need URL encoding
2. Try wrapping password in quotes if it has special chars
3. Check Supabase project is not paused (Dashboard shows "Active")
4. Verify network access is allowed (Supabase → Settings → Database → Allow all IPs)

## 🎯 Most Likely Solution

Use **Transaction pooler** from Supabase:
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

This uses IPv4 and works reliably on Render.
