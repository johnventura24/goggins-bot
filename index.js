const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const cron = require('node-cron');
const OpenAI = require('openai');
const moment = require('moment-timezone');

// Import configurations
const {
    SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET,
    OPENAI_API_KEY,
    CHECK_IN_TIME,
    WEEKDAYS,
    PROFESSIONAL_GOGGINS_MESSAGES,
    GOGGINS_RESPONSE_PROMPTS,
    GOGGINS_PHRASES
} = require('./config');

const {
    getActiveUsers,
    getActiveChannels,
    getUserBySlackId
} = require('./real-users');

const UserManager = require('./user-manager');

class DavidGogginsBot {
    constructor() {
        // Initialize Slack App with Bolt
        this.app = new App({
            token: SLACK_BOT_TOKEN,
            signingSecret: SLACK_SIGNING_SECRET,
            socketMode: false, // Using HTTP mode for webhooks
            appToken: process.env.SLACK_APP_TOKEN, // Only needed for socket mode
        });

        // Initialize OpenAI
        this.openai = new OpenAI({
            apiKey: OPENAI_API_KEY
        });

        // Initialize User Manager
        this.userManager = new UserManager(this.app.client);

        this.setupEventHandlers();
        this.setupScheduler();
        
        console.log('🔥 David Goggins Bot initialized! Ready to hold people accountable! 🔥');
    }

    setupEventHandlers() {
        // Listen for messages that might be responses to check-ins
        this.app.message(/.*/, async ({ message, say, client }) => {
            try {
                // Skip bot messages and messages without user
                if (message.subtype === 'bot_message' || !message.user) {
                    return;
                }

                // Check if this looks like a daily report response
                if (this.isResponseToCheckin(message.text)) {
                    console.log(`📨 Processing potential check-in response from ${message.user}`);
                    await this.handleUserResponse(message.text, message.user, message.channel);
                }
            } catch (error) {
                console.error('❌ Error handling message:', error);
            }
        });

        // Listen for mentions
        this.app.event('app_mention', async ({ event, say }) => {
            try {
                console.log(`📢 Bot mentioned by ${event.user}`);
                await say({
                    text: `🔥 What's up, warrior! Ready for some accountability? Stay hard! 💪`,
                    channel: event.channel
                });
            } catch (error) {
                console.error('❌ Error handling mention:', error);
            }
        });

        console.log('📡 Event handlers set up successfully');
    }

    setupScheduler() {
        // Schedule daily check-ins for Monday-Friday at 4:30 PM
        // Cron format: minute hour day-of-month month day-of-week
        const [hour, minute] = CHECK_IN_TIME.split(':');
        const cronExpression = `${minute} ${hour} * * 1-5`; // Mon-Fri

        cron.schedule(cronExpression, () => {
            this.sendDailyCheckin();
        }, {
            scheduled: true,
            timezone: "America/New_York" // Adjust timezone as needed
        });

        console.log(`⏰ Scheduled daily check-ins at ${CHECK_IN_TIME} Monday-Friday`);
    }

    async sendDailyCheckin() {
        try {
            const currentTime = moment().format('MMMM Do, YYYY [at] h:mm A');
            console.log(`🔥 Starting daily check-in process at ${currentTime}`);

            // Use UserManager to send personalized check-ins
            const results = await this.userManager.sendAllDailyCheckins();

            // Log results
            const totalSent = (results.groupCheckins?.length || 0) + (results.individualCheckins?.length || 0);
            if (totalSent > 0) {
                console.log(`✅ Daily check-ins sent successfully to ${totalSent} recipients at ${currentTime}`);
            } else {
                console.log(`⚠️ No check-ins sent - check user configuration`);
            }

            return results;
        } catch (error) {
            console.error(`❌ Error in daily check-in process: ${error.message}`);
            return null;
        }
    }

    isResponseToCheckin(messageText) {
        // Simple heuristics to detect daily report responses
        const responseIndicators = [
            'my day', 'today', 'report', 'did', 'accomplished',
            'struggled', 'worked on', 'finished', 'completed',
            'productive', 'challenging', 'good day', 'tough day'
        ];

        const text = messageText.toLowerCase();
        const hasResponseKeywords = responseIndicators.some(indicator => text.includes(indicator));
        
        // Also consider longer messages as likely to be reports
        return hasResponseKeywords || messageText.split(' ').length > 10;
    }

    async generateGogginsResponse(userMessage, userContext = {}) {
        try {
            // Determine if user needs encouragement or improvement advice
            const strugglingKeywords = ['tired', 'failed', 'couldn\'t', 'didn\'t', 'bad day', 'struggled', 'quit'];
            const needsEncouragement = strugglingKeywords.some(keyword => 
                userMessage.toLowerCase().includes(keyword)
            );

            const promptType = needsEncouragement ? 'encouragement' : 'improvement';
            let prompt = GOGGINS_RESPONSE_PROMPTS[promptType];

            // Add user context if available
            if (userContext.name || userContext.role || userContext.goals) {
                const contextInfo = [
                    userContext.name && `User: ${userContext.name}`,
                    userContext.role && `Role: ${userContext.role}`,
                    userContext.goals && `Goals: ${userContext.goals.join(', ')}`
                ].filter(Boolean).join('\n');
                
                prompt = `${contextInfo}\n\n${prompt}`;
            }

            prompt = prompt.replace('{userMessage}', userMessage);

            // Generate response using OpenAI
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are David Goggins, the ultra-endurance athlete and motivational speaker known for extreme mental toughness and accountability."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 250,
                temperature: 0.8
            });

            let gogginsResponse = response.choices[0].message.content.trim();

            // Add a random Goggins phrase at the end
            const signaturePhrase = GOGGINS_PHRASES[Math.floor(Math.random() * GOGGINS_PHRASES.length)];
            return `${gogginsResponse}\n\n**${signaturePhrase}** 💪`;

        } catch (error) {
            console.error(`❌ Error generating Goggins response: ${error.message}`);
            return this.getFallbackResponse();
        }
    }

    getFallbackResponse() {
        const fallbackResponses = [
            "🔥 Listen up! I don't care what happened today - tomorrow you're going to attack the day harder! No excuses, no shortcuts. Do something that sucks and thank me later! Stay hard! 💪",
            "⚡ Your mind is playing tricks on you! When you think you're done, you're only 40% done! Tomorrow, find that extra gear and push through. The accountability mirror is watching! Stay hard! 🎯",
            "💪 Every day is a new opportunity to take souls and better yourself! Stop making excuses and start making moves! Do the work when nobody's watching! Stay hard! 🔥"
        ];
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    async handleUserResponse(userMessage, userId, channel) {
        try {
            console.log(`📨 Processing response from user ${userId}: ${userMessage.substring(0, 50)}...`);

            // Use UserManager to handle real user responses with context
            const response = await this.userManager.handleUserResponse(userId, userMessage, channel);

            if (response) {
                console.log(`✅ Goggins response processed successfully`);
                return response;
            } else {
                // Fallback to generic response for unknown users
                const gogginsResponse = await this.generateGogginsResponse(userMessage);
                const fallbackResponse = await this.app.client.chat.postMessage({
                    channel: channel,
                    text: `<@${userId}> ${gogginsResponse}`
                });
                console.log(`✅ Fallback response sent to user ${userId}`);
                return fallbackResponse;
            }
        } catch (error) {
            console.error(`❌ Error handling user response: ${error.message}`);
            return null;
        }
    }

    async manualCheckin() {
        console.log('🧪 Manually triggering daily check-in...');
        return await this.sendDailyCheckin();
    }

    async testResponse(testMessage) {
        console.log(`🧪 Testing response generation for: '${testMessage}'`);
        const response = await this.generateGogginsResponse(testMessage);
        console.log(`🤖 Goggins Response: ${response}`);
        return response;
    }

    async start() {
        try {
            const port = process.env.PORT || 3000;
            await this.app.start(port);
            
            console.log('\n' + '='.repeat(60));
            console.log('🔥 DAVID GOGGINS BOT IS LIVE AND READY TO HOLD YOU ACCOUNTABLE! 🔥');
            console.log('='.repeat(60));
            console.log(`📅 Daily check-ins scheduled for ${CHECK_IN_TIME} Monday-Friday`);
            console.log(`🌐 Server running on port ${port}`);
            console.log('💪 Stay hard and get after it!');
            console.log('='.repeat(60) + '\n');
        } catch (error) {
            console.error('❌ Failed to start the bot:', error);
            process.exit(1);
        }
    }
}

// Initialize and start the bot
const bot = new DavidGogginsBot();

// Export for testing
module.exports = DavidGogginsBot;

// Start the bot if this file is run directly
if (require.main === module) {
    bot.start().catch(console.error);
} 