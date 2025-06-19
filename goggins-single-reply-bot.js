#!/usr/bin/env node

/**
 * 🔥 DAVID GOGGINS BOT - SINGLE REPLY ONLY
 * 
 * This bot has:
 * - ONLY ONE message event handler (no duplicates)
 * - Proper greeting detection for "hey", "hi", etc.
 * - Deduplication logic to prevent multiple replies
 * - Enhanced debug logging
 */

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
    CHECK_IN_TIME
} = require('./config');

const {
    getActiveUsers,
    getUserBySlackId
} = require('./real-users');

const DeadlineManager = require('./deadline-manager');

class GogginsBot {
    constructor() {
        console.log('🔥 Initializing SINGLE REPLY Goggins Bot...');
        
        // Initialize Slack App
        this.app = new App({
            token: SLACK_BOT_TOKEN,
            signingSecret: SLACK_SIGNING_SECRET,
            socketMode: false,
            port: process.env.PORT || 3000,
            customRoutes: [
                {
                    path: '/health',
                    method: ['GET'],
                    handler: (req, res) => {
                        res.writeHead(200);
                        res.end('🔥 Goggins Bot is ALIVE! 💪');
                    }
                }
            ]
        });

        // Initialize OpenAI (with fallback handling)
        this.openai = null;
        if (OPENAI_API_KEY && !OPENAI_API_KEY.includes('your_ope')) {
            this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });
            console.log('✅ OpenAI enabled');
        } else {
            console.log('⚠️ OpenAI not configured - using fallback responses');
        }

        // Track processed messages to prevent duplicates
        this.processedMessages = new Map();
        this.recentCheckIns = new Map();
        this.lastCheckInTime = null;
        
        // Initialize Deadline Manager
        this.deadlineManager = new DeadlineManager();

        // Setup SINGLE event handler
        this.setupSingleEventHandler();
        this.setupScheduler();
        
        console.log('✅ SINGLE REPLY Goggins Bot initialized! 🔥');
    }

    setupSingleEventHandler() {
        console.log('📡 Setting up SINGLE event handler (no duplicates)...');

        // ONLY ONE MESSAGE HANDLER - handles ALL message types
        this.app.event('message', async ({ event, client }) => {
            try {
                // Skip bot messages, edited messages, and messages without text
                if (event.subtype === 'bot_message' || 
                    event.subtype === 'message_changed' ||
                    !event.user || 
                    !event.text) {
                    return;
                }

                // Create unique message ID for deduplication
                const messageId = `${event.user}-${event.ts}-${event.channel}`;
                
                if (this.processedMessages.has(messageId)) {
                    console.log(`🔄 DUPLICATE SKIPPED: ${messageId}`);
                    return;
                }
                
                // Mark as processed (expires after 5 minutes)
                this.processedMessages.set(messageId, Date.now());
                setTimeout(() => this.processedMessages.delete(messageId), 5 * 60 * 1000);

                console.log(`📨 NEW MESSAGE: ${event.user} in ${event.channel}`);
                console.log(`📝 Text: "${event.text}"`);

                // Process the message ONCE
                await this.handleSingleMessage(event);
                
            } catch (error) {
                console.error('❌ Error in SINGLE message handler:', error);
            }
        });

        // Mentions handler (separate from regular messages)
        this.app.event('app_mention', async ({ event, say }) => {
            try {
                const messageId = `mention-${event.user}-${event.ts}`;
                
                if (this.processedMessages.has(messageId)) {
                    console.log(`🔄 DUPLICATE MENTION SKIPPED: ${messageId}`);
                    return;
                }
                
                this.processedMessages.set(messageId, Date.now());
                setTimeout(() => this.processedMessages.delete(messageId), 5 * 60 * 1000);

                console.log(`📢 MENTION: ${event.user} mentioned bot`);
                
                const cleanText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
                
                if (cleanText.length > 5) {
                    // Treat substantial mentions as messages
                    const mentionEvent = { ...event, text: cleanText };
                    await this.handleSingleMessage(mentionEvent);
                } else {
                    // Simple mention - encourage them to share
                    await say({
                        text: `🔥 What's up, warrior! Tell me about your day - what did you accomplish? Stay hard! 💪`,
                        channel: event.channel
                    });
                }
            } catch (error) {
                console.error('❌ Error handling mention:', error);
            }
        });

        console.log('✅ SINGLE event handler setup complete - NO DUPLICATES!');
    }

    async handleSingleMessage(event) {
        try {
            const { text, user: userId, channel, ts: messageTs } = event;
            
            console.log(`🔍 PROCESSING: "${text}" from ${userId}`);
            
            // Get user data
            const userData = getUserBySlackId(userId);
            const userContext = userData?.userData || {
                name: 'Warrior',
                role: 'Team Member',
                customGoals: ['Stay hard']
            };

            // Determine message type
            const isDM = channel && channel.startsWith('D');
            
            // Check if we should respond
            const shouldRespond = this.shouldGogginsBite(text, isDM);
            
            if (shouldRespond) {
                console.log(`✅ RESPONDING to message from ${userContext.name}`);
                await this.sendSingleResponse(text, userId, channel, messageTs, userContext);
            } else {
                console.log(`📝 NOT RESPONDING to message from ${userContext.name}`);
            }
            
        } catch (error) {
            console.error('❌ Error handling single message:', error);
        }
    }

    shouldGogginsBite(messageText, isDM) {
        if (!messageText || messageText.trim().length < 3) {
            console.log(`🔍 "${messageText}": ❌ TOO SHORT`);
            return false;
        }

        const text = messageText.toLowerCase().trim();
        const wordCount = text.split(' ').length;
        
        // Keywords that trigger responses
        const triggerWords = [
            // Greetings
            'hey', 'hi', 'hello', 'morning', 'afternoon', 'evening',
            
            // Day descriptors
            'day', 'today', 'work', 'job', 'productive', 'busy', 'tired',
            'good', 'bad', 'great', 'tough', 'hard', 'easy', 'difficult',
            
            // Actions
            'finished', 'completed', 'accomplished', 'did', 'worked',
            'struggled', 'failed', 'succeeded', 'won', 'lost',
            
            // Work terms
            'tasks', 'goals', 'projects', 'meetings', 'deadline',
            'report', 'presentation', 'analysis',
            
            // Goggins terms
            'stayed hard', 'took souls', 'comfort zone', 'grind',
            
            // Responses to check-ins
            'thanks', 'thank you'
        ];

        const hasKeywords = triggerWords.some(keyword => text.includes(keyword));
        
        // DMs are more responsive
        const isDMAndSubstantial = isDM && wordCount >= 1;
        
        // Within check-in window
        const isWithinWindow = this.isWithinCheckinWindow();
        
        // Longer messages
        const isLongMessage = wordCount >= 5;
        
        const shouldRespond = hasKeywords || isDMAndSubstantial || (isWithinWindow && isLongMessage);
        
        // Enhanced debug logging
        console.log(`🔍 DETECTION for "${text.substring(0, 30)}..."`);
        console.log(`   → Keywords: ${hasKeywords ? '✅' : '❌'} (found: ${triggerWords.filter(word => text.includes(word)).join(', ') || 'none'})`);
        console.log(`   → Length: ${text.length >= 3 ? '✅' : '❌'} (${text.length} chars, ${wordCount} words)`);
        console.log(`   → isDM: ${isDM ? '✅' : '❌'}`);
        console.log(`   → DM+Substantial: ${isDMAndSubstantial ? '✅' : '❌'}`);
        console.log(`   → Window: ${isWithinWindow ? '✅' : '❌'}`);
        console.log(`   → Final: ${shouldRespond ? '✅ WILL RESPOND' : '❌ WILL NOT RESPOND'}`);
        
        return shouldRespond;
    }

    isWithinCheckinWindow() {
        if (!this.lastCheckInTime) {
            return true; // Always responsive if no check-ins sent yet
        }
        
        const now = moment();
        const checkInTime = moment(this.lastCheckInTime);
        const hoursSince = now.diff(checkInTime, 'hours');
        
        return hoursSince <= 8; // 8 hour window after check-ins
    }

    async sendSingleResponse(messageText, userId, channel, messageTs, userContext) {
        try {
            console.log(`🤖 GENERATING response for ${userContext.name}...`);
            
            // Generate response - PRIORITIZE OpenAI
            let response;
            if (this.openai) {
                try {
                    console.log('🤖 Using OpenAI for AI-powered Goggins response...');
                    response = await this.generateAIResponse(messageText, userContext, userId);
                    console.log('✅ OpenAI response generated successfully');
                } catch (error) {
                    console.error('❌ OpenAI failed, using fallback response:', error.message);
                    response = this.generateFallbackResponse(messageText, userContext, userId);
                }
            } else {
                console.log('⚠️ Using fallback response (OpenAI not available)');
                response = this.generateFallbackResponse(messageText, userContext, userId);
            }

            // Send SINGLE response
            await this.app.client.chat.postMessage({
                channel: channel,
                text: response,
                thread_ts: messageTs,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: response
                        }
                    }
                ]
            });

            console.log(`✅ SINGLE RESPONSE sent to ${userContext.name}`);
            
        } catch (error) {
            console.error('❌ Error sending response:', error);
            
            // Fallback simple response
            try {
                await this.app.client.chat.postMessage({
                    channel: channel,
                    text: "🔥 Stay hard, warrior! 💪",
                    thread_ts: messageTs
                });
            } catch (fallbackError) {
                console.error('❌ Even fallback failed:', fallbackError);
            }
        }
    }

    async generateAIResponse(messageText, userContext, userId) {
        const prompt = `You are David Goggins responding to ${userContext.name}'s message: "${messageText}"

Respond as David Goggins with:
- Tough love and motivation
- Reference their role: ${userContext.role}
- Keep it under 100 words
- Use phrases like "stay hard", "take souls", "accountability"
- Be direct but supportive
- Include a specific actionable challenge for tomorrow

Response:`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are David Goggins. Be motivational but tough." },
                { role: "user", content: prompt }
            ],
            max_tokens: 150,
            temperature: 0.8
        });

        let aiResponse = response.choices[0].message.content.trim();
        
        // Add deadline to response
        const deadline = this.deadlineManager.generateRoleSpecificDeadline(userContext.role, messageText);
        this.deadlineManager.addDeadline(userId, userContext.name, userContext.role, deadline.task, deadline.dueDate, deadline.type);
        
        aiResponse += this.deadlineManager.generateDeadlineInclusionMessage(deadline);
        
        return aiResponse;
    }

    generateFallbackResponse(messageText, userContext, userId) {
        const text = messageText.toLowerCase();
        const name = userContext.name;
        let response = '';
        
        // Simple greeting responses
        if (text.includes('hey') || text.includes('hi') || text.includes('hello')) {
            const greetings = [
                `🔥 **${name}!** What's up, warrior! Ready to get after it today? Stay hard! 💪`,
                `💪 **${name}**, I see you checking in! Time to face the accountability mirror - what did you accomplish today? 🔥`,
                `🎯 **${name}!** Don't just say hey - tell me what you're doing to level up today! Take souls! ⚡`
            ];
            response = greetings[Math.floor(Math.random() * greetings.length)];
        }
        // Positive day responses
        else if (text.includes('good') || text.includes('great') || text.includes('productive')) {
            response = `🔥 **${name}!** I hear you putting in work! But don't get comfortable - tomorrow we push even harder! What's your plan to level up? Stay hard! 💪`;
        }
        // Struggle responses
        else if (text.includes('tough') || text.includes('hard') || text.includes('difficult') || text.includes('struggled')) {
            response = `💪 **${name}**, that's when champions are made! Every struggle is callousing your mind. Embrace the suck and come back stronger tomorrow! Stay hard! 🔥`;
        }
        // Default response
        else {
            response = `🔥 **${name}!** I respect you for showing up! Now tell me - what are you doing today that's going to make you better than you were yesterday? Stay hard! 💪`;
        }
        
        // Add deadline if this is a substantial response (not just a greeting)
        if (text.length > 20 && !text.includes('hey') && !text.includes('hi') && !text.includes('hello')) {
            const deadline = this.deadlineManager.generateRoleSpecificDeadline(userContext.role, messageText);
            this.deadlineManager.addDeadline(userId, userContext.name, userContext.role, deadline.task, deadline.dueDate, deadline.type);
            response += this.deadlineManager.generateDeadlineInclusionMessage(deadline);
        }
        
        return response;
    }

    setupScheduler() {
        const [hour, minute] = CHECK_IN_TIME.split(':');
        const cronExpression = `${minute} ${hour} * * 1-5`;

        cron.schedule(cronExpression, async () => {
            console.log('🕐 DAILY CHECK-IN TIME!');
            this.lastCheckInTime = new Date();
            await this.sendDailyCheckIns();
        }, {
            scheduled: true,
            timezone: "America/New_York"
        });

        // Schedule deadline reminders for 9 AM daily
        cron.schedule('0 9 * * 1-5', async () => {
            console.log('📅 CHECKING OVERDUE DEADLINES...');
            await this.checkAndRemindOverdueDeadlines();
        }, {
            scheduled: true,
            timezone: "America/New_York"
        });

        // Clean up old deadlines weekly (Sundays at midnight)
        cron.schedule('0 0 * * 0', async () => {
            console.log('🧹 CLEANING UP OLD DEADLINES...');
            const cleaned = this.deadlineManager.cleanupOldDeadlines();
            if (cleaned > 0) {
                console.log(`✅ Cleaned up ${cleaned} old completed deadlines`);
            }
        }, {
            scheduled: true,
            timezone: "America/New_York"
        });

        console.log(`⏰ Daily check-ins scheduled for ${CHECK_IN_TIME} EST`);
        console.log(`📅 Deadline reminders scheduled for 9:00 AM EST`);
        console.log(`🧹 Weekly cleanup scheduled for Sundays at midnight`);
    }

    async sendDailyCheckIns() {
        try {
            const users = getActiveUsers();
            let sentCount = 0;

            for (const [userId, userData] of Object.entries(users)) {
                try {
                    // Check for overdue deadlines first
                    const overdueDeadlines = this.deadlineManager.getOverdueDeadlines(userData.slackId);
                    
                    let message;
                    if (overdueDeadlines.length > 0) {
                        // Send overdue deadline reminder instead of regular check-in
                        const deadlineUserData = this.deadlineManager.getUserDeadlines(userData.slackId);
                        message = this.deadlineManager.generateReminderMessage(deadlineUserData, overdueDeadlines);
                    } else {
                        // Regular check-in message
                        message = `🔥 **${userData.name}!** End of day accountability check!\n\n**Tell me what you accomplished today:**\n• What specific tasks did you complete?\n• What challenges did you overcome?\n• How did you push yourself outside your comfort zone?\n\n*Don't give me some weak response. I want details! Stay hard!* 💪`;
                    }

                    await this.app.client.chat.postMessage({
                        channel: userData.slackId,
                        text: message
                    });

                    console.log(`✅ Check-in sent to ${userData.name}${overdueDeadlines.length > 0 ? ' (with overdue deadline reminder)' : ''}`);
                    sentCount++;
                } catch (error) {
                    console.error(`❌ Failed to send check-in to ${userData.name}:`, error);
                }
            }

            console.log(`✅ Daily check-ins sent to ${sentCount} users`);
            this.recentCheckIns.set('last_checkin', moment());
            
        } catch (error) {
            console.error('❌ Error in daily check-in process:', error);
        }
    }

    // Add method to check and remind overdue deadlines
    async checkAndRemindOverdueDeadlines() {
        try {
            const overdueUsers = this.deadlineManager.getAllOverdueDeadlines();
            let reminderCount = 0;

            for (const [userId, userData] of Object.entries(overdueUsers)) {
                try {
                    const message = this.deadlineManager.generateReminderMessage(userData, userData.overdueDeadlines);
                    
                    await this.app.client.chat.postMessage({
                        channel: userId,
                        text: message
                    });

                    // Mark deadlines as reminded
                    userData.overdueDeadlines.forEach(deadline => {
                        this.deadlineManager.markAsReminded(userId, deadline.id);
                    });

                    console.log(`⚠️ Overdue deadline reminder sent to ${userData.name}`);
                    reminderCount++;
                } catch (error) {
                    console.error(`❌ Failed to send reminder to ${userData.name}:`, error);
                }
            }

            if (reminderCount > 0) {
                console.log(`📅 Sent ${reminderCount} overdue deadline reminders`);
            }
            
        } catch (error) {
            console.error('❌ Error checking overdue deadlines:', error);
        }
    }

    async start() {
        try {
            await this.app.start();
            console.log('🔥 SINGLE REPLY Goggins Bot is LIVE! 💪');
            console.log('📡 Only ONE event handler active - no duplicate replies!');
            console.log(`🌐 Running on port ${process.env.PORT || 3000}`);
        } catch (error) {
            console.error('❌ Error starting bot:', error);
        }
    }
}

module.exports = GogginsBot;

if (require.main === module) {
    const bot = new GogginsBot();
    bot.start().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
} 