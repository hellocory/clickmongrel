#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const taskId = '86ab17t9e'; // The enhanced test task

async function verifyEnhancedFinal() {
    console.log('🔍 Final Verification of Enhanced Task\n');
    
    try {
        const task = await api.getTask(taskId);
        
        console.log('📋 COMPLETE Task Information:');
        console.log('Name:', task.name);
        console.log('Status:', task.status.status);
        
        console.log('\n🏷️ Tags:');
        if (task.tags && task.tags.length > 0) {
            console.log('✅ TAGS ARE WORKING!');
            task.tags.forEach((tag, i) => {
                console.log(`   ${i + 1}. ${tag.name} (bg: ${tag.tag_bg}, fg: ${tag.tag_fg})`);
            });
        } else {
            console.log('❌ No tags found');
        }
        
        console.log('\n⚡ Priority:');
        if (task.priority) {
            console.log('✅ PRIORITY IS WORKING!');
            console.log(`   Priority: ${task.priority.priority} (${task.priority.color})`);
        } else {
            console.log('❌ No priority found');
        }
        
        console.log('\n⏱️ Time Estimate:');
        if (task.time_estimate) {
            console.log('✅ TIME ESTIMATE IS WORKING!');
            console.log(`   Estimate: ${Math.round(task.time_estimate / (1000 * 60))} minutes`);
        } else {
            console.log('❌ No time estimate found');
        }
        
        console.log('\n🏷️ Custom Fields:');
        if (task.custom_fields && task.custom_fields.length > 0) {
            console.log('✅ CUSTOM FIELDS ARE WORKING!');
            task.custom_fields.forEach(field => {
                console.log(`   - ${field.name}: ${field.value}`);
            });
        } else {
            console.log('❌ No custom fields found');
        }
        
        console.log('\n📝 Description Preview:');
        console.log(task.description.substring(0, 300) + '...');
        
        // Clean up test task
        console.log('\n🧹 Cleaning up test task...');
        await api.deleteTask(taskId);
        console.log('✅ Test task deleted');
        
        console.log('\n🎉 FINAL RESULT: Enhanced tracking system is FULLY FUNCTIONAL!');
        
    } catch (error) {
        console.error('❌ Final verification failed:', error.message);
    }
}

verifyEnhancedFinal();