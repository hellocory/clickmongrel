#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const taskId = '86ab17r4j'; // The enhanced test task

async function verifyEnhancedTask() {
    console.log('🔍 Verifying Enhanced Task Details\n');
    
    try {
        const task = await api.getTask(taskId);
        
        console.log('📋 Task Information:');
        console.log('Name:', task.name);
        console.log('Status:', task.status.status);
        
        if (task.time_estimate) {
            console.log('Time Estimate:', Math.round(task.time_estimate / (1000 * 60)), 'minutes');
        }
        
        if (task.due_date) {
            console.log('Due Date:', new Date(parseInt(task.due_date)).toLocaleString());
        }
        
        console.log('\n📝 Description:');
        console.log(task.description);
        
        console.log('\n🏷️ Custom Fields:');
        if (task.custom_fields && task.custom_fields.length > 0) {
            task.custom_fields.forEach(field => {
                console.log(`- ${field.name}: ${field.value}`);
            });
        } else {
            console.log('No custom fields found');
        }
        
        // Clean up test task
        console.log('\n🧹 Cleaning up test task...');
        await api.deleteTask(taskId);
        console.log('✅ Test task deleted');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyEnhancedTask();