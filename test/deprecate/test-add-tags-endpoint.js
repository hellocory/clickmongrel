#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119';

async function testAddTagsEndpoint() {
    console.log('🏷️ Testing Add Tags Endpoint\n');
    
    if (!API_KEY) {
        console.error('❌ CLICKUP_API_KEY not found in environment');
        return;
    }
    
    try {
        const api = new ClickUpAPI(API_KEY);
        
        console.log('1️⃣ Creating task without tags first...');
        
        const taskData = {
            name: 'Test Add Tags Endpoint',
            description: 'Testing separate tag addition endpoint',
            time_estimate: 900000 // 15 minutes
        };
        
        const createdTask = await api.createTask(TASKS_LIST_ID, taskData);
        console.log(`✅ Task created with ID: ${createdTask.id}`);
        
        // Now add tags using the separate endpoint
        console.log('\n2️⃣ Adding tags using separate endpoint...');
        const tagsToAdd = ['development', 'testing', 'urgent'];
        
        for (const tagName of tagsToAdd) {
            try {
                console.log(`   Adding tag: ${tagName}`);
                await api.client.post(`/task/${createdTask.id}/tag/${tagName}`);
                console.log(`   ✅ Successfully added tag: ${tagName}`);
            } catch (error) {
                console.log(`   ❌ Failed to add tag ${tagName}: ${error.message}`);
            }
        }
        
        // Fetch the task to see if tags are there now
        console.log('\n3️⃣ Fetching task to verify tags...');
        const fetchedTask = await api.getTask(createdTask.id);
        
        console.log('📥 Task after adding tags:');
        console.log(`   Name: ${fetchedTask.name}`);
        console.log(`   Tags: ${JSON.stringify(fetchedTask.tags)}`);
        console.log(`   Tags length: ${fetchedTask.tags?.length || 0}`);
        
        if (fetchedTask.tags && fetchedTask.tags.length > 0) {
            console.log('\n🎉 SUCCESS! Tags work with the separate add endpoint!');
            fetchedTask.tags.forEach((tag, i) => {
                console.log(`   ${i + 1}. ${tag.name || tag} (ID: ${tag.id || 'N/A'})`);
            });
        } else {
            console.log('\n❌ Tags still not working with separate endpoint');
        }
        
        // Clean up
        console.log('\n🧹 Cleaning up test task...');
        await api.deleteTask(createdTask.id);
        console.log('✅ Test task deleted');
        
    } catch (error) {
        console.error('❌ Add tags endpoint test failed:', error.message);
        if (error.response?.data) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testAddTagsEndpoint();