#!/usr/bin/env node

/**
 * 🔥 START SINGLE REPLY GOGGINS BOT
 * 
 * This starts the CLEAN bot with:
 * - Only ONE event handler
 * - No duplicate replies
 * - Proper greeting detection
 */

require('dotenv').config();

console.log('🔥 STARTING SINGLE REPLY GOGGINS BOT 🔥');
console.log('='.repeat(50));

// Check environment
if (!process.env.SLACK_BOT_TOKEN) {
    console.log('❌ SLACK_BOT_TOKEN missing!');
    process.exit(1);
}

if (!process.env.SLACK_SIGNING_SECRET) {
    console.log('❌ SLACK_SIGNING_SECRET missing!');
    process.exit(1);
}

try {
    const GogginsBot = require('./goggins-single-reply-bot');
    
    console.log('🤖 Loading SINGLE REPLY bot...');
    const bot = new GogginsBot();
    
    console.log('🚀 Starting bot...');
    bot.start().then(() => {
        console.log('');
        console.log('🎉 SUCCESS! SINGLE REPLY BOT IS LIVE!');
        console.log('');
        console.log('✅ Features:');
        console.log('   • Only ONE event handler (no duplicates)');
        console.log('   • Responds to "hey", "hi", "hello"');
        console.log('   • Enhanced debug logging');
        console.log('   • Deduplication logic');
        console.log('');
        console.log('💬 Test with Marnie sending "hey" - should get ONE reply!');
        console.log('🔍 Watch logs for detailed debug info');
        console.log('');
        console.log('='.repeat(50));
    });
    
} catch (error) {
    console.error('💥 Failed to start bot:', error.message);
    process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down single reply bot...');
    process.exit(0);
}); 