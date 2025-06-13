// Real Users Configuration for David Goggins Bot
// Configure your actual team members here to receive daily check-ins

const REAL_USERS = {
    // Example user - replace with your actual team members
    john_doe: {
        name: "John Doe",
        slackId: "@john.doe", // Slack username or User ID (U1234567)
        role: "Software Engineer",
        active: true, // Set to false to temporarily disable check-ins
        timezone: "America/New_York", // User's timezone for proper scheduling
        preferredChannel: "DMs", // "DMs" for direct messages or "#channel-name" for channel
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"], // Customize days
        customGoals: [
            "Complete sprint deliverables",
            "Improve code quality",
            "Mentor team members"
        ]
    }

    // Add your team members here - copy the format above
    // team_member_username: {
    //     name: "Team Member Name",
    //     slackId: "@username or U1234567",
    //     role: "Their Role",
    //     active: true,
    //     timezone: "America/Los_Angeles",
    //     preferredChannel: "DMs",
    //     checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    //     customGoals: ["Goal 1", "Goal 2", "Goal 3"]
    // },
};

// Team Channels - Channels where the bot will post daily check-ins
const TEAM_CHANNELS = {
    main_accountability: {
        channel: "#general", // Replace with your actual channel
        active: true,
        checkInTime: "16:30", // 4:30 PM
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        messageType: "group_check_in" // or "individual_mention"
    }

    // Add more channels if needed
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
        slackId: "@sarah.johnson", // Use actual Slack username
        role: "Engineering Manager",
        active: true,
        timezone: "America/New_York",
        preferredChannel: "#general",
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: ["Team productivity", "Code quality", "Sprint delivery"]
    },
    mike_dev: {
        name: "Mike Chen",
        slackId: "@mike.chen",
        role: "Senior Developer",
        active: true,
        timezone: "America/Los_Angeles",
        preferredChannel: "#general",
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: ["Feature development", "Technical debt", "Mentoring"]
    },
    jessica_designer: {
        name: "Jessica Wu",
        slackId: "@jessica.wu",
        role: "UX Designer",
        active: true,
        timezone: "America/Chicago",
        preferredChannel: "#general",
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