# 🔥 David Goggins Accountability Bot

A Slack bot that provides daily accountability check-ins with David Goggins-style motivation and responds to user messages with tough love coaching.

## ✨ Features

- **Daily Check-ins**: Automated messages at 4:30 PM EST asking "Tell me what you accomplished today"
- **Smart Replies**: Responds to user messages with motivational coaching
- **Single Reply Only**: No duplicate responses (fixes triple reply issue)
- **Greeting Support**: Responds to "hey", "hi", "hello" and similar greetings
- **AI-Powered**: Uses OpenAI to generate personalized responses
- **Team Management**: Configured for specific team members

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Slack Bot Token
- OpenAI API Key

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd david-goggins-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
cp env-template.txt .env
```

4. **Configure environment variables in `.env`:**
```
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret
OPENAI_API_KEY=sk-your-openai-key
PORT=3000
```

5. **Configure team members in `real-users.js`**

6. **Start the bot**
```bash
npm start
```

## 📁 Key Files

- `goggins-single-reply-bot.js` - Main bot code (single event handler)
- `start-single-reply-bot.js` - Bot startup script
- `config.js` - Bot configuration and settings
- `real-users.js` - Team member configuration
- `package.json` - Dependencies and scripts

## 🎯 How It Works

### Daily Check-ins
- Bot sends daily messages at 4:30 PM EST
- Asks team members about their accomplishments
- Waits for user responses

### Reply System
- Detects when users reply with accomplishments or greetings
- Uses AI to generate appropriate David Goggins-style responses
- Provides tough love motivation and coaching
- **Single reply only** - no duplicates

### Message Detection
Bot responds to messages containing:
- Accomplishment keywords: "accomplished", "did", "completed", "finished"
- Greeting words: "hey", "hi", "hello", "good morning"
- Work-related content: "work", "project", "meeting", "task"

## 🚢 Deployment

### Render/Heroku
1. Push code to GitHub
2. Connect to your deployment platform
3. Set environment variables in platform settings
4. Deploy using the included `Procfile`

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

## 🔧 Configuration

### Team Members (`real-users.js`)
```javascript
const REAL_USERS = {
    'U078UMV769F': { name: 'Marnie', role: 'Executive Assistant' },
    'U02L4D5TED6': { name: 'John', role: 'Founder/CEO' },
    // Add your team members
};
```

### Bot Settings (`config.js`)
- Daily check-in time
- Response templates
- AI prompts

## 🐛 Troubleshooting

### Multiple Replies Issue
- Ensure only `goggins-single-reply-bot.js` is running
- Delete or rename old bot files (`index.js`, `enhanced-goggins.js`)
- Use only `start-single-reply-bot.js` to start the bot

### Bot Not Responding
- Check Slack Event Subscriptions are enabled
- Verify bot has necessary permissions
- Check environment variables are set correctly

### Greeting Detection Not Working
- Bot responds to "hey", "hi", "hello" in DMs
- Message must be recent (within 2 minutes)
- Check debug logs for detection details

## 📝 Example Interactions

**Daily Check-in:**
```
Goggins: "🔥 END OF DAY CHECK-IN! Tell me what you accomplished today..."
User: "hey, had a productive day finishing the project"
Goggins: "THAT'S WHAT I'M TALKING ABOUT! Finishing that project..."
```

**Simple Greeting:**
```
User: "hey"
Goggins: "What's up! Ready to get after it today?"
```

## 🔒 Security

- Never commit `.env` file to repository
- Use environment variables for all secrets
- Bot token should have minimal required permissions

## 📄 License

MIT License - Feel free to modify and use for your team!

---

**Need help?** Check the troubleshooting section or review the bot logs for detailed debugging information. 
