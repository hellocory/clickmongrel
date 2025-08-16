#!/usr/bin/env node

import axios from 'axios';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119';

async function testRawApiCall() {
    console.log('🔧 Testing Raw ClickUp API Call\n');
    
    if (!API_KEY) {
        console.error('❌ CLICKUP_API_KEY not found in environment');
        return;
    }
    
    try {
        // Create task with exact API format from documentation
        console.log('1️⃣ Creating task with raw API call...');
        
        const createResponse = await axios.post(
            `https://api.clickup.com/api/v2/list/${TASKS_LIST_ID}/task`,
            {
                name: 'Raw API Test Task',
                description: 'Testing raw API call with tags',
                tags: ['development', 'testing', 'api'],
                time_estimate: 1800000, // 30 minutes
                priority: 2 // High priority
            },
            {
                headers: {
                    'Authorization': API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Task created via raw API');
        console.log('Response data keys:', Object.keys(createResponse.data));
        console.log('Task ID:', createResponse.data.id);
        
        // Try different ways to fetch the task
        console.log('\n2️⃣ Fetching task with different parameters...');
        
        const taskId = createResponse.data.id;
        
        // Test 1: Basic fetch
        const fetch1 = await axios.get(
            `https://api.clickup.com/api/v2/task/${taskId}`,
            {
                headers: { 'Authorization': API_KEY }
            }
        );
        console.log('Basic fetch - Tags:', fetch1.data.tags);
        
        // Test 2: With include_tags query param
        const fetch2 = await axios.get(
            `https://api.clickup.com/api/v2/task/${taskId}?include_tags=true`,
            {
                headers: { 'Authorization': API_KEY }
            }
        );
        console.log('With include_tags=true - Tags:', fetch2.data.tags);
        
        // Test 3: Different parameter format
        const fetch3 = await axios.get(
            `https://api.clickup.com/api/v2/task/${taskId}`,
            {
                headers: { 'Authorization': API_KEY },
                params: { include_tags: true }
            }
        );
        console.log('With params object - Tags:', fetch3.data.tags);
        
        // Test 4: Check what the create response actually returned
        console.log('\n3️⃣ Checking create response for tags...');
        console.log('Create response tags:', createResponse.data.tags);
        console.log('Create response priority:', createResponse.data.priority);
        
        // Test 5: Fetch from list endpoint
        console.log('\n4️⃣ Fetching from list endpoint...');
        const listResponse = await axios.get(
            `https://api.clickup.com/api/v2/list/${TASKS_LIST_ID}/task`,
            {
                headers: { 'Authorization': API_KEY },
                params: { include_tags: true }
            }
        );
        
        const ourTask = listResponse.data.tasks.find(t => t.id === taskId);
        console.log('List fetch - Our task tags:', ourTask?.tags);
        
        // Clean up
        console.log('\n🧹 Cleaning up...');
        await axios.delete(
            `https://api.clickup.com/api/v2/task/${taskId}`,
            {
                headers: { 'Authorization': API_KEY }
            }
        );
        console.log('✅ Test task deleted');
        
    } catch (error) {
        console.error('❌ Raw API test failed:', error.message);
        if (error.response?.data) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testRawApiCall();