const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const cron = require('node-cron');
const OpenAI = require('openai');
const moment = require('moment-timezone');
const express = require('express');

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
const { EnhancedGogginsBot } = require('./enhanced-goggins');

class DavidGogginsBot {
    constructor() {
        // Initialize Express app for webhook handling
        this.expressApp = express();
        this.expressApp.use(express.json());
        
        // Initialize Slack App with Bolt
        this.app = new App({
            token: SLACK_BOT_TOKEN,
            signingSecret: SLACK_SIGNING_SECRET,
            socketMode: false, // Using HTTP mode for webhooks
            appToken: process.env.SLACK_APP_TOKEN, // Only needed for socket mode
            customRoutes: [
                {
                    path: '/health',
                    method: ['GET'],
                    handler: (req, res) => {
                        res.writeHead(200);
                        res.end('David Goggins Bot is ALIVE and READY! 🔥');
                    }
                }
            ]
        });

        // Initialize OpenAI with enhanced error handling
        this.openai = null;
        if (OPENAI_API_KEY && !OPENAI_API_KEY.includes('your-openai-api-key') && !OPENAI_API_KEY.includes('your_ope')) {
            this.openai = new OpenAI({
                apiKey: OPENAI_API_KEY
            });
            console.log('✅ OpenAI initialized successfully - AI-powered responses ENABLED');
        } else {
            console.log('⚠️ OpenAI API key not found or invalid - using fallback responses only');
            console.log('💡 Set OPENAI_API_KEY in your environment to enable AI-powered responses');
        }

        // Initialize User Manager
        this.userManager = new UserManager(this.app.client);

        // Initialize Enhanced Goggins Bot with AI analysis and deadline tracking
        this.enhancedGoggins = new EnhancedGogginsBot();

        // Track recent check-ins for better reply detection
        this.recentCheckIns = new Map();
        this.userResponseContext = new Map(); // Track user conversation context

        this.setupComprehensiveEventHandlers();
        this.setupScheduler();
        
        console.log('🔥 David Goggins Bot initialized! Ready to hold people accountable! 🔥');
    }

    setupComprehensiveEventHandlers() {
        console.log('📡 Setting up comprehensive event handlers...');

        // ENHANCED MESSAGE HANDLING - Catches all message types
        this.app.message(/.*/, async ({ message, say, client }) => {
            try {
                // Skip bot messages and messages without user
                if (message.subtype === 'bot_message' || !message.user || !message.text) {
                    return;
                }

                console.log(`📩 Message received from ${message.user}: "${message.text?.substring(0, 50)}..."`);
                console.log(`📍 Channel: ${message.channel}, Type: ${message.channel_type || 'unknown'}`);

                // Check if this looks like a daily report response
                const isDM = message.channel_type === 'im' || message.channel.startsWith('D');
                if (this.isResponseToCheckin(message.text, message, isDM)) {
                    console.log(`📨 Processing check-in response from ${message.user}`);
                    await this.handleUserResponse(message.text, message.user, message.channel, message.ts);
                } else {
                    console.log(`📝 Message not detected as check-in response`);
                }
            } catch (error) {
                console.error('❌ Error handling message:', error);
            }
        });

        // ENHANCED EVENT HANDLERS - Multiple event types for better coverage
        this.app.event('message', async ({ event, client }) => {
            try {
                // Skip bot messages and messages without user
                if (event.subtype === 'bot_message' || !event.user || !event.text) {
                    return;
                }

                // Determine message type
                const isDM = event.channel && event.channel.startsWith('D');
                const isGroupDM = event.channel && event.channel.startsWith('G');
                const isChannel = event.channel && event.channel.startsWith('C');
                
                console.log(`📧 Event received - Type: ${isDM ? 'DM' : isGroupDM ? 'Group DM' : 'Channel'}`);
                console.log(`📧 From: ${event.user}, Text: "${event.text.substring(0, 50)}..."`);
                
                // For DMs, be more lenient - any message longer than 10 words is likely a response
                const wordCount = event.text.split(' ').length;
                const isLikelyResponse = isDM && wordCount > 10;
                
                // Check if this looks like a daily report response
                if (this.isResponseToCheckin(event.text, event, isDM) || isLikelyResponse) {
                    console.log(`📨 Processing ${isDM ? 'DM' : isGroupDM ? 'Group DM' : 'channel'} response from ${event.user}`);
                    await this.handleUserResponse(event.text, event.user, event.channel, event.ts);
                } else {
                    console.log(`📝 Event not processed - not detected as response`);
                }
            } catch (error) {
                console.error('❌ Error handling message event:', error);
            }
        });

        // DIRECT MESSAGES - Specific handler for DMs
        this.app.event('message', async ({ event, client }) => {
            if (event.channel_type === 'im') {
                console.log(`💬 Direct message from ${event.user}: "${event.text?.substring(0, 50)}..."`);
                
                // DMs should be treated as responses if they're substantial
                if (event.text && event.text.length > 20) {
                    console.log(`📨 Processing DM as check-in response`);
                    await this.handleUserResponse(event.text, event.user, event.channel, event.ts);
                }
            }
        });

        // APP MENTIONS - When bot is mentioned
        this.app.event('app_mention', async ({ event, say }) => {
            try {
                console.log(`📢 Bot mentioned by ${event.user}`);
                
                // If mention includes substantial text, treat as response
                if (event.text && event.text.length > 50) {
                    console.log(`📨 Processing mention as check-in response`);
                    await this.handleUserResponse(event.text, event.user, event.channel, event.ts);
                } else {
                    await say({
                        text: `🔥 What's up, warrior! Ready for some accountability? Stay hard! 💪`,
                        channel: event.channel
                    });
                }
            } catch (error) {
                console.error('❌ Error handling mention:', error);
            }
        });

        // SHORTCUT HANDLERS - For Slack shortcuts
        this.app.shortcut('daily_report', async ({ shortcut, ack, client }) => {
            try {
                await ack();
                console.log(`🎯 Shortcut triggered by ${shortcut.user.id}`);
                
                // Open modal for daily report
                await client.views.open({
                    trigger_id: shortcut.trigger_id,
                    view: {
                        type: 'modal',
                        callback_id: 'daily_report_modal',
                        title: {
                            type: 'plain_text',
                            text: 'Daily Report'
                        },
                        submit: {
                            type: 'plain_text',
                            text: 'Submit Report'
                        },
                        blocks: [
                            {
                                type: 'input',
                                block_id: 'report_input',
                                element: {
                                    type: 'plain_text_input',
                                    action_id: 'report_text',
                                    multiline: true,
                                    placeholder: {
                                        type: 'plain_text',
                                        text: 'Tell Goggins about your day...'
                                    }
                                },
                                label: {
                                    type: 'plain_text',
                                    text: 'What did you accomplish today?'
                                }
                            }
                        ]
                    }
                });
            } catch (error) {
                console.error('❌ Error handling shortcut:', error);
            }
        });

        console.log('📡 Comprehensive event handlers set up successfully');
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
            console.log(`🔥 Starting enhanced daily check-in process at ${currentTime}`);

            // Use Enhanced Goggins Bot for detailed daily check-ins
            const users = getActiveUsers();
            let sentCount = 0;

            for (const [userId, userData] of Object.entries(users)) {
                try {
                    await this.enhancedGoggins.sendDailyCheckIn(userId, userData);
                    sentCount++;
                } catch (error) {
                    console.error(`❌ Error sending enhanced check-in to ${userData.name}:`, error);
                }
            }

            // Track that we sent check-ins for better reply detection
            this.recentCheckIns.set('last_checkin', moment());
            this.recentCheckIns.set('checkin_count', (this.recentCheckIns.get('checkin_count') || 0) + 1);

            if (sentCount > 0) {
                console.log(`✅ Enhanced daily check-ins sent to ${sentCount} users at ${currentTime}`);
                console.log(`📊 Users will receive detailed questions asking about their accomplishments`);
                console.log(`🤖 AI analysis and deadline tracking enabled for all responses`);
            } else {
                console.log(`⚠️ No check-ins sent - check user configuration`);
            }

            return { sentCount, users: Object.keys(users) };
        } catch (error) {
            console.error(`❌ Error in enhanced daily check-in process: ${error.message}`);
            return null;
        }
    }

    isResponseToCheckin(messageText, messageEvent = {}, isDM = false) {
        if (!messageText || typeof messageText !== 'string') {
            return false;
        }

        // Enhanced response indicators
        const responseIndicators = [
            // Work-related keywords
            'my day', 'today', 'report', 'did', 'accomplished', 
            'struggled', 'worked on', 'finished', 'completed',
            'productive', 'challenging', 'good day', 'tough day',
            
            // Progress-related keywords
            'progress', 'goals', 'tasks', 'projects', 'meetings',
            'deadline', 'achievement', 'success', 'failure',
            'busy', 'hectic', 'smooth', 'difficult',
            
            // Goggins-specific responses
            'stayed hard', 'took souls', 'embraced the suck',
            'pushed through', 'comfort zone', 'mental toughness',
            'accountability', 'grind', 'hustle', 'workout',
            
            // Common EOD phrases
            'end of day', 'eod', 'daily update', 'status update',
            'wrap up', 'summary', 'recap', 'review'
        ];

        const text = messageText.toLowerCase();
        const hasResponseKeywords = responseIndicators.some(indicator => 
            text.includes(indicator)
        );
        
        // Consider longer messages as likely reports (reduced threshold for DMs)
        const wordThreshold = isDM ? 8 : 12;
        const isLongMessage = messageText.split(' ').length > wordThreshold;
        
        // For DMs, be much more lenient since they're direct conversations
        if (isDM && (hasResponseKeywords || isLongMessage)) {
            console.log(`🔍 DM Reply detection for "${text.substring(0, 30)}...": ✅ MATCH (DM + keywords/length)`);
            return true;
        }
        
        // For channels, check timing and keywords
        const isWithinResponseWindow = this.isWithinCheckinWindow();
        const hasRecentCheckin = this.recentCheckIns.has('last_checkin');
        
        const result = hasRecentCheckin && isWithinResponseWindow && 
                      (hasResponseKeywords || (isLongMessage && hasResponseKeywords));
        
        console.log(`🔍 Reply detection for "${text.substring(0, 30)}...": ${result ? '✅ MATCH' : '❌ NO MATCH'}`);
        console.log(`   Keywords: ${hasResponseKeywords}, Length: ${isLongMessage}, Window: ${isWithinResponseWindow}, Recent: ${hasRecentCheckin}, isDM: ${isDM}`);
        
        return result;
    }

    isWithinCheckinWindow() {
        const lastCheckin = this.recentCheckIns.get('last_checkin');
        if (!lastCheckin) {
            return false;
        }
        
        const now = moment();
        const hoursSinceCheckin = now.diff(lastCheckin, 'hours');
        
        // Allow responses within 6 hours of check-in
        return hoursSinceCheckin <= 6;
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

    async handleUserResponse(userMessage, userId, channel, messageTs = null) {
        try {
            console.log(`📨 Processing response from user ${userId}: ${userMessage.substring(0, 50)}...`);
            console.log(`   Channel: ${channel}, MessageTs: ${messageTs}`);

            // Get user data for personalized response
            const userInfo = getUserBySlackId(userId);
            
            if (!userInfo) {
                console.log(`⚠️ User ${userId} not found in active users list`);
                // Still respond to them, but without personalized context
            }

            const userData = userInfo ? userInfo.userData : { 
                name: 'Warrior', 
                role: 'Team Member',
                customGoals: ['Stay productive', 'Build mental toughness']
            };

            console.log(`👤 Responding to ${userData.name} (${userData.role})`);

            // Generate comprehensive Goggins response with OpenAI analysis
            const response = await this.generateComprehensiveGogginsResponse(userMessage, userData);
            
            // Send response in thread if we have a message timestamp
            const messageOptions = {
                channel: channel,
                text: response.text,
                blocks: response.blocks || undefined
            };

            // Always try to reply in thread for better conversation flow
            if (messageTs) {
                messageOptions.thread_ts = messageTs;
                console.log(`📝 Replying in thread to message ${messageTs}`);
            }

            const result = await this.app.client.chat.postMessage(messageOptions);
            
            console.log(`✅ Comprehensive Goggins response sent to ${userData.name}`);
            console.log(`   Response preview: ${response.text.substring(0, 100)}...`);
            
            return result;

        } catch (error) {
            console.error(`❌ Error handling user response: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
            
            // Send a fallback response so user doesn't get ignored
            try {
                const fallbackResponse = this.getFallbackResponse();
                await this.app.client.chat.postMessage({
                    channel: channel,
                    text: `<@${userId}> ${fallbackResponse}`,
                    thread_ts: messageTs || undefined
                });
                console.log(`✅ Fallback response sent to user ${userId}`);
            } catch (fallbackError) {
                console.error(`❌ Even fallback response failed: ${fallbackError.message}`);
            }
            
            return null;
        }
    }

    async generateComprehensiveGogginsResponse(userMessage, userData) {
        try {
            console.log('🤖 Generating comprehensive Goggins response with AI analysis...');
            
            // Analyze the message content
            const analysis = await this.analyzeMessageWithOpenAI(userMessage, userData);
            
            // Generate response with deadlines and follow-up
            const response = this.buildGogginsResponseWithDeadlines(analysis, userData);
            
            console.log('✅ Comprehensive response generated successfully');
            return response;
            
        } catch (error) {
            console.error(`❌ Error generating comprehensive response: ${error.message}`);
            return this.buildFallbackResponse(userMessage, userData);
        }
    }

    async analyzeMessageWithOpenAI(userMessage, userData) {
        if (!this.openai) {
            console.log('⚠️ OpenAI not available, using enhanced fallback analysis');
            return this.analyzeMessageWithoutAI(userMessage, userData);
        }

        try {
            console.log('🤖 Using OpenAI for comprehensive message analysis...');
            const prompt = `Analyze this daily report from ${userData.name} (${userData.role}):

"${userMessage}"

Provide analysis in this format:
FEEDBACK: [Direct feedback on their accomplishments - be tough but fair]
IMPROVEMENTS: [1-2 specific areas for improvement]
DEADLINE: [One specific actionable task with a deadline for tomorrow or this week]
MOTIVATION: [Authentic Goggins motivation]

Keep each section concise but impactful.`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are David Goggins, the ultra-endurance athlete and motivational speaker. Respond with tough love, accountability, and actionable advice. Be direct, intense, but ultimately supportive."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 400,
                temperature: 0.8
            });

            const analysis = this.parseOpenAIResponse(response.choices[0].message.content, userData);
            console.log('✅ OpenAI analysis completed successfully');
            return analysis;
            
        } catch (error) {
            console.error(`❌ OpenAI analysis failed: ${error.message}`);
            console.log('🔄 Falling back to enhanced manual analysis...');
            return this.analyzeMessageWithoutAI(userMessage, userData);
        }
    }

    parseOpenAIResponse(aiResponse, userData) {
        const sections = {
            feedback: '',
            improvements: [],
            deadline: '',
            motivation: ''
        };

        // Parse the AI response sections
        const lines = aiResponse.split('\n');
        let currentSection = '';
        
        lines.forEach(line => {
            const upper = line.toUpperCase();
            if (upper.startsWith('FEEDBACK:')) {
                currentSection = 'feedback';
                sections.feedback = line.substring(9).trim();
            } else if (upper.startsWith('IMPROVEMENTS:')) {
                currentSection = 'improvements';
                sections.improvements.push(line.substring(13).trim());
            } else if (upper.startsWith('DEADLINE:')) {
                currentSection = 'deadline';
                sections.deadline = line.substring(9).trim();
            } else if (upper.startsWith('MOTIVATION:')) {
                currentSection = 'motivation';
                sections.motivation = line.substring(11).trim();
            } else if (line.trim() && currentSection) {
                if (currentSection === 'improvements') {
                    sections.improvements.push(line.trim());
                } else {
                    sections[currentSection] += ' ' + line.trim();
                }
            }
        });

        // Ensure we have content for each section
        if (!sections.feedback) {
            sections.feedback = "I see you're putting in work, but I need more details next time!";
        }
        if (sections.improvements.length === 0) {
            sections.improvements.push("Be more specific about your challenges and how you overcame them");
        }
        if (!sections.deadline) {
            sections.deadline = "Tomorrow, tackle your hardest task FIRST thing - no warm-up tasks!";
        }
        if (!sections.motivation) {
            sections.motivation = "Stay hard and keep pushing your limits!";
        }

        return sections;
    }

    analyzeMessageWithoutAI(userMessage, userData) {
        const text = userMessage.toLowerCase();
        const wordCount = userMessage.split(' ').length;
        
        // Analyze message content
        const hasAccomplishments = text.includes('completed') || text.includes('finished') || text.includes('did') || text.includes('accomplished');
        const hasChallenges = text.includes('difficult') || text.includes('challenging') || text.includes('hard') || text.includes('struggled');
        const hasProgress = text.includes('progress') || text.includes('better') || text.includes('improved');
        
        let feedback = `${userData.name}, `;
        let improvements = [];
        let deadline = '';
        let motivation = '';

        if (wordCount < 10) {
            feedback += "that's not enough detail! I need to see the WORK you put in!";
            improvements.push("Give me at least 3-4 sentences about your day next time");
            improvements.push("Tell me about specific challenges you faced and overcame");
        } else if (hasAccomplishments && hasChallenges) {
            feedback += "I can see you're putting in the work AND facing challenges head-on. That's what warriors do!";
            improvements.push("Keep pushing through the uncomfortable moments - that's where growth happens");
        } else if (hasAccomplishments) {
            feedback += "Good work on the accomplishments, but where were the challenges? Growth happens outside your comfort zone!";
            improvements.push("Seek out something that makes you uncomfortable tomorrow");
        } else {
            feedback += "I see effort, but I need more specifics about what you actually accomplished!";
            improvements.push("Document your wins AND your struggles - both make you stronger");
        }

        // Set role-specific deadlines
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString();

        if (userData.role.toLowerCase().includes('ceo') || userData.role.toLowerCase().includes('founder')) {
            deadline = `By ${tomorrowStr}: Identify and personally handle your biggest strategic challenge - don't delegate it!`;
        } else if (userData.role.toLowerCase().includes('social')) {
            deadline = `By ${tomorrowStr}: Create one piece of content that pushes boundaries and adds real value`;
        } else if (userData.role.toLowerCase().includes('assistant')) {
            deadline = `By ${tomorrowStr}: Find one process you can optimize to add MORE value`;
        } else {
            deadline = `By ${tomorrowStr}: Attack your most challenging task FIRST thing - no warm-up tasks!`;
        }

        const motivationPhrases = [
            "You're not even close to your potential yet!",
            "Stay hard and keep taking souls!",
            "Do something that sucks tomorrow - thank me later!",
            "The accountability mirror is watching!"
        ];
        motivation = motivationPhrases[Math.floor(Math.random() * motivationPhrases.length)];

        return { feedback, improvements, deadline, motivation };
    }

    buildGogginsResponseWithDeadlines(analysis, userData) {
        let responseText = `🔥 **${userData.name}** - GOGGINS ACCOUNTABILITY REPORT 🔥\n\n`;
        
        // Add feedback
        responseText += `**📊 DAILY ASSESSMENT:**\n${analysis.feedback}\n\n`;
        
        // Add improvements
        if (analysis.improvements.length > 0) {
            responseText += `**💪 AREAS FOR IMPROVEMENT:**\n`;
            analysis.improvements.forEach((improvement, index) => {
                responseText += `${index + 1}. ${improvement}\n`;
            });
            responseText += '\n';
        }
        
        // Add deadline
        if (analysis.deadline) {
            responseText += `**⏰ YOUR DEADLINE - NO EXCUSES:**\n${analysis.deadline}\n\n`;
        }
        
        // Add motivation
        responseText += `**🎯 FINAL WORD:**\n${analysis.motivation}\n\n`;
        
        // Add signature
        responseText += `**I'll be checking on your progress!** 💪\n\n*Stay hard!*`;

        return {
            text: responseText,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: responseText
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: "🔥 *David Goggins is holding you accountable - reply with your progress updates!*"
                        }
                    ]
                }
            ]
        };
    }

    buildFallbackResponse(userMessage, userData) {
        const fallbackTexts = [
            `🔥 **${userData.name}** - I see you're reporting in, but I need MORE DETAILS next time!\n\n**What I want to see:**\n• Specific accomplishments\n• Challenges you faced\n• How you pushed through\n\n**Your deadline:** Tomorrow, tackle your hardest task FIRST! No warm-up tasks!\n\n**Stay hard!** 💪`,
            
            `⚡ **${userData.name}** - Good check-in, but let's level up!\n\n**Next time tell me:**\n• What you accomplished (be specific!)\n• What made you uncomfortable\n• How you grew today\n\n**Your challenge:** Do something that sucks tomorrow and thank me later!\n\n**Mental toughness is a lifestyle!** 🎯`,
            
            `💪 **${userData.name}** - I hear you, warrior!\n\n**Tomorrow's mission:**\n• Attack your day with more intensity\n• Document your wins AND struggles\n• Push through when your mind says quit\n\n**Remember:** You're only using 40% of your potential!\n\n**Stay hard!** 🔥`
        ];
        
        return {
            text: fallbackTexts[Math.floor(Math.random() * fallbackTexts.length)]
        };
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