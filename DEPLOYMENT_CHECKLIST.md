# Quick Deployment Checklist

## ✅ Pre-Deployment (COMPLETED)
- [x] Updated all frontend API calls to use environment variables
- [x] Created `.env.local` and `.env.example` for frontend
- [x] Created `render.yaml` for backend
- [x] Verified .gitignore files
- [x] Backend CORS configured with CLIENT_ORIGIN

---

## 📋 Your Action Items

### 1️⃣ Push to GitHub
```bash
cd c:\Users\keesi\Documents\GitHub\Gen-AI-T-L-
git add .
git commit -m "Prepare for deployment: Environment variables configured"
git push origin main
```

### 2️⃣ Deploy Backend (Render)
- [ ] Sign up at render.com with GitHub
- [ ] Create new Web Service
- [ ] Connect Gen-AI-T-L- repository
- [ ] Set Root Directory: `server`
- [ ] Set Build Command: `npm install`
- [ ] Set Start Command: `npm start`
- [ ] Add environment variables (see DEPLOYMENT_GUIDE.md)
- [ ] Deploy and copy backend URL: `_______________________________`

### 3️⃣ Deploy Frontend (Vercel)
- [ ] Sign up at vercel.com with GitHub
- [ ] Import Gen-AI-T-L- repository
- [ ] Set Root Directory: `client/client`
- [ ] Add environment variable: `NEXT_PUBLIC_API_URL` = (your Render URL)
- [ ] Deploy and copy frontend URL: `_______________________________`

### 4️⃣ Update Backend CORS
- [ ] Go to Render dashboard
- [ ] Update `CLIENT_ORIGIN` to your Vercel URL
- [ ] Save and wait for redeploy

### 5️⃣ Test
- [ ] Visit your Vercel URL
- [ ] Test signup/login
- [ ] Test creating module
- [ ] Test chat and quiz features

---

## 🔑 Environment Variables to Set

### Render (Backend)
Copy these from your .env file:
```
JWT_SECRET=change_this_to_a_random_secure_key
CLIENT_ORIGIN=(your Vercel URL - add after Step 3)
DEEPSEEK_KEY=your_deepseek_api_key_here
SUPABASE_URL=https://uzcaxtxmkcfjuofgbalw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=(your key from .env)
RSS_SYNC_ENABLED=true
RSS_SYNC_SCHEDULE=0 2 * * 0
RSS_SINCE_DAYS=7
RSS_TIMEOUT=15000
ARTICLE_OUTPUT_DIR=./temp
EMAIL_FROM=synthora0@gmail.com
PASS=avxy fami xkvw adpo
```

### Vercel (Frontend)
```
NEXT_PUBLIC_API_URL=(your Render backend URL from Step 2)
```

---

## 📱 Your URLs
After deployment, record your URLs here:

- **Frontend (Vercel):** https://________________________________
- **Backend (Render):** https://________________________________

---

## 🆘 Quick Troubleshooting

**Problem:** Network errors on login
**Fix:** Check `NEXT_PUBLIC_API_URL` in Vercel and `CLIENT_ORIGIN` in Render

**Problem:** CORS errors
**Fix:** Ensure both URLs match exactly (no trailing slashes)

**Problem:** Backend not responding
**Fix:** Render free tier sleeps - first request takes 30-60 seconds

---

See DEPLOYMENT_GUIDE.md for detailed instructions!
