#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119';

async function debugTagsDetailed() {
    console.log('🏷️ Debugging ClickUp Tags in Detail\n');
    
    if (!API_KEY) {
        console.error('❌ CLICKUP_API_KEY not found in environment');
        return;
    }
    
    try {
        const api = new ClickUpAPI(API_KEY);
        
        // Test 1: Check what tags exist in the workspace first
        console.log('1️⃣ Checking existing tasks to see tag format...');
        const existingTasks = await api.getTasks(TASKS_LIST_ID);
        
        if (existingTasks.length > 0) {
            console.log('Sample task tags format:');
            existingTasks.slice(0, 3).forEach((task, i) => {
                console.log(`   Task ${i + 1}: ${task.name}`);
                console.log(`   Tags: ${JSON.stringify(task.tags)}`);
            });
        }
        
        // Test 2: Try different tag formats
        console.log('\n2️⃣ Testing different tag formats...');
        
        const testCases = [
            {
                name: 'Test Tags Format 1 - Simple Array',
                tags: ['debug', 'test', 'format1']
            },
            {
                name: 'Test Tags Format 2 - Single Tag',
                tags: ['single-tag']
            },
            {
                name: 'Test Tags Format 3 - No Spaces',
                tags: ['notag', 'format3', 'debug']
            }
        ];
        
        const createdTasks = [];
        
        for (const testCase of testCases) {
            console.log(`\n📤 Creating: ${testCase.name}`);
            console.log(`   Tags sent: ${JSON.stringify(testCase.tags)}`);
            
            const taskData = {
                name: testCase.name,
                description: 'Testing tag formats',
                tags: testCase.tags,
                time_estimate: 900000 // 15 minutes
            };
            
            try {
                const created = await api.createTask(TASKS_LIST_ID, taskData);
                createdTasks.push(created.id);
                
                // Immediately fetch it back
                const fetched = await api.getTask(created.id);
                console.log(`   ✅ Created with ID: ${created.id}`);
                console.log(`   📥 Tags received: ${JSON.stringify(fetched.tags)}`);
                console.log(`   📥 Tags type: ${typeof fetched.tags}, length: ${fetched.tags?.length || 0}`);
                
                if (fetched.tags && fetched.tags.length > 0) {
                    console.log(`   📥 First tag structure: ${JSON.stringify(fetched.tags[0])}`);
                }
                
            } catch (error) {
                console.error(`   ❌ Failed: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between requests
        }
        
        // Test 3: Try manual tag addition after creation
        if (createdTasks.length > 0) {
            console.log('\n3️⃣ Testing manual tag addition after task creation...');
            
            try {
                // Note: This might need a different API endpoint for adding tags
                const taskId = createdTasks[0];
                console.log(`Attempting to add tags to task ${taskId}...`);
                
                // This might require a different endpoint - let's see what happens
                await api.updateTask(taskId, { tags: ['post-creation', 'manual'] });
                
                const updated = await api.getTask(taskId);
                console.log(`   📥 After update - Tags: ${JSON.stringify(updated.tags)}`);
                
            } catch (error) {
                console.log(`   ℹ️ Manual tag update failed (expected): ${error.message}`);
            }
        }
        
        // Clean up all test tasks
        console.log('\n🧹 Cleaning up test tasks...');
        for (const taskId of createdTasks) {
            try {
                await api.deleteTask(taskId);
                console.log(`   ✅ Deleted task ${taskId}`);
            } catch (error) {
                console.log(`   ⚠️ Failed to delete ${taskId}: ${error.message}`);
            }
        }
        
        console.log('\n🏷️ Tag debugging complete!');
        
    } catch (error) {
        console.error('❌ Detailed tag debug failed:', error.message);
        if (error.response?.data) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugTagsDetailed();