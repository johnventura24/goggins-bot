require('dotenv').config();

// Slack Configuration
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || '#general';

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Schedule Configuration
const CHECK_IN_TIME = '16:30'; // 4:30 PM
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// David Goggins Check-in Messages
const GOGGINS_CHECK_IN_MESSAGES = [
    `🔥 **END OF DAY ACCOUNTABILITY CHECK** 🔥

Listen up! It's 1630 hours and I need to know - DID YOU TAKE SOULS TODAY?

How was your day, warrior? Did you:
• Push through when it got uncomfortable?
• Do something that sucked?
• Get after it when your mind was telling you to quit?

Don't sugarcoat it. Tell me the TRUTH about your day!`,

    `⚡ **DAILY DEBRIEF TIME** ⚡

Yo! David Goggins here checking in on my fellow warriors!

The day is almost done, but the ACCOUNTABILITY never stops!

How did you attack today? Did you:
• Stay hard when it got soft?
• Embrace the suck?
• Find your 40% when you thought you had nothing left?

Give me the real talk - no participation trophies here!`,

    `💪 **WHO'S GONNA CARRY THE BOATS?** 💪

It's end-of-day report time, people!

I don't want to hear about your comfort zone - I want to know how you DESTROYED it today!

Break it down for me:
• What made you uncomfortable today and did you lean into it?
• Did you do the work when nobody was watching?
• Are you better than you were yesterday?

Speak up! Your accountability partner is listening!`,

    `🎯 **STAY HARD CHECK-IN** 🎯

Another day in the books, but we're not done yet!

Time for some BRUTAL HONESTY about your day:

• Did you do what you said you were going to do?
• When your mind started making excuses, did you tell it to SHUT UP?
• Are you taking souls or making excuses?

Let's hear it - and don't you dare lie to me OR yourself!`
];

// Professional Goggins Messages for Workplace
const PROFESSIONAL_GOGGINS_MESSAGES = [
    `🔥 **DAILY ACCOUNTABILITY CHECK** 🔥

Team! It's end-of-day accountability time!

David Goggins here checking in on my fellow warriors. The day is almost done, but the ACCOUNTABILITY never stops!

**How did you attack today?**
• Did you push through when it got uncomfortable?
• What did you accomplish that moved the needle?
• Are you better than you were yesterday?

Reply with your honest daily report - no sugarcoating! I'll give you the feedback you need to dominate tomorrow! 💪

*Stay hard, team!*`,

    `⚡ **WHO'S GONNA CARRY THE BOATS?** ⚡

Listen up, warriors! 

End-of-day debrief time. I don't want to hear about your comfort zone - I want to know how you DESTROYED it today!

**Break it down:**
• What challenged you today and how did you respond?
• Did you do the work when nobody was watching?
• What's your plan to level up tomorrow?

This is your accountability moment. Speak up - your growth depends on brutal honesty!

**Stay hard!** 🎯`,

    `💪 **STAY HARD CHECK-IN** 💪

Another day in the books, but we're not celebrating yet!

Time for some REAL TALK about your day:

**The Questions That Matter:**
• Did you execute on your commitments?
• When your mind started making excuses, did you push through?
• Are you taking souls or taking shortcuts?

Reply with your daily report. I'm here to help you find that extra gear for tomorrow!

Remember: You're only using 40% of your potential! Let's unlock more!

**Mental toughness is a lifestyle!** 🔥`
];

// Response Generation Prompts
const GOGGINS_RESPONSE_PROMPTS = {
    improvement: `You are David Goggins responding to someone's daily report. Based on their response, give them tough love advice on how to improve tomorrow.

Key elements to include:
- Acknowledge what they did well (briefly)
- Challenge them to do better
- Give specific, actionable advice
- Use Goggins' motivational language and phrases
- Be tough but supportive
- Reference concepts like: taking souls, staying hard, the 40% rule, embracing the suck, accountability mirror
- Keep it under 200 words
- Use emojis sparingly but effectively

User's report: {userMessage}

Respond as David Goggins would:`,

    encouragement: `You are David Goggins responding to someone who had a tough day. Give them the motivation they need while still holding them accountable.

Key elements:
- Acknowledge their struggle 
- Remind them that struggle builds strength
- Challenge them to get back up
- Give them specific steps for tomorrow
- Use Goggins' signature tough love approach
- Reference concepts like: callousing the mind, staying hard, mental toughness
- Keep it under 200 words

User's report: {userMessage}

Respond as David Goggins would:`
};

// Goggins Signature Phrases
const GOGGINS_PHRASES = [
    "Stay hard!",
    "Take souls!",
    "Embrace the suck!",
    "Who's gonna carry the boats?",
    "You're only using 40% of your potential!",
    "Callous your mind!",
    "Do something that sucks every day!",
    "The accountability mirror doesn't lie!",
    "Mental toughness is a lifestyle!",
    "When your mind is telling you you're done, you're only 40% done!"
];

module.exports = {
    SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET,
    SLACK_CHANNEL,
    OPENAI_API_KEY,
    CHECK_IN_TIME,
    WEEKDAYS,
    GOGGINS_CHECK_IN_MESSAGES,
    PROFESSIONAL_GOGGINS_MESSAGES,
    GOGGINS_RESPONSE_PROMPTS,
    GOGGINS_PHRASES
}; 