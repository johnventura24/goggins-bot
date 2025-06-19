#!/usr/bin/env node

/**
 * 🔥 DEADLINE MANAGER FOR GOGGINS BOT
 * 
 * This module handles:
 * - Creating and storing deadlines
 * - Tracking deadline progress
 * - Sending deadline reminders
 * - Managing deadline completion
 * - Preventing duplicate deadlines
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

// File to store deadline data
const DEADLINES_FILE = 'user-deadlines.json';

class DeadlineManager {
    constructor() {
        this.deadlines = this.loadDeadlines();
        console.log('📅 Deadline Manager initialized');
    }

    // Load deadlines from file
    loadDeadlines() {
        try {
            if (fs.existsSync(DEADLINES_FILE)) {
                const data = JSON.parse(fs.readFileSync(DEADLINES_FILE, 'utf8'));
                console.log(`📋 Loaded ${Object.keys(data).length} user deadline records`);
                return data;
            }
        } catch (error) {
            console.error('❌ Error loading deadlines:', error.message);
        }
        return {};
    }

    // Save deadlines to file
    saveDeadlines() {
        try {
            fs.writeFileSync(DEADLINES_FILE, JSON.stringify(this.deadlines, null, 2));
            console.log('💾 Deadlines saved successfully');
        } catch (error) {
            console.error('❌ Error saving deadlines:', error.message);
        }
    }

    // Add a new deadline for a user
    addDeadline(userId, userName, userRole, task, dueDate, type = 'general') {
        if (!this.deadlines[userId]) {
            this.deadlines[userId] = {
                name: userName,
                role: userRole,
                activeDeadlines: [],
                completedDeadlines: [],
                overdueDeadlines: []
            };
        }

        // Check for duplicate deadlines
        const existingDeadline = this.deadlines[userId].activeDeadlines.find(
            deadline => deadline.task === task && deadline.dueDate === dueDate
        );

        if (existingDeadline) {
            console.log(`⚠️ Duplicate deadline prevented for ${userName}: ${task}`);
            return false;
        }

        const deadline = {
            id: this.generateDeadlineId(),
            task: task,
            dueDate: dueDate,
            type: type,
            createdDate: moment().format('YYYY-MM-DD'),
            createdTime: moment().toISOString(),
            completed: false,
            reminded: false,
            reminderCount: 0
        };

        this.deadlines[userId].activeDeadlines.push(deadline);
        this.saveDeadlines();
        
        console.log(`✅ Deadline added for ${userName}: ${task} (Due: ${dueDate})`);
        return deadline;
    }

    // Generate unique deadline ID
    generateDeadlineId() {
        return 'deadline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get all deadlines for a user
    getUserDeadlines(userId) {
        return this.deadlines[userId] || null;
    }

    // Get active deadlines for a user
    getActiveDeadlines(userId) {
        const userData = this.deadlines[userId];
        return userData ? userData.activeDeadlines.filter(d => !d.completed) : [];
    }

    // Get overdue deadlines for a user
    getOverdueDeadlines(userId) {
        const activeDeadlines = this.getActiveDeadlines(userId);
        const today = moment().format('YYYY-MM-DD');
        
        return activeDeadlines.filter(deadline => deadline.dueDate < today);
    }

    // Get deadlines due today
    getDeadlinesDueToday(userId) {
        const activeDeadlines = this.getActiveDeadlines(userId);
        const today = moment().format('YYYY-MM-DD');
        
        return activeDeadlines.filter(deadline => deadline.dueDate === today);
    }

    // Mark deadline as completed
    completeDeadline(userId, deadlineId) {
        const userData = this.deadlines[userId];
        if (!userData) return false;

        const deadlineIndex = userData.activeDeadlines.findIndex(d => d.id === deadlineId);
        if (deadlineIndex === -1) return false;

        const deadline = userData.activeDeadlines[deadlineIndex];
        deadline.completed = true;
        deadline.completedDate = moment().format('YYYY-MM-DD');
        deadline.completedTime = moment().toISOString();

        // Move to completed deadlines
        userData.completedDeadlines.push(deadline);
        userData.activeDeadlines.splice(deadlineIndex, 1);

        this.saveDeadlines();
        console.log(`✅ Deadline completed for ${userData.name}: ${deadline.task}`);
        return true;
    }

    // Mark deadline as reminded
    markAsReminded(userId, deadlineId) {
        const userData = this.deadlines[userId];
        if (!userData) return false;

        const deadline = userData.activeDeadlines.find(d => d.id === deadlineId);
        if (deadline) {
            deadline.reminded = true;
            deadline.reminderCount = (deadline.reminderCount || 0) + 1;
            deadline.lastReminderDate = moment().toISOString();
            this.saveDeadlines();
            return true;
        }
        return false;
    }

    // Get all users with overdue deadlines
    getAllOverdueDeadlines() {
        const overdueUsers = {};
        
        for (const [userId, userData] of Object.entries(this.deadlines)) {
            const overdueDeadlines = this.getOverdueDeadlines(userId);
            if (overdueDeadlines.length > 0) {
                overdueUsers[userId] = {
                    name: userData.name,
                    role: userData.role,
                    overdueDeadlines: overdueDeadlines
                };
            }
        }
        
        return overdueUsers;
    }

    // Get all users with deadlines due today
    getAllDeadlinesDueToday() {
        const dueTodayUsers = {};
        
        for (const [userId, userData] of Object.entries(this.deadlines)) {
            const dueTodayDeadlines = this.getDeadlinesDueToday(userId);
            if (dueTodayDeadlines.length > 0) {
                dueTodayUsers[userId] = {
                    name: userData.name,
                    role: userData.role,
                    dueTodayDeadlines: dueTodayDeadlines
                };
            }
        }
        
        return dueTodayUsers;
    }

    // Generate role-specific deadline
    generateRoleSpecificDeadline(userRole, messageContent = '') {
        const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
        const nextWeek = moment().add(7, 'days').format('YYYY-MM-DD');
        
        const role = userRole.toLowerCase();
        
        if (role.includes('ceo') || role.includes('founder')) {
            return {
                task: "Identify and personally tackle your biggest strategic challenge - don't delegate it",
                dueDate: nextWeek,
                type: "strategic"
            };
        } else if (role.includes('social')) {
            return {
                task: "Create 3 pieces of high-value content that push boundaries and add real value",
                dueDate: nextWeek,
                type: "content"
            };
        } else if (role.includes('assistant')) {
            return {
                task: "Find and implement one process optimization that adds measurable value",
                dueDate: tomorrow,
                type: "efficiency"
            };
        } else if (role.includes('manager') || role.includes('director')) {
            return {
                task: "Have one difficult conversation you've been avoiding with your team",
                dueDate: nextWeek,
                type: "leadership"
            };
        } else {
            return {
                task: "Attack your most challenging task FIRST thing tomorrow - no warm-up tasks",
                dueDate: tomorrow,
                type: "productivity"
            };
        }
    }

    // Clean up old completed deadlines (keep last 30 days)
    cleanupOldDeadlines() {
        const cutoffDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        let cleanedCount = 0;
        
        for (const [userId, userData] of Object.entries(this.deadlines)) {
            if (userData.completedDeadlines) {
                const originalCount = userData.completedDeadlines.length;
                userData.completedDeadlines = userData.completedDeadlines.filter(
                    deadline => deadline.completedDate >= cutoffDate
                );
                cleanedCount += originalCount - userData.completedDeadlines.length;
            }
        }
        
        if (cleanedCount > 0) {
            this.saveDeadlines();
            console.log(`🧹 Cleaned up ${cleanedCount} old completed deadlines`);
        }
        
        return cleanedCount;
    }

    // Get deadline statistics for a user
    getDeadlineStats(userId) {
        const userData = this.deadlines[userId];
        if (!userData) return null;

        const activeCount = userData.activeDeadlines ? userData.activeDeadlines.length : 0;
        const completedCount = userData.completedDeadlines ? userData.completedDeadlines.length : 0;
        const overdueCount = this.getOverdueDeadlines(userId).length;
        
        return {
            active: activeCount,
            completed: completedCount,
            overdue: overdueCount,
            completionRate: completedCount > 0 ? Math.round((completedCount / (completedCount + overdueCount)) * 100) : 0
        };
    }

    // Generate deadline reminder message
    generateReminderMessage(userData, overdueDeadlines) {
        const name = userData.name;
        const count = overdueDeadlines.length;
        
        let message = `🚨 **${name}** - DEADLINE ALERT!\n\n`;
        message += `You have ${count} overdue deadline${count > 1 ? 's' : ''}:\n\n`;
        
        overdueDeadlines.forEach((deadline, index) => {
            const daysOverdue = moment().diff(moment(deadline.dueDate), 'days');
            message += `${index + 1}. **${deadline.task}**\n`;
            message += `   Due: ${deadline.dueDate} (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)\n\n`;
        });
        
        message += `**What's your excuse?** Reply with your progress update RIGHT NOW!\n\n`;
        message += `*The accountability mirror doesn't lie! You can't hurt me, but you can hurt yourself by not following through! 🔥*`;
        
        return message;
    }

    // Generate deadline inclusion message for responses
    generateDeadlineInclusionMessage(deadline) {
        return `\n\n⏰ **YOUR NEW DEADLINE - NO EXCUSES:**\n**${deadline.task}** - Due: ${deadline.dueDate}\n\n*I'll be checking on your progress! Stay hard! 🔥*`;
    }
}

module.exports = DeadlineManager; 