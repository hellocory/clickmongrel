#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119';

async function testSpaceTags() {
    console.log('🏷️ Testing Space-Level Tags\n');
    
    if (!API_KEY) {
        console.error('❌ CLICKUP_API_KEY not found in environment');
        return;
    }
    
    try {
        const api = new ClickUpAPI(API_KEY);
        
        // First, let's get the space ID from our list
        console.log('1️⃣ Getting space ID from list...');
        const list = await api.getList(TASKS_LIST_ID);
        const spaceId = list.space.id;
        console.log(`   Space ID: ${spaceId} (${list.space.name})`);
        
        // Check if we can get existing space tags
        console.log('\n2️⃣ Checking existing space tags...');
        try {
            // This might not be implemented in our API wrapper - let's try direct API call
            const response = await api.client.get(`/space/${spaceId}/tag`);
            console.log('   Existing space tags:', response.data);
        } catch (error) {
            console.log('   ⚠️ Cannot fetch space tags (might not be in API wrapper):', error.message);
        }
        
        // Try creating space tags first
        console.log('\n3️⃣ Trying to create space tags first...');
        const testTags = ['development', 'testing', 'urgent'];
        
        for (const tagName of testTags) {
            try {
                // Try to create space-level tag first
                const tagResponse = await api.client.post(`/space/${spaceId}/tag`, {
                    tag: {
                        name: tagName,
                        tag_fg: '#FFFFFF',
                        tag_bg: '#007acc'
                    }
                });
                console.log(`   ✅ Created space tag: ${tagName}`);
            } catch (error) {
                if (error.response?.status === 400 && error.response.data.err?.includes('already exists')) {
                    console.log(`   ℹ️ Space tag already exists: ${tagName}`);
                } else {
                    console.log(`   ⚠️ Failed to create space tag ${tagName}: ${error.message}`);
                }
            }
        }
        
        // Now try creating a task with existing space tags
        console.log('\n4️⃣ Creating task with space-level tags...');
        const taskData = {
            name: 'Test Task with Space Tags',
            description: 'Testing with pre-created space tags',
            tags: testTags // Use the tags we just created
        };
        
        console.log(`📤 Creating task with tags: ${JSON.stringify(testTags)}`);
        const createdTask = await api.createTask(TASKS_LIST_ID, taskData);
        
        // Fetch it back to see if tags worked
        const fetchedTask = await api.getTask(createdTask.id);
        console.log(`📥 Task created with tags: ${JSON.stringify(fetchedTask.tags)}`);
        
        if (fetchedTask.tags && fetchedTask.tags.length > 0) {
            console.log('🎉 SUCCESS! Tags are working with space-level pre-creation!');
            fetchedTask.tags.forEach(tag => {
                console.log(`   - ${tag.name} (${tag.tag_bg})`);
            });
        } else {
            console.log('❌ Tags still not working even with space-level creation');
        }
        
        // Clean up
        console.log('\n🧹 Cleaning up test task...');
        await api.deleteTask(createdTask.id);
        console.log('✅ Test task deleted');
        
    } catch (error) {
        console.error('❌ Space tags test failed:', error.message);
        if (error.response?.data) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testSpaceTags();