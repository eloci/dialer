# 🚀 COMPLETE CLOUD DEPLOYMENT GUIDE

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  CLOUD DEPLOYMENT                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Render.com (Free)          Railway.app ($5 credit)│
│  ┌──────────────────┐      ┌──────────────────┐   │
│  │  Dialer App      │◄─────┤ Asterisk Gateway │   │
│  │  - User Login    │ WSS  │ - WebRTC SIP     │   │
│  │  - AI Voice      │──────┤ - Audio Routing  │   │
│  │  - Call Control  │      │ - Port: 8088     │   │
│  │  Port: 443/HTTPS │      └──────────────────┘   │
│  └──────────────────┘                              │
│         │                                           │
│         │ HTTPS                                     │
│         ▼                                           │
│   [End Users]                                       │
└─────────────────────────────────────────────────────┘
```

---

## 📋 DEPLOYMENT CHECKLIST

### ✅ Prerequisites Completed:
- [x] Code pushed to GitHub (https://github.com/eloci/dialer)
- [x] Docker gateway files ready
- [x] Railway configuration added
- [x] Authentication system implemented

### 🎯 What We're Deploying:
1. **Dialer App** → Render.com (Free)
2. **Asterisk Gateway** → Railway.app (Free $5 credit)

---

## 🌐 PART 1: Deploy Asterisk Gateway to Railway.app

### Step 1: Create Railway Account

1. Open https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access your GitHub

### Step 2: Create New Project for Gateway

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose "eloci/dialer"
4. Railway will auto-detect the Dockerfile

### Step 3: Configure Gateway Service

1. After project creation, click on the service
2. Go to "Settings" tab
3. Scroll to "Build" section
4. Set:
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `Dockerfile.gateway`
5. Click "Save"

### Step 4: Add Environment Variables

Click "Variables" tab and add:

```
NO_ASTERISK_ENV_VARS_NEEDED
```

(Asterisk uses config files, not env vars)

### Step 5: Expose Public Domain

1. Click "Settings" tab
2. Scroll to "Networking"
3. Click "Generate Domain"
4. Save the URL (e.g., `asterisk-gateway-production.up.railway.app`)

### Step 6: Configure Ports

In "Settings" → "Network":
- Add public port: **8088** (WebSocket)
- TCP/UDP ports auto-configured

### Step 7: Deploy

1. Go to "Deployments" tab
2. Railway auto-deploys on GitHub push
3. Wait for build to complete (2-3 minutes)
4. Check logs for: "Asterisk Ready"

### Step 8: Note Your Gateway URL

```
WebSocket URL: wss://YOUR-APP.up.railway.app:8088/ws
SIP Domain: YOUR-APP.up.railway.app
```

**Save these for the dialer app configuration!**

---

## 🌐 PART 2: Deploy Dialer App to Render.com

### Step 1: Create Render Account

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub

### Step 2: Create New Web Service

1. Click "New +" → "Web Service"
2. Click "Build and deploy from a Git repository"
3. Click "Next"
4. Find and select "eloci/dialer"
5. Click "Connect"

### Step 3: Configure Service

Fill in these **exact** values:

```
Name: dialer-app
Region: Frankfurt (or closest to you)
Branch: main
Root Directory: (leave empty)
Runtime: Node
Build Command: cd backend && npm install
Start Command: cd backend && node server.js
Instance Type: Free
```

### Step 4: Add Environment Variables

Click "Advanced" → Add these variables:

```
Variable 1:
Key: OPENAI_API_KEY
Value: sk-proj-YOUR_OPENAI_API_KEY_HERE

Variable 2:
Key: JWT_SECRET
Value: kJ8mP2qW9xR5vN3zL7cF1bD6yH4tG9sA2xK5pL8mN1qR3v

Variable 3:
Key: PORT
Value: 10000
```

### Step 5: Create Web Service

1. Click "Create Web Service"
2. Wait 2-3 minutes for deployment
3. Watch build logs in real-time

### Step 6: Get Your App URL

Your app will be live at:
```
https://dialer-app.onrender.com
```

---

## 🔗 PART 3: Connect Dialer to Gateway

### Step 1: Access Your Dialer App

1. Go to: `https://dialer-app.onrender.com`
2. You'll see the login page
3. Login with:
   - Username: `admin`
   - Password: `admin123`

### Step 2: Configure SIP Settings

1. Click on "⚙️ Configuration" tab
2. Fill in:

```
SIP Username: your_extension (e.g., 1001)
SIP Password: your_password
SIP Realm: YOUR-GATEWAY.up.railway.app
WebSocket URL: wss://YOUR-GATEWAY.up.railway.app:8088/ws
```

Replace `YOUR-GATEWAY` with your actual Railway domain!

### Step 3: Test Connection

1. Click "Connect to Server"
2. Check status indicator
3. Should show "Connected" ✅

### Step 4: Make Test Call

1. Enter a phone number
2. Click "Call"
3. Test audio

---

## 📊 MONITORING & LOGS

### Railway (Gateway):
- Dashboard → Your Project → Deployments
- Click "View Logs" to see Asterisk logs
- Monitor CPU/Memory usage

### Render (Dialer App):
- Dashboard → dialer-app → Logs
- Real-time application logs
- Error tracking

---

## 🔒 SECURITY CHECKLIST

After deployment:

- [ ] Change admin password immediately
- [ ] Create your own user account
- [ ] Verify JWT_SECRET is strong (32+ chars)
- [ ] Test login/logout functionality
- [ ] Verify HTTPS is working (both services)
- [ ] Check that .env is NOT in GitHub (.gitignore works)
- [ ] Set up SIP authentication on Asterisk
- [ ] Configure firewall rules if needed

---

## 💰 COSTS

### Railway.app:
- **Free**: $5 credit per month
- Asterisk gateway uses ~$3-4/month
- Renews monthly
- Upgrade if you exceed

### Render.com:
- **Free tier**: Unlimited
- Sleeps after 15min inactivity
- Wakes in ~30 seconds
- Upgrade to $7/month for always-on

### Total Monthly Cost:
- **$0** (with free credits)
- Or **$7-14/month** for production (no sleep, better performance)

---

## 🆘 TROUBLESHOOTING

### Gateway Not Starting:
```bash
# Check Railway logs
# Look for Asterisk errors
# Verify Dockerfile.gateway exists
```

### Dialer Can't Connect:
```bash
# Verify WebSocket URL is correct
# Check if gateway is running
# Ensure port 8088 is exposed
# Try without WSS (ws://) for testing
```

### Database Issues:
```bash
# Render logs should show:
# "✅ Connected to SQLite database"
# "✅ Default admin user created"
# If not, redeploy the service
```

### Login Not Working:
```bash
# Clear browser cache
# Check JWT_SECRET is set
# Verify backend is running (Render logs)
# Try incognito/private window
```

---

## 🎊 SUCCESS CHECKLIST

Your deployment is successful when:

- [ ] Railway shows "Asterisk Ready" in logs
- [ ] Render shows "HTTP server running" in logs
- [ ] Can access dialer at https://dialer-app.onrender.com
- [ ] Login page loads correctly
- [ ] Can login with admin/admin123
- [ ] Dashboard loads after login
- [ ] Can access Configuration tab
- [ ] Can enter SIP credentials
- [ ] Connection to gateway works
- [ ] Can make test calls (if configured)

---

## 📞 URLS TO SAVE

After deployment, save these:

```
Dialer App: https://dialer-app.onrender.com
Gateway: wss://YOUR-APP.up.railway.app:8088/ws
GitHub Repo: https://github.com/eloci/dialer
Railway Dashboard: https://railway.app/dashboard
Render Dashboard: https://dashboard.render.com
```

---

## 🚀 NEXT STEPS

1. **Test Everything**
   - Login system
   - SIP connection
   - Make test calls
   - AI voice features

2. **Customize**
   - Add your branding
   - Configure AI prompts
   - Set up auto-dialer lists
   - Customize voice settings

3. **Go Live**
   - Invite team members
   - Configure production SIP trunk
   - Set up monitoring
   - Create backup strategy

---

## 🎉 CONGRATULATIONS!

You now have a **fully cloud-hosted** WebRTC dialer with:
- ✅ Multi-user authentication
- ✅ AI voice capabilities
- ✅ SIP/WebRTC gateway
- ✅ Professional UI
- ✅ Free hosting (with credits)
- ✅ HTTPS/WSS security
- ✅ Global accessibility

**Your production-ready call center is LIVE!** 🎊

---

Need help? Check the logs in Railway and Render dashboards!
