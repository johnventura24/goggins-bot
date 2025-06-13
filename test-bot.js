#!/usr/bin/env node

const DavidGogginsBot = require('./index');
const UserManager = require('./user-manager');
const { WebClient } = require('@slack/web-api');
const readline = require('readline');

const {
    SLACK_BOT_TOKEN,
    PROFESSIONAL_GOGGINS_MESSAGES,
    GOGGINS_PHRASES
} = require('./config');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
};

function testDailyMessages() {
    console.log('🧪 TESTING DAILY CHECK-IN MESSAGES');
    console.log('='.repeat(50));
    
    PROFESSIONAL_GOGGINS_MESSAGES.forEach((message, index) => {
        console.log(`\n📨 Sample Message #${index + 1}:`);
        console.log('-'.repeat(30));
        console.log(message);
        console.log('-'.repeat(30));
    });
    
    console.log(`\n✅ Total of ${PROFESSIONAL_GOGGINS_MESSAGES.length} daily messages configured`);
}

async function testResponseGeneration() {
    console.log('\n\n🧪 TESTING RESPONSE GENERATION');
    console.log('='.repeat(50));
    
    try {
        const bot = new DavidGogginsBot();
        console.log('✅ Bot initialized successfully!');
        
        const testScenarios = [
            {
                name: "Successful Day",
                message: "I had a great day! Completed my workout, finished three important tasks at work, and studied for an hour. Feeling accomplished and ready for tomorrow.",
                userContext: { name: "John", role: "Developer", goals: ["Code quality", "Learning"] }
            },
            {
                name: "Challenging Day",
                message: "Today was tough. I skipped my morning run, didn't finish my project deadline, and felt overwhelmed. I'm disappointed in myself.",
                userContext: { name: "Sarah", role: "Designer", goals: ["Project delivery", "Work-life balance"] }
            },
            {
                name: "Mixed Day",
                message: "Did well on some things - got my workout in and ate healthy. But I procrastinated on important work tasks and spent too much time on social media.",
                userContext: { name: "Mike", role: "Manager", goals: ["Team leadership", "Productivity"] }
            },
            {
                name: "Short Response",
                message: "Okay day, could have been better.",
                userContext: { name: "Alex", role: "Analyst", goals: ["Data analysis"] }
            }
        ];
        
        for (const scenario of testScenarios) {
            console.log(`\n🎯 Testing Scenario: ${scenario.name}`);
            console.log(`👤 User: ${scenario.userContext.name} (${scenario.userContext.role})`);
            console.log(`📝 User Input: "${scenario.message}"`);
            console.log('\n🤖 Goggins Response:');
            console.log('-'.repeat(40));
            
            try {
                const response = await bot.generateGogginsResponse(scenario.message, scenario.userContext);
                console.log(response);
            } catch (error) {
                console.log(`❌ Error generating response: ${error.message}`);
                console.log('📋 Fallback response:');
                console.log(bot.getFallbackResponse());
            }
            
            console.log('-'.repeat(40));
            
            // Ask to continue
            const continueTest = await question('\nPress Enter to continue to next test scenario...');
        }
        
    } catch (error) {
        console.log(`❌ Failed to initialize bot: ${error.message}`);
        console.log('💡 This might be due to missing API keys or configuration');
        console.log('🔧 Check your .env file and ensure all required tokens are set');
    }
}

async function testSchedulerSetup() {
    console.log('\n\n🧪 TESTING SCHEDULER SETUP');
    console.log('='.repeat(50));
    
    try {
        const bot = new DavidGogginsBot();
        console.log('✅ Scheduler configured successfully!');
        console.log(`⏰ Check-in time: 4:30 PM (16:30)`);
        console.log(`📅 Active days: Monday through Friday`);
        console.log(`🕐 Current time: ${new Date().toLocaleString()}`);
        
        // Test manual check-in
        console.log('\n🔨 Testing manual check-in...');
        try {
            const result = await bot.manualCheckin();
            if (result) {
                console.log('✅ Manual check-in test successful!');
            } else {
                console.log('⚠️ Manual check-in returned no result (might be normal if Slack not configured)');
            }
        } catch (error) {
            console.log(`❌ Manual check-in failed: ${error.message}`);
        }
        
    } catch (error) {
        console.log(`❌ Scheduler setup failed: ${error.message}`);
    }
}

function checkConfiguration() {
    console.log('🧪 CHECKING CONFIGURATION');
    console.log('='.repeat(50));
    
    const requiredVars = [
        'SLACK_BOT_TOKEN',
        'OPENAI_API_KEY'
    ];
    
    const optionalVars = [
        'SLACK_CHANNEL',
        'SLACK_SIGNING_SECRET',
        'PORT'
    ];
    
    console.log('\n📋 Required Environment Variables:');
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            const masked = '*'.repeat(Math.min(10, value.length)) + '...';
            console.log(`✅ ${varName}: ${masked}`);
        } else {
            console.log(`❌ ${varName}: Not set`);
        }
    });
    
    console.log('\n📋 Optional Environment Variables:');
    optionalVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`✅ ${varName}: ${value}`);
        } else {
            console.log(`⚠️ ${varName}: Not set (using defaults)`);
        }
    });
    
    // Check if .env file exists
    const fs = require('fs');
    if (fs.existsSync('.env')) {
        console.log('\n✅ .env file found');
    } else {
        console.log('\n⚠️ .env file not found - using system environment variables');
        console.log('💡 Consider creating a .env file with your tokens');
    }
}

async function testUserSetup() {
    console.log('\n\n🧪 TESTING USER SETUP');
    console.log('='.repeat(50));
    
    try {
        if (!SLACK_BOT_TOKEN) {
            console.log('❌ SLACK_BOT_TOKEN not set - skipping user tests');
            return;
        }
        
        const client = new WebClient(SLACK_BOT_TOKEN);
        const userManager = new UserManager(client);
        
        // Test user configuration
        const isValid = userManager.testUserSetup();
        
        if (isValid) {
            console.log('\n📋 Listing configured users:');
            userManager.listAllUsers();
        }
        
    } catch (error) {
        console.log(`❌ User setup test failed: ${error.message}`);
    }
}

async function main() {
    console.log('🔥 DAVID GOGGINS BOT TEST SUITE (NODE.JS) 🔥');
    console.log('🧪 Testing bot functionality and configuration');
    console.log('='.repeat(60));
    
    // Check configuration first
    checkConfiguration();
    
    // Test daily messages (always works)
    testDailyMessages();
    
    // Test scheduler setup
    await testSchedulerSetup();
    
    // Test user setup
    await testUserSetup();
    
    // Test response generation (requires API keys)
    await testResponseGeneration();
    
    console.log('\n\n🎯 TESTING COMPLETE!');
    console.log('='.repeat(60));
    console.log('💪 If all tests passed, your David Goggins Bot is ready to stay hard!');
    console.log('🚀 Run "npm start" to start the full bot');
    console.log('🌐 Or run "npm run dev" for development mode with auto-restart');
    
    rl.close();
}

// Interactive test menu
async function interactiveTest() {
    while (true) {
        console.log('\n🧪 INTERACTIVE TEST MENU');
        console.log('='.repeat(30));
        console.log('1. Test daily messages');
        console.log('2. Test response generation');
        console.log('3. Test user setup');
        console.log('4. Check configuration');
        console.log('5. Run all tests');
        console.log('6. Exit');
        
        const choice = await question('\nChoose option (1-6): ');
        
        switch (choice) {
            case '1':
                testDailyMessages();
                break;
            case '2':
                await testResponseGeneration();
                break;
            case '3':
                await testUserSetup();
                break;
            case '4':
                checkConfiguration();
                break;
            case '5':
                await main();
                return;
            case '6':
                console.log('👋 Testing complete. Stay hard!');
                rl.close();
                return;
            default:
                console.log('❌ Invalid choice');
        }
    }
}

// Run based on command line arguments
const args = process.argv.slice(2);
if (args.includes('--interactive') || args.includes('-i')) {
    interactiveTest().catch(console.error);
} else {
    main().catch(console.error);
}

module.exports = {
    testDailyMessages,
    testResponseGeneration,
    checkConfiguration
}; 