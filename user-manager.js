const moment = require('moment-timezone');
const {
    getActiveUsers,
    getActiveChannels,
    getUserBySlackId
} = require('./real-users');

const {
    PROFESSIONAL_GOGGINS_MESSAGES
} = require('./config');

class UserManager {
    constructor(slackClient) {
        this.slackClient = slackClient;
        this.activeUsers = getActiveUsers();
        this.activeChannels = getActiveChannels();
    }

    getUsersForDailyCheckin(dayOfWeek = null) {
        if (!dayOfWeek) {
            dayOfWeek = moment().format('dddd').toLowerCase();
        }

        const eligibleUsers = [];
        for (const [userId, userData] of Object.entries(this.activeUsers)) {
            if (this.shouldUserGetCheckinToday(userData, dayOfWeek)) {
                eligibleUsers.push({ userId, userData });
            }
        }

        return eligibleUsers;
    }

    shouldUserGetCheckinToday(userData, dayOfWeek) {
        const checkInDays = userData.checkInDays || ["monday", "tuesday", "wednesday", "thursday", "friday"];
        return checkInDays.includes(dayOfWeek);
    }

    async sendGroupCheckinToChannel(channelName) {
        try {
            // Get users who prefer this channel
            const usersInChannel = [];
            for (const [userId, userData] of Object.entries(this.activeUsers)) {
                if (userData.preferredChannel === channelName || userData.preferredChannel === "group") {
                    usersInChannel.push(userData);
                }
            }

            if (usersInChannel.length === 0) {
                console.log(`⚠️ No active users configured for channel ${channelName}`);
                return null;
            }

            // Create mentions string
            const mentions = usersInChannel
                .map(user => `<${user.slackId}>`)
                .join(' ');

            // Select message
            const message = PROFESSIONAL_GOGGINS_MESSAGES[
                Math.floor(Math.random() * PROFESSIONAL_GOGGINS_MESSAGES.length)
            ];

            // Add personalized mentions
            const fullMessage = `${mentions}\n\n${message}`;

            // Send message
            const response = await this.slackClient.chat.postMessage({
                channel: channelName,
                text: fullMessage
            });

            const userCount = usersInChannel.length;
            console.log(`✅ Group check-in sent to ${channelName} for ${userCount} users`);
            return response;

        } catch (error) {
            console.error(`❌ Error sending group check-in to ${channelName}:`, error.message);
            return null;
        }
    }

    async sendIndividualDmCheckins() {
        const dmResults = [];

        for (const [userId, userData] of Object.entries(this.activeUsers)) {
            if (userData.preferredChannel === "DMs") {
                const result = await this.sendIndividualCheckin(userId, userData);
                if (result) {
                    dmResults.push(result);
                }
            }
        }

        console.log(`✅ Sent ${dmResults.length} individual DM check-ins`);
        return dmResults;
    }

    async sendIndividualCheckin(userId, userData) {
        try {
            // Personalized message
            const message = PROFESSIONAL_GOGGINS_MESSAGES[
                Math.floor(Math.random() * PROFESSIONAL_GOGGINS_MESSAGES.length)
            ];

            // Add personal touch
            let personalMessage = `Hey ${userData.name}! 👋\n\n${message}`;

            // Add role-specific goals if available
            if (userData.customGoals && userData.customGoals.length > 0) {
                const goalsText = userData.customGoals
                    .map(goal => `• ${goal}`)
                    .join('\n');
                personalMessage += `\n\n**Your Key Focus Areas:**\n${goalsText}`;
            }

            // Send DM
            const response = await this.slackClient.chat.postMessage({
                channel: userData.slackId,
                text: personalMessage
            });

            console.log(`✅ Individual check-in sent to ${userData.name}`);
            return response;

        } catch (error) {
            console.error(`❌ Error sending individual check-in to ${userData.name}:`, error.message);
            return null;
        }
    }

    async sendAllDailyCheckins() {
        const results = {
            groupCheckins: [],
            individualCheckins: [],
            errors: []
        };

        try {
            // Send group check-ins to active channels
            for (const [channelId, channelData] of Object.entries(this.activeChannels)) {
                if (channelData.messageType === "group_check_in") {
                    const result = await this.sendGroupCheckinToChannel(channelData.channel);
                    if (result) {
                        results.groupCheckins.push({
                            channel: channelData.channel,
                            result: result
                        });
                    }
                }
            }

            // Send individual DMs
            const dmResults = await this.sendIndividualDmCheckins();
            results.individualCheckins = dmResults;

            // Summary
            const totalSent = results.groupCheckins.length + results.individualCheckins.length;
            console.log(`🔥 DAILY CHECK-IN SUMMARY:`);
            console.log(`📺 Group check-ins: ${results.groupCheckins.length}`);
            console.log(`💬 Individual DMs: ${results.individualCheckins.length}`);
            console.log(`📊 Total messages sent: ${totalSent}`);

            return results;

        } catch (error) {
            console.error(`❌ Error in sendAllDailyCheckins:`, error.message);
            results.errors.push(error.message);
            return results;
        }
    }

    async handleUserResponse(slackUserId, messageText, channel) {
        const userInfo = getUserBySlackId(slackUserId);

        if (!userInfo) {
            console.log(`⚠️ Unknown user responded: ${slackUserId}`);
            return null;
        }

        const { userId, userData } = userInfo;

        // Log the response
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        console.log(`📨 Response from ${userData.name} (${userData.role}) at ${timestamp}`);
        console.log(`💬 Message: ${messageText.substring(0, 100)}...`);

        // Generate personalized Goggins response
        const DavidGogginsBot = require('./index');
        const bot = new DavidGogginsBot();

        // Add user context to response generation
        const userContext = {
            name: userData.name,
            role: userData.role,
            goals: userData.customGoals || []
        };

        const gogginsResponse = await bot.generateGogginsResponse(messageText, userContext);

        // Send personalized response
        try {
            const response = await this.slackClient.chat.postMessage({
                channel: channel,
                text: `<@${slackUserId}> ${gogginsResponse}`
            });

            console.log(`✅ Goggins response sent to ${userData.name}`);
            return response;

        } catch (error) {
            console.error(`❌ Error sending response to ${userData.name}:`, error.message);
            return null;
        }
    }

    getUserStats() {
        const allUsers = Object.keys(require('./real-users').REAL_USERS);
        const stats = {
            totalUsers: allUsers.length,
            activeUsers: Object.keys(this.activeUsers).length,
            inactiveUsers: allUsers.length - Object.keys(this.activeUsers).length,
            channels: Object.keys(this.activeChannels).length,
            dmUsers: Object.values(this.activeUsers).filter(u => u.preferredChannel === "DMs").length,
            channelUsers: Object.values(this.activeUsers).filter(u => u.preferredChannel !== "DMs").length
        };
        return stats;
    }

    listAllUsers() {
        console.log("👥 CONFIGURED TEAM MEMBERS:");
        console.log("=".repeat(50));

        const { REAL_USERS } = require('./real-users');
        for (const [userId, userData] of Object.entries(REAL_USERS)) {
            const status = userData.active !== false ? "🟢 Active" : "🔴 Inactive";
            const channel = userData.preferredChannel || "Not set";
            console.log(`• ${userData.name} (${userData.role}) - ${status}`);
            console.log(`  Slack: ${userData.slackId} | Channel: ${channel}`);
        }

        const stats = this.getUserStats();
        console.log(`\n📊 SUMMARY:`);
        console.log(`Total: ${stats.totalUsers} | Active: ${stats.activeUsers} | DMs: ${stats.dmUsers} | Channels: ${stats.channelUsers}`);
    }

    testUserSetup() {
        console.log("🧪 TESTING USER SETUP");
        console.log("=".repeat(50));

        const issues = [];
        const { REAL_USERS } = require('./real-users');

        // Check for users without Slack IDs
        for (const [userId, userData] of Object.entries(REAL_USERS)) {
            if (!userData.slackId) {
                issues.push(`❌ ${userData.name}: Missing slackId`);
            }
        }

        // Check for duplicate Slack IDs
        const slackIds = Object.values(REAL_USERS)
            .map(u => u.slackId)
            .filter(Boolean);
        const duplicates = slackIds.filter((id, index) => slackIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
            issues.push(`❌ Duplicate Slack IDs: ${[...new Set(duplicates)].join(', ')}`);
        }

        // Check channel configuration
        if (Object.keys(this.activeChannels).length === 0) {
            issues.push("❌ No active channels configured");
        }

        if (issues.length > 0) {
            console.log("🚨 CONFIGURATION ISSUES FOUND:");
            issues.forEach(issue => console.log(`  ${issue}`));
        } else {
            console.log("✅ User configuration looks good!");
        }

        // Show summary
        const stats = this.getUserStats();
        console.log(`\n📊 Configuration Summary:`);
        console.log(`• ${stats.activeUsers} active users`);
        console.log(`• ${stats.channels} active channels`);
        console.log(`• ${stats.dmUsers} users prefer DMs`);
        console.log(`• ${stats.channelUsers} users prefer channels`);

        return issues.length === 0;
    }
}

module.exports = UserManager; 