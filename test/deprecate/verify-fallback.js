#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const taskId = '86ab17qv5'; // The fallback test task

async function verifyFallback() {
    console.log('🔍 Verifying Fallback Description\n');
    
    try {
        const task = await api.getTask(taskId);
        
        console.log('Task details:');
        console.log('Name:', task.name);
        console.log('\nDescription:');
        console.log(task.description);
        console.log('\nCustom fields:');
        console.log(task.custom_fields?.length || 0, 'custom fields found');
        
        // Clean up test task
        console.log('\nCleaning up test task...');
        await api.deleteTask(taskId);
        console.log('✅ Test task deleted');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

verifyFallback();