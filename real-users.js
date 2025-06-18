// Real Users Configuration for David Goggins Bot
// These are the actual team members who will receive daily check-ins

const REAL_USERS = {
    // Add your team members here with their actual Slack User IDs
    // To find User IDs, run: node find-user-ids.js
    
    // Example user - replace with your actual team members
    marnie_assistant: {
        name: "Marnie",
        slackId: "U078UMV769F", 
        role: "Executive Assistant",
        active: true,
        timezone: "America/New_York",
        preferredChannel: "DMs",
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: [
            "Complete daily tasks efficiently",
            "Support team productivity",
            "Maintain organized workflows"
        ]
    },

    // Team Members
    john_founder: {
        name: "John",
        slackId: "U02L4D5TED6",
        role: "Founder/CEO",
        active: true,
        timezone: "America/New_York",
        preferredChannel: "DMs",
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: ["Lead company vision", "Drive strategic growth", "Mentor team"]
    },
    
    alan_assistant: {
        name: "Alan",
        slackId: "U07SEU8ENDA",
        role: "Executive Assistant",
        active: true,
        timezone: "America/New_York",
        preferredChannel: "DMs", 
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: ["Support executive operations", "Manage schedules efficiently", "Coordinate team communications"]
    },

    niki_social: {
        name: "Niki",
        slackId: "U071JBZM2KV",
        role: "Social Media",
        active: true,
        timezone: "America/New_York",
        preferredChannel: "DMs",
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: ["Create engaging content", "Grow social media presence", "Drive brand awareness"]
    },

    // Add your team members here - copy the format above
    // team_member_1: {
    //     name: "Team Member Name",
    //     slackId: "U2345678901", // ACTUAL User ID from find-user-ids.js
    //     role: "Their Role",
    //     active: true,
    //     timezone: "America/Los_Angeles",
    //     preferredChannel: "DMs",
    //     checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    //     customGoals: ["Goal 1", "Goal 2", "Goal 3"]
    // },
    
    // team_member_2: {
    //     name: "Another Team Member",
    //     slackId: "U3456789012", // ACTUAL User ID from find-user-ids.js
    //     role: "Their Role",
    //     active: true,
    //     timezone: "America/Chicago",
    //     preferredChannel: "DMs",
    //     checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    //     customGoals: ["Goal 1", "Goal 2", "Goal 3"]
    // }
};

// Team Channels - Only use channels where the bot has been explicitly invited
// By default, the bot will send DMs to respect Slack etiquette
const TEAM_CHANNELS = {
    // main_accountability: {
    //     channel: "#general", // Only use if bot is invited to this channel
    //     active: false, // Disabled by default - use DMs instead
    //     checkInTime: "16:30", // 4:30 PM
    //     days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    //     messageType: "group_check_in" // or "individual_mention"
    // }

    // Add channels ONLY if the bot has been explicitly invited
    // dev_team: {
    //     channel: "#dev-team",
    //     active: true,
    //     checkInTime: "17:00", // 5:00 PM
    //     days: ["monday", "wednesday", "friday"],
    //     messageType: "group_check_in"
    // }
};

// User Groups - Organize users by teams/departments
const USER_GROUPS = {
    engineering: {
        members: [], // Add user keys from REAL_USERS
        channel: "#engineering",
        customCheckInTime: "16:30"
    },
    sales: {
        members: [], // Add user keys from REAL_USERS
        channel: "#sales",
        customCheckInTime: "17:00" // Later for sales team
    },
    all_hands: {
        members: Object.keys(REAL_USERS), // All users
        channel: "#general",
        customCheckInTime: "16:30"
    }
};

// Helper functions
function getActiveUsers() {
    const activeUsers = {};
    for (const [userId, userData] of Object.entries(REAL_USERS)) {
        if (userData.active !== false) {
            activeUsers[userId] = userData;
        }
    }
    return activeUsers;
}

function getActiveChannels() {
    const activeChannels = {};
    for (const [channelId, channelData] of Object.entries(TEAM_CHANNELS)) {
        if (channelData.active !== false) {
            activeChannels[channelId] = channelData;
        }
    }
    return activeChannels;
}

function getUserBySlackId(slackId) {
    for (const [userId, userData] of Object.entries(REAL_USERS)) {
        if (userData.slackId === slackId) {
            return { userId, userData };
        }
    }
    return null;
}

function shouldCheckInToday(userData, dayOfWeek) {
    const checkInDays = userData.checkInDays || ["monday", "tuesday", "wednesday", "thursday", "friday"];
    return checkInDays.includes(dayOfWeek.toLowerCase());
}

// Easy configuration functions
function addTeamMember(name, slackId, role, options = {}) {
    const userKey = name.toLowerCase().replace(/\s+/g, '_');
    REAL_USERS[userKey] = {
        name,
        slackId,
        role,
        active: true,
        timezone: options.timezone || "America/New_York",
        preferredChannel: options.preferredChannel || "DMs",
        checkInDays: options.checkInDays || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: options.customGoals || []
    };
    return userKey;
}

function deactivateUser(userKey) {
    if (REAL_USERS[userKey]) {
        REAL_USERS[userKey].active = false;
    }
}

function activateUser(userKey) {
    if (REAL_USERS[userKey]) {
        REAL_USERS[userKey].active = true;
    }
}

// Example team setup - Replace with your actual team
const EXAMPLE_REAL_TEAM = {
    sarah_manager: {
        name: "Sarah Johnson",
        slackId: "U1234567890", // REPLACE with actual User ID from find-user-ids.js
        role: "Engineering Manager",
        active: true,
        timezone: "America/New_York",
        preferredChannel: "DMs", // DMs are default - bot sends direct messages
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: ["Team productivity", "Code quality", "Sprint delivery"]
    },
    mike_dev: {
        name: "Mike Chen",
        slackId: "U2345678901", // REPLACE with actual User ID from find-user-ids.js
        role: "Senior Developer",
        active: true,
        timezone: "America/Los_Angeles",
        preferredChannel: "DMs", // DMs are default - bot sends direct messages
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: ["Feature development", "Technical debt", "Mentoring"]
    },
    jessica_designer: {
        name: "Jessica Wu",
        slackId: "U3456789012", // REPLACE with actual User ID from find-user-ids.js
        role: "UX Designer",
        active: true,
        timezone: "America/Chicago",
        preferredChannel: "DMs", // DMs are default - bot sends direct messages
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: ["User research", "Design system", "Prototyping"]
    }
};

module.exports = {
    REAL_USERS,
    TEAM_CHANNELS,
    USER_GROUPS,
    getActiveUsers,
    getActiveChannels,
    getUserBySlackId,
    shouldCheckInToday,
    addTeamMember,
    deactivateUser,
    activateUser,
    EXAMPLE_REAL_TEAM
}; 