#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119';

async function testTagsWithInclude() {
    console.log('🏷️ Testing Tags with include_tags Parameter\n');
    
    if (!API_KEY) {
        console.error('❌ CLICKUP_API_KEY not found in environment');
        return;
    }
    
    try {
        const api = new ClickUpAPI(API_KEY);
        
        console.log('1️⃣ Creating task with tags using existing space tags...');
        
        const taskData = {
            name: 'Test Tags with Include Parameter',
            description: 'Testing if include_tags parameter works',
            tags: ['development', 'testing', 'urgent'], // These were created in previous test
            time_estimate: 1200000 // 20 minutes
        };
        
        console.log(`📤 Creating task with tags: ${JSON.stringify(taskData.tags)}`);
        const createdTask = await api.createTask(TASKS_LIST_ID, taskData);
        
        console.log(`✅ Task created with ID: ${createdTask.id}`);
        
        // Now fetch it back with include_tags
        console.log('\n2️⃣ Fetching task with include_tags=true...');
        const fetchedTask = await api.getTask(createdTask.id);
        
        console.log('📥 Fetched task data:');
        console.log(`   Name: ${fetchedTask.name}`);
        console.log(`   Tags: ${JSON.stringify(fetchedTask.tags)}`);
        console.log(`   Tags length: ${fetchedTask.tags?.length || 0}`);
        console.log(`   Time Estimate: ${fetchedTask.time_estimate ? Math.round(fetchedTask.time_estimate / (1000 * 60)) + ' minutes' : 'none'}`);
        
        if (fetchedTask.tags && fetchedTask.tags.length > 0) {
            console.log('\n🎉 SUCCESS! Tags are now working with include_tags parameter!');
            fetchedTask.tags.forEach((tag, i) => {
                console.log(`   ${i + 1}. ${tag.name || tag} (${typeof tag})`);
            });
        } else {
            console.log('\n❌ Tags still not working even with include_tags parameter');
        }
        
        // Test with getTasks as well
        console.log('\n3️⃣ Testing getTasks with include_tags...');
        const allTasks = await api.getTasks(TASKS_LIST_ID);
        const ourTask = allTasks.find(t => t.id === createdTask.id);
        
        if (ourTask) {
            console.log(`📥 Task from getTasks - Tags: ${JSON.stringify(ourTask.tags)}`);
        }
        
        // Clean up
        console.log('\n🧹 Cleaning up test task...');
        await api.deleteTask(createdTask.id);
        console.log('✅ Test task deleted');
        
    } catch (error) {
        console.error('❌ Include tags test failed:', error.message);
        if (error.response?.data) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testTagsWithInclude();