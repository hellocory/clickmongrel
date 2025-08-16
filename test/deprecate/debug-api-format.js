#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119';

async function debugApiFormat() {
    console.log('🔍 Debugging ClickUp API Format for Tags and Priority\n');
    
    if (!API_KEY) {
        console.error('❌ CLICKUP_API_KEY not found in environment');
        return;
    }
    
    try {
        const api = new ClickUpAPI(API_KEY);
        
        // Test creating a task directly with the API
        console.log('1️⃣ Creating task with manual API format...');
        
        const taskData = {
            name: 'Debug API Format Test',
            description: 'Testing tags and priority format',
            tags: ['debug', 'testing', 'api'],
            priority: 1, // 1 = Urgent
            time_estimate: 1800000 // 30 minutes in milliseconds
        };
        
        console.log('📤 Sending to ClickUp:', JSON.stringify(taskData, null, 2));
        
        const createdTask = await api.createTask(TASKS_LIST_ID, taskData);
        
        console.log('✅ Task created with ID:', createdTask.id);
        
        // Get the task back to see what was actually stored
        console.log('\n2️⃣ Fetching task to see stored data...');
        const fetchedTask = await api.getTask(createdTask.id);
        
        console.log('📥 Received from ClickUp:');
        console.log('Name:', fetchedTask.name);
        console.log('Tags:', fetchedTask.tags);
        console.log('Priority:', fetchedTask.priority);
        console.log('Time Estimate:', fetchedTask.time_estimate);
        console.log('Status:', fetchedTask.status);
        
        // Clean up
        console.log('\n🧹 Cleaning up test task...');
        await api.deleteTask(createdTask.id);
        console.log('✅ Test task deleted');
        
    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
        if (error.response?.data) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugApiFormat();