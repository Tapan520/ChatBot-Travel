# Deploying Your Travel Chatbot to Railway

## Overview
Railway will host your chatbot online 24/7 with a public URL like:
`https://travel-chatbot-production.up.railway.app`

Your chatbot has TWO parts:
- **Backend** (server.js) — Node.js + Express
- **Frontend** (client/) — React

On Railway, both run as ONE service. Express builds and serves the React app.

---

## PART A — Push Code to GitHub (One Time)

Railway deploys from GitHub, so you need to push your code there first.

### Step 1 — Create a GitHub repository
1. Go to **https://github.com** → Sign in
2. Click the **+** button (top right) → **New repository**
3. Name it: `travel-chatbot`
4. Set it to **Private** (your API keys go as environment variables, not in code)
5. Click **Create repository**

### Step 2 — Push your code from your computer
Open a terminal in your chatbot folder and run:

```bash
git init
git add .
git commit -m "Initial travel chatbot with hybrid AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/travel-chatbot.git
git push -u origin main
```

> ⚠️ The `.gitignore` already excludes `.env` and `credentials.json` — your secrets stay safe.

---

## PART B — Deploy on Railway

### Step 3 — Create new project on Railway
1. Go to **https://railway.app** → Log in
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your `travel-chatbot` repository
5. Railway will auto-detect it as a Node.js app

### Step 4 — Set Environment Variables
This is the MOST IMPORTANT step. Railway needs all the values from your `.env` file.

In Railway → your service → **Variables** tab, add these one by one:

| Variable Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SPREADSHEET_ID` | Your Google Sheet ID |
| `EMAIL_USER` | Your Gmail address |
| `EMAIL_APP_PASSWORD` | Your Gmail app password |
| `ANTHROPIC_API_KEY` | Your Claude API key (sk-ant-...) |

> Click **"+ Add Variable"** for each one. Railway encrypts and stores them securely.

### Step 5 — Add Google Credentials (credentials.json)
Your `credentials.json` file cannot be uploaded as a file on Railway.
You need to convert it to an environment variable:

1. Open your `credentials.json` file in Notepad
2. Select ALL the text and copy it
3. In Railway Variables, add a new variable:
   - Name: `GOOGLE_CREDENTIALS_JSON`
   - Value: paste the entire JSON content

4. Then update your `server.js` Google Auth section — replace:
```javascript
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
```
With:
```javascript
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
```

### Step 6 — Generate a Public Domain
1. In Railway → your service → **Settings** tab
2. Scroll to **Networking** section
3. Click **"Generate Domain"**
4. Your chatbot gets a URL like: `https://travel-chatbot-xyz.up.railway.app`

### Step 7 — Deploy!
1. Railway triggers a build automatically when you push to GitHub
2. Watch the **Deploy Logs** — the build takes 2-3 minutes
3. You should see:
```
🚀 Travel Chatbot Server running on port XXXX
🤖 AI Mode: HYBRID — Google Sheet first, Claude AI as fallback
📦 Serving React build from client/build
```
4. Visit your public URL — your chatbot is live!

---

## After Deployment — Making Updates

Whenever you change code on your computer:
```bash
git add .
git commit -m "Updated chatbot"
git push
```
Railway automatically detects the push and redeploys in ~2 minutes.

---

## Railway Pricing

| Plan | Cost | What You Get |
|---|---|---|
| Hobby | $5/month | Always-on, custom domain, enough for your chatbot |
| Free Trial | $5 credit | One-time trial — lasts weeks for low traffic |

Your chatbot is lightweight — Hobby plan is more than enough.

---

## Troubleshooting

| Problem | Where to look | Fix |
|---|---|---|
| Build fails | Deploy Logs tab | Check for missing packages |
| Chatbot loads but shows errors | Runtime Logs | Check environment variables are set |
| Google Sheets not working | Runtime Logs | Check GOOGLE_CREDENTIALS_JSON is valid JSON |
| AI not responding | Runtime Logs | Verify ANTHROPIC_API_KEY is correct |
| Site not loading | Settings → Networking | Make sure domain is generated |
