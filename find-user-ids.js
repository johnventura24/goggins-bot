#!/usr/bin/env node

const { WebClient } = require('@slack/web-api');
const readline = require('readline');
const fs = require('fs');
const { SLACK_BOT_TOKEN } = require('./config');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
};

async function getAllUsers() {
    try {
        const client = new WebClient(SLACK_BOT_TOKEN);
        
        console.log('🔍 Fetching all users from your Slack workspace...');
        
        const response = await client.users.list();
        const users = response.members;
        
        // Filter out bots and deleted users
        const realUsers = users.filter(user => 
            !user.is_bot && 
            !user.deleted && 
            user.id !== 'USLACKBOT'
        ).map(user => ({
            id: user.id,
            name: user.real_name || 'Unknown',
            username: user.name || 'unknown',
            email: user.profile?.email || 'No email',
            displayName: user.profile?.display_name || '',
            title: user.profile?.title || 'No title'
        }));
        
        return realUsers;
        
    } catch (error) {
        console.error(`❌ Slack API Error: ${error.message}`);
        return [];
    }
}

function displayUsers(users) {
    if (!users || users.length === 0) {
        console.log('❌ No users found or error occurred');
        return;
    }
    
    console.log(`\n👥 Found ${users.length} team members:`);
    console.log('='.repeat(80));
    console.log(sprintf('%-3s %-20s %-15s %-12s %-20s', '#', 'Name', 'Username', 'User ID', 'Title'));
    console.log('-'.repeat(80));
    
    users.forEach((user, index) => {
        const name = user.name.substring(0, 19);
        const username = user.username.substring(0, 14);
        const title = user.title.substring(0, 19);
        
        console.log(sprintf('%-3d %-20s @%-14s %-12s %-20s', 
            index + 1, name, username, user.id, title
        ));
    });
}

function sprintf(format, ...args) {
    return format.replace(/%[-#+ 0]*[0-9]*\.?[0-9]*[hlL]?[diouxXeEfFgGcs]/g, match => {
        const arg = args.shift();
        return String(arg || '');
    });
}

function searchUsers(users, searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    
    return users.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.displayName.toLowerCase().includes(searchLower)
    );
}

function exportUsersToConfig(users) {
    console.log('\n📝 Generating real-users.js format:');
    console.log('='.repeat(50));
    
    let configTemplate = `// Copy this into your real-users.js file

const REAL_USERS = {
`;
    
    users.forEach(user => {
        const userKey = user.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        configTemplate += `    ${userKey}: {
        name: "${user.name}",
        slackId: "${user.id}",  // or "@${user.username}"
        role: "${user.title}",
        active: true,
        timezone: "America/New_York",
        preferredChannel: "#general",  // or "DMs"
        checkInDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        customGoals: []  // Add custom goals here
    },
    
`;
    });
    
    configTemplate += '};\n\nmodule.exports = { REAL_USERS };';
    
    try {
        fs.writeFileSync('generated-users-config.js', configTemplate);
        console.log('✅ Configuration saved to "generated-users-config.js"');
        console.log('📋 Copy the relevant users from this file into your real-users.js');
    } catch (error) {
        console.error(`❌ Error saving file: ${error.message}`);
        console.log('📋 Here\'s the configuration:');
        console.log(configTemplate);
    }
}

async function interactiveUserFinder() {
    console.log('🔍 SLACK USER ID FINDER');
    console.log('='.repeat(30));
    
    const users = await getAllUsers();
    if (!users || users.length === 0) {
        return;
    }
    
    while (true) {
        console.log('\n🎯 Options:');
        console.log('1. Show all users');
        console.log('2. Search for specific user');
        console.log('3. Export all users to config file');
        console.log('4. Exit');
        
        const choice = await question('\nChoose option (1-4): ');
        
        if (choice === '1') {
            displayUsers(users);
            
        } else if (choice === '2') {
            const searchTerm = await question('🔎 Enter name, username, or email to search: ');
            if (searchTerm.trim()) {
                const matches = searchUsers(users, searchTerm.trim());
                if (matches.length > 0) {
                    console.log(`\n🎯 Found ${matches.length} matches:`);
                    displayUsers(matches);
                    
                    if (matches.length === 1) {
                        const user = matches[0];
                        console.log(`\n📋 User Details:`);
                        console.log(`• Name: ${user.name}`);
                        console.log(`• Username: @${user.username}`);
                        console.log(`• User ID: ${user.id}`);
                        console.log(`• Email: ${user.email}`);
                        console.log(`• Title: ${user.title}`);
                        console.log(`\n✅ Use either:`);
                        console.log(`   slackId: "@${user.username}"`);
                        console.log(`   slackId: "${user.id}"`);
                    }
                } else {
                    console.log('❌ No matches found');
                }
            }
            
        } else if (choice === '3') {
            const confirm = await question('📤 Export all users to config file? (y/n): ');
            if (confirm.toLowerCase() === 'y') {
                exportUsersToConfig(users);
            }
            
        } else if (choice === '4') {
            break;
            
        } else {
            console.log('❌ Invalid choice');
        }
    }
    
    rl.close();
}

async function quickLookup(username) {
    const users = await getAllUsers();
    if (!users) return;
    
    const matches = searchUsers(users, username);
    if (matches.length > 0) {
        const user = matches[0];
        console.log(`✅ Found: ${user.name}`);
        console.log(`Username: @${user.username}`);
        console.log(`User ID: ${user.id}`);
        return user.id;
    } else {
        console.log(`❌ User '${username}' not found`);
        return null;
    }
}

async function main() {
    console.log('🔍 SLACK USER ID FINDER FOR DAVID GOGGINS BOT');
    console.log('='.repeat(55));
    console.log('This tool helps you find the correct Slack User IDs for your team');
    console.log('You can use either @username or User ID format in your bot config\n');
    
    // Test connection first
    try {
        const client = new WebClient(SLACK_BOT_TOKEN);
        const authResponse = await client.auth.test();
        console.log(`✅ Connected to Slack workspace: ${authResponse.team}`);
    } catch (error) {
        console.error(`❌ Failed to connect to Slack: ${error.message}`);
        console.log('💡 Check your SLACK_BOT_TOKEN in environment variables');
        return;
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Check if user wants quick lookup or interactive mode
    const args = process.argv.slice(2);
    if (args.length > 0) {
        // Quick lookup mode
        const username = args[0];
        console.log(`\n🔎 Quick lookup for: ${username}`);
        await quickLookup(username);
    } else {
        // Interactive mode
        await interactiveUserFinder();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    getAllUsers,
    searchUsers,
    quickLookup
}; 