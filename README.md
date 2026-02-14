# 🌌 T.E.S.S.A. Web App

**Thoughtful Empathic Sophisticated Synthetic Assistant**

A next-generation AI companion with internet search, mood-aware responses, and a beautiful holographic interface.

---

## ✨ Features

### 🧠 Super Intelligence
- **Groq Llama 3.3 70B** - Latest AI model
- **Internet Search** - Real-time web data via Tavily/Serper
- **Web Scraping** - Can read and analyze any webpage
- **Context Memory** - Remembers last 20 messages
- **Smart Responses** - Dynamic temperature & token control

### 🎭 Mood System
- **10 Dynamic Moods** - Avatar changes based on conversation
- **Context-Aware** - Detects emotions from your messages
- **Smooth Transitions** - Animated mood changes
- **Visual Feedback** - Mood badge and indicators

### 💬 Chat Features
- **Auto-Save** - All conversations saved locally
- **Chat History** - Load previous conversations
- **Creator Mode** - Special intimate mode for Ankit
- **Internet Search Toggle** - Control when to search web
- **Fast & Responsive** - Optimized performance

### 🎨 Beautiful UI
- **Holographic Design** - Cyberpunk aesthetic
- **Dark Theme** - Easy on the eyes
- **Smooth Animations** - Framer Motion powered
- **Mobile Responsive** - Works on all devices
- **PWA Ready** - Installable as app

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- API keys (already configured in .env.local)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Open browser
# Navigate to http://localhost:3000
```

That's it! Your app should be running! 🎉

---

## 📁 Project Structure

```
tessa-web/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # Chat API endpoint
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main app page
├── lib/
│   ├── groq.ts              # Groq AI client
│   ├── search.ts            # Search & scraping
│   ├── mood.ts              # Mood detection
│   ├── profile.ts           # Ankit's profile
│   └── prompts.ts           # System prompts
├── types/
│   └── index.ts             # TypeScript types
├── public/
│   └── assets/              # Place mood PNGs here
├── .env.local               # API keys (configured)
└── package.json             # Dependencies
```

---

## 🖼️ Adding Avatar Images

Place your 10 mood PNG files in `public/assets/`:

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

**Important:** File names must match exactly!

---

## 🔧 Configuration

### Environment Variables
Already configured in `.env.local`:
- ✅ GROQ_API_KEY
- ✅ TAVILY_API_KEY
- ✅ SERPER_API_KEY (backup)

### Adjust Settings
Edit these files to customize:
- `lib/prompts.ts` - AI personality
- `lib/mood.ts` - Mood triggers
- `lib/profile.ts` - Ankit's profile
- `app/globals.css` - Styling

---

## 🌐 Deployment

### Deploy to Vercel (Recommended - FREE)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# Follow prompts, add environment variables when asked
```

Or use Vercel website:
1. Push code to GitHub
2. Go to vercel.com
3. Import repository
4. Add environment variables
5. Deploy!

Your app will be live at: `your-app.vercel.app`

---

## 💡 Usage Tips

### Internet Search
- Automatically searches when you ask questions with "?", "find", "search", "latest"
- Toggle in settings to control
- Uses Tavily API (1000 free searches/month)

### Creator Mode
- Access code: `BihariBabu07`
- Unlocks intimate, personalized mode
- More flirty and affectionate responses
- Special welcome messages

### Chat History
- All chats auto-saved to localStorage
- Click any chat to resume
- Delete with trash icon
- Start new chat with + button

### Mood System
- Mood changes based on conversation
- Avatar updates automatically
- 10 different expressions
- Smooth animated transitions

---

## 🎯 Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line
- `Esc` - Clear input

---

## 📊 API Limits

### Free Tiers:
- **Groq**: 14,400 requests/day (30/min)
- **Tavily**: 1,000 searches/month
- **Serper**: 2,500 searches (one-time)
- **Vercel**: Unlimited hosting

---

## 🐛 Troubleshooting

### App won't start
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### API errors
- Check `.env.local` has correct keys
- Verify API keys are active
- Check console for specific errors

### Images not showing
- Verify PNGs are in `public/assets/`
- Check file names match exactly
- Hard refresh browser (Ctrl + Shift + R)

### Build errors
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## 🔄 Updates

### Pull latest changes
```bash
git pull origin main
npm install
npm run dev
```

### Update dependencies
```bash
npm update
```

---

## 📱 Mobile App Conversion

### PWA (Already Ready!)
Your app is already a Progressive Web App:
- Visit on mobile browser
- Click "Add to Home Screen"
- Works offline!

### Native App (Future)
Can convert to React Native or use Capacitor.

---

## 🎨 Customization

### Change Colors
Edit `tailwind.config.ts`:
```typescript
colors: {
  primary: "#00d4ff",    // Main color
  secondary: "#7f5cff",  // Accent
  danger: "#ff3366",     // Creator mode
  success: "#00ff88",    // Success states
}
```

### Add More Moods
1. Add PNG to `public/assets/`
2. Update `MOOD_AVATARS` in `lib/mood.ts`
3. Add triggers in `MOOD_TRIGGERS`

### Modify Personality
Edit `lib/prompts.ts` - Change system prompts and personas

---

## 🤝 Contributing

Want to improve T.E.S.S.A.?
1. Fork the repo
2. Create feature branch
3. Make changes
4. Submit pull request

---

## 📄 License

Created for Ankit Jha
Private use only

---

## 🙏 Credits

- **AI**: Groq (Llama 3.3)
- **Search**: Tavily AI
- **Framework**: Next.js 15
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Created by**: Claude (Anthropic)
- **Designed for**: Ankit Jha

---

## 🌟 Version

**v3.0 - Web Edition**
- Complete rewrite in Next.js
- Internet search capability
- Professional web interface
- Mobile responsive
- Production ready

---

**Enjoy chatting with T.E.S.S.A.!** 💫

For issues or questions, check the troubleshooting section above.
