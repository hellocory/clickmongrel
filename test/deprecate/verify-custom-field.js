#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const taskId = '86ab17qnx'; // The task we just created

async function verifyCustomField() {
    console.log('🔍 Verifying Custom Field Value\n');
    
    try {
        const task = await api.getTask(taskId);
        
        console.log('Task details:');
        console.log('Name:', task.name);
        console.log('Description:', task.description);
        console.log('\nCustom fields:');
        
        if (task.custom_fields && task.custom_fields.length > 0) {
            task.custom_fields.forEach(field => {
                console.log(`- ${field.name}: ${field.value}`);
                console.log(`  ID: ${field.id}`);
                console.log(`  Type: ${field.type}`);
            });
        } else {
            console.log('No custom fields found on task');
        }
        
        // Clean up test task
        console.log('\nCleaning up test task...');
        await api.deleteTask(taskId);
        console.log('✅ Test task deleted');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyCustomField();