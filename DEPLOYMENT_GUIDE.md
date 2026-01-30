# Deployment Guide: Vercel (Frontend) + Render (Backend)

## 🎯 Overview
This guide will help you deploy:
- **Backend**: Express.js server → Render
- **Frontend**: Next.js app → Vercel

---

## ✅ Pre-Deployment Checklist

All code changes have been completed:
- ✅ Frontend now uses `NEXT_PUBLIC_API_URL` environment variable
- ✅ Backend CORS already configured with `CLIENT_ORIGIN`
- ✅ Configuration files created (render.yaml, .env.local, .env.example)
- ✅ .gitignore files properly configured

---

## 📦 Step 1: Push to GitHub

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for deployment: Add environment variable support"
   git push origin main
   ```

2. **Verify** your repository is up to date on GitHub

---

## 🔧 Step 2: Deploy Backend to Render

### A. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### B. Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select your repo: `Gen-AI-T-L-`

### C. Configure Service
Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `gen-ai-backend` (or your choice) |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or your choice) |

### D. Add Environment Variables
Click **"Advanced"** → **"Add Environment Variable"** for each:

```
JWT_SECRET=your_secure_random_key_here
CLIENT_ORIGIN=https://your-app.vercel.app
DEEPSEEK_KEY=your_deepseek_api_key_here
SUPABASE_URL=https://uzcaxtxmkcfjuofgbalw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Y2F4dHhta2NmanVvZmdiYWx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc2NTA4MiwiZXhwIjoyMDgxMzQxMDgyfQ.ysLjh9ZM8zlEKOfbr3d_YjFmt7PuAlvu3lsbBbxG2Pg
RSS_SYNC_ENABLED=true
RSS_SYNC_SCHEDULE=0 2 * * 0
RSS_SINCE_DAYS=7
RSS_TIMEOUT=15000
ARTICLE_OUTPUT_DIR=./temp
EMAIL_FROM=synthora0@gmail.com
PASS=avxy fami xkvw adpo
```

> **Important:** For `CLIENT_ORIGIN`, use a placeholder for now (like `https://temp.vercel.app`). You'll update it after deploying frontend.

### E. Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (3-5 minutes)
3. **Copy your backend URL** (e.g., `https://gen-ai-backend.onrender.com`)

---

## 🚀 Step 3: Deploy Frontend to Vercel

### A. Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### B. Import Project
1. Click **"Add New..."** → **"Project"**
2. Import your `Gen-AI-T-L-` repository
3. Vercel will auto-detect Next.js

### C. Configure Project
Fill in these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `client/client` |
| **Build Command** | `npm run build` (auto-detected) |
| **Output Directory** | `.next` (auto-detected) |

### D. Add Environment Variables
Click **"Environment Variables"** and add:

```
NEXT_PUBLIC_API_URL=https://gen-ai-backend.onrender.com
```
Replace with YOUR actual Render backend URL from Step 2.

### E. Deploy
1. Click **"Deploy"**
2. Wait for deployment (2-3 minutes)
3. **Copy your frontend URL** (e.g., `https://your-app.vercel.app`)

---

## 🔄 Step 4: Update Backend CORS

Now that you have your Vercel URL, update the backend:

1. Go back to **Render Dashboard**
2. Select your `gen-ai-backend` service
3. Go to **"Environment"** tab
4. Find `CLIENT_ORIGIN` variable
5. Update value to your actual Vercel URL: `https://your-app.vercel.app`
6. Click **"Save Changes"**
7. Render will automatically redeploy

---

## ✅ Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Try these actions:
   - Sign up / Login
   - Create a module
   - Add topics
   - Generate quiz
   - Chat functionality

### Common Issues & Fixes

**Issue: "Network error" on login/signup**
- Check: Backend is running (visit `https://your-backend.onrender.com/health`)
- Check: `NEXT_PUBLIC_API_URL` in Vercel matches your Render URL
- Check: `CLIENT_ORIGIN` in Render matches your Vercel URL

**Issue: CORS errors**
- Ensure `CLIENT_ORIGIN` exactly matches your Vercel URL (no trailing slash)
- Wait for Render to redeploy after changing environment variables

**Issue: Backend sleeping (Render Free Tier)**
- Free tier services sleep after 15 minutes of inactivity
- First request may take 30-60 seconds to wake up
- Consider upgrading for always-on service

---

## 🔧 Updating Your App

### To update backend:
```bash
git add .
git commit -m "Update backend"
git push origin main
```
Render will auto-deploy.

### To update frontend:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```
Vercel will auto-deploy.

---

## 📝 Environment Variable Reference

### Backend (Render)
- `JWT_SECRET` - Secret key for JWT tokens
- `CLIENT_ORIGIN` - Your Vercel frontend URL
- `DEEPSEEK_KEY` - AI API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key
- Email & RSS configs

### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL` - Your Render backend URL

---

## 🎉 You're Done!

Your app is now live:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://gen-ai-backend.onrender.com`

Both will auto-deploy on every push to `main` branch.

---

## 💡 Next Steps

1. **Custom Domain** (optional):
   - Add custom domain in Vercel/Render dashboards
   - Update environment variables accordingly

2. **Monitoring**:
   - Check Render logs for backend errors
   - Check Vercel logs for frontend errors

3. **Security**:
   - Rotate `JWT_SECRET` periodically
   - Keep API keys secure
   - Never commit `.env` files

---

## 🆘 Need Help?

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Check deployment logs in respective dashboards
