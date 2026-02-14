# 🚀 T.E.S.S.A. Web App - Setup Instructions

## ✅ Pre-Configured

Your API keys are already set up:
- ✅ Groq API
- ✅ Tavily Search API  
- ✅ Serper API (backup)

---

## 📦 Installation (3 Steps)

### Step 1: Install Dependencies
```bash
cd tessa-web
npm install
```

This will install all required packages (~5 minutes)

### Step 2: Add Avatar Images
Copy your 10 mood PNG files to `public/assets/`:

```
public/assets/
  ├── Tessa Happy.png
  ├── Tessa Calm.png
  ├── Tessa Confident.png
  ├── Tessa worried.png
  ├── Tessa Fyy.png
  ├── Tessa Lgg.png
  ├── Tessa Thinking.png
  ├── Tessa Listening.png
  ├── Tessa Playful.png
  └── Tessa Focussed.png
```

**Important:** Names must match EXACTLY!

### Step 3: Run App
```bash
npm run dev
```

Open browser to: http://localhost:3000

---

## 🎉 That's It!

Your T.E.S.S.A. web app should now be running!

### Test Features:
1. ✅ Send a message
2. ✅ Try "search for latest news" (tests internet search)
3. ✅ Unlock creator mode (code: BihariBabu07)
4. ✅ Watch mood changes
5. ✅ Check chat history

---

## 🌐 Deploy to Internet (FREE)

### Quick Deploy with Vercel:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# Follow prompts, it will:
# - Create project
# - Ask for environment variables
# - Deploy to web
```

Your app will be live at: `https://your-app.vercel.app`

---

## 🐛 Common Issues

### "npm install" fails
```bash
# Try:
npm install --legacy-peer-deps
```

### Port 3000 already in use
```bash
# Use different port:
npm run dev -- -p 3001
```

### Images not showing
- Check files are in `public/assets/`
- Verify exact file names
- Hard refresh browser (Ctrl+Shift+R)

### API errors
- Check `.env.local` exists
- Verify API keys are correct
- Check internet connection

---

## 📱 Mobile Access

### On Same Network:
```bash
# Find your local IP
# Windows: ipconfig
# Mac/Linux: ifconfig

# Run with network access:
npm run dev -- -H 0.0.0.0

# Access from phone:
# http://YOUR_IP:3000
```

### After Deployment:
Just visit your Vercel URL from any device!

---

## 🎨 Customization

### Change Colors
Edit `tailwind.config.ts`

### Modify Personality
Edit `lib/prompts.ts`

### Add More Moods
1. Add PNG to assets
2. Update `lib/mood.ts`

---

## 🆘 Need Help?

1. Check README.md
2. Review this guide
3. Check browser console for errors
4. Verify all files are in place

---

**Enjoy T.E.S.S.A.!** 🌟
