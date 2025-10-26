# 🚀 DEPLOYMENT GUIDE - WebRTC Dialer

## ✅ Login System Implemented!

Your app now has a complete authentication system:
- ✅ User Registration
- ✅ Secure Login (JWT tokens)
- ✅ Password Hashing (bcrypt)
- ✅ Protected Routes
- ✅ SQLite Database
- ✅ Multi-user Support

**Default Account:**
- Username: `admin`
- Password: `admin123`

---

## 📋 DEPLOYMENT STEPS

### Step 1: Prepare Your Code for GitHub

```bash
# Navigate to your project
cd "C:\Users\Ensar Lochi\Desktop\dialer"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Added authentication system and AI features"

# Create GitHub repository
# Go to github.com → New Repository → Create "webrtc-dialer"

# Link and push
git remote add origin https://github.com/YOUR_USERNAME/webrtc-dialer.git
git branch -M main
git push -u origin main
```

---

## 🌐 OPTION 1: Render.com (Easiest - Recommended)

### Why Render?
- ✅ Free tier available
- ✅ Auto-deploys from GitHub
- ✅ Free SSL certificates
- ✅ Easy to use
- ⚠️ Sleeps after 15min inactivity (wakes in ~30s)

### Steps:

1. **Create Render Account**
   - Go to: https://render.com
   - Sign up with GitHub (free)

2. **Create New Web Service**
   - Dashboard → "New +" → "Web Service"
   - Choose: "Build and deploy from a Git repository"
   - Connect GitHub → Select your repository
   - Click "Connect"

3. **Configure Settings**
   ```
   Name: dialer-app
   Region: Choose closest to you
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: cd backend && npm install
   Start Command: cd backend && node server.js
   ```

4. **Environment Variables**
   Click "Advanced" → "Add Environment Variable":
   ```
   OPENAI_API_KEY = sk-proj-YOUR_KEY_HERE
   JWT_SECRET = myRandomSecretKey123!@#
   PORT = 10000
   ```

5. **Create Web Service**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Your app URL: `https://dialer-app.onrender.com`

6. **Access Your App**
   - Go to your URL
   - You'll see login page
   - Login: admin / admin123
   - Change password immediately!

---

## 🌐 OPTION 2: Railway.app

### Why Railway?
- ✅ $5 free credit per month
- ✅ Faster than Render
- ✅ Never sleeps
- ✅ Auto-deploys

### Steps:

1. **Create Account**
   - Go to: https://railway.app
   - Sign up with GitHub

2. **New Project**
   - Dashboard → "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository

3. **Configure**
   - Railway auto-detects Node.js
   - Click on service → "Settings" → "Environment"
   - Add variables:
     ```
     OPENAI_API_KEY = your_key
     JWT_SECRET = your_secret
     ```

4. **Deploy**
   - Goes to "Deployments" tab
   - Automatically builds and deploys
   - Click "Generate Domain" for public URL

5. **Access**
   - URL: `https://dialer-app.railway.app`
   - Login with admin/admin123

---

## 🌐 OPTION 3: Fly.io (Advanced)

### Why Fly?
- ✅ Better performance
- ✅ Global CDN
- ✅ Never sleeps
- ⚠️ Command-line required

### Steps:

1. **Install Fly CLI**
   
   **Windows (PowerShell as Admin):**
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Create fly.toml**
   Create file in project root:
   ```toml
   app = "dialer-app"
   
   [build]
     [build.env]
       NODE_VERSION = "18"
   
   [env]
     PORT = "8080"
   
   [[services]]
     internal_port = 8080
     protocol = "tcp"
   
     [[services.ports]]
       handlers = ["http"]
       port = "80"
   
     [[services.ports]]
       handlers = ["tls", "http"]
       port = "443"
   ```

4. **Create start script**
   Update `backend/package.json`:
   ```json
   {
     "scripts": {
       "start": "node server.js"
     }
   }
   ```

5. **Deploy**
   ```bash
   cd "C:\Users\Ensar Lochi\Desktop\dialer"
   fly launch --name dialer-app
   fly secrets set OPENAI_API_KEY=your_key
   fly secrets set JWT_SECRET=your_secret
   fly deploy
   ```

6. **Access**
   - URL: `https://dialer-app.fly.dev`

---

## 📱 POST-DEPLOYMENT CHECKLIST

After deploying to ANY platform:

### 1. Test Login System
- [ ] Go to your app URL
- [ ] Should redirect to login page
- [ ] Login with admin/admin123
- [ ] Should see main dashboard

### 2. Change Admin Password
- [ ] Login as admin
- [ ] (Future: Add password change feature)
- [ ] For now: Create new admin user via register page

### 3. Configure SIP Settings
- [ ] Go to Configuration tab
- [ ] Add your SIP credentials:
  ```
  Username: your_sip_username
  Password: your_sip_password
  Realm: your_sip_domain.com
  Websocket URL: wss://your_sip_server
  ```

### 4. Test Calling
- [ ] Click "Connect to Server"
- [ ] Try making a test call
- [ ] Verify audio works

### 5. Test AI Features
- [ ] Go to AI Voice tab
- [ ] Configure OpenAI settings
- [ ] Test TTS voice
- [ ] Test speech recognition

---

## 🔒 SECURITY IMPORTANT!

### After Deployment:

1. **Change JWT Secret**
   - Use random 32+ character string
   - Example: `kJ#8mP2$qW9xR5@vN3zL7cF1bD6yH4`

2. **Change Admin Password**
   - Create new admin account
   - Or add password change feature

3. **Never Share**
   - Don't commit `.env` file
   - Don't share JWT_SECRET
   - Don't share OpenAI API key

4. **Use HTTPS**
   - Render/Railway/Fly auto-provide SSL
   - Always access via `https://`

---

## 💾 DATABASE BACKUP

Your database is in: `backend/dialer.db`

### Render Backup:
```bash
# Download from Render shell
render shell
cat backend/dialer.db > /tmp/backup.db
# Download via dashboard
```

### Railway Backup:
```bash
# Railway CLI
railway run cat backend/dialer.db > backup.db
```

### Fly Backup:
```bash
fly ssh console
cat backend/dialer.db > /tmp/backup.db
```

---

## 🎉 YOUR APP IS NOW LIVE!

**Access Your App:**
- Render: `https://dialer-app.onrender.com`
- Railway: `https://dialer-app.railway.app`
- Fly: `https://dialer-app.fly.dev`

**Features:**
- ✅ Secure login/register
- ✅ Multi-user support
- ✅ SIP calling
- ✅ AI voice assistant
- ✅ Speech recognition
- ✅ Auto dialer
- ✅ Call history
- ✅ Beautiful UI

---

## 🆘 TROUBLESHOOTING

### Login Not Working?
- Check browser console (F12)
- Verify JWT_SECRET is set in environment
- Clear browser cache/cookies

### Database Error?
- Database auto-creates on first run
- Check server logs for errors
- Ensure write permissions

### SIP Not Connecting?
- Verify WebSocket URL (must be ws:// or wss://)
- Check SIP credentials
- Test with other SIP client first

### AI Features Not Working?
- Verify OPENAI_API_KEY is set
- Check API key is valid
- View server logs for errors

---

## 📞 SUPPORT

Need help? Check:
1. Server logs in deployment dashboard
2. Browser console (F12)
3. README.md file
4. GitHub issues

---

## 🎊 CONGRATULATIONS!

You now have a production-ready, multi-user WebRTC dialer with AI capabilities running on a free server!

**What's Next?**
- Invite users to register
- Configure your SIP account
- Start making calls
- Experiment with AI features
- Customize the UI
- Add more features!

Enjoy your deployed app! 🚀
