#!/usr/bin/env node

import SyncHandler from '../../dist/handlers/sync.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119';

async function testFullWorkflow() {
    console.log('🔄 Testing Complete TodoWrite → ClickUp Workflow\n');
    
    if (!API_KEY) {
        console.error('❌ CLICKUP_API_KEY not found in environment');
        return;
    }
    
    try {
        const syncHandler = new SyncHandler(API_KEY, TASKS_LIST_ID);
        const api = new ClickUpAPI(API_KEY);
        await syncHandler.initialize();
        
        const workflowTodo = {
            id: 'workflow-test-' + Date.now(),
            content: 'Fix critical authentication bug with urgent priority',
            status: 'pending'
        };
        
        console.log('1️⃣ Creating task with enhanced metadata...');
        await syncHandler.syncTodos([workflowTodo]);
        
        // Wait and get the created task
        await new Promise(resolve => setTimeout(resolve, 2000));
        const tasks = await api.getTasks(TASKS_LIST_ID);
        const createdTask = tasks.find(t => t.name.includes('Fix critical authentication bug'));
        
        if (!createdTask) {
            throw new Error('Task not found after creation');
        }
        
        console.log('✅ Task created successfully!');
        console.log(`   Name: ${createdTask.name}`);
        console.log(`   Status: ${createdTask.status.status}`);
        console.log(`   Time Estimate: ${createdTask.time_estimate ? Math.round(createdTask.time_estimate / (1000 * 60)) + ' minutes' : 'none'}`);
        console.log(`   Priority: ${createdTask.priority?.priority || 'none'}`);
        console.log(`   Tags: ${createdTask.tags?.map(t => t.name).join(', ') || 'none'}`);
        
        console.log('\\n2️⃣ Moving task to in_progress...');
        workflowTodo.status = 'in_progress';
        workflowTodo.started_at = new Date().toISOString();
        
        await syncHandler.syncTodos([workflowTodo]);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedTask = await api.getTask(createdTask.id);
        console.log('✅ Task moved to in_progress!');
        console.log(`   Status: ${updatedTask.status.status}`);
        
        console.log('\\n3️⃣ Completing task...');
        workflowTodo.status = 'completed';
        workflowTodo.completed_at = new Date().toISOString();
        
        await syncHandler.syncTodos([workflowTodo]);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const completedTask = await api.getTask(createdTask.id);
        console.log('✅ Task completed!');
        console.log(`   Status: ${completedTask.status.status}`);
        
        console.log('\\n📋 Final Task Details:');
        console.log('Name:', completedTask.name);
        console.log('Description Preview:', completedTask.description.substring(0, 200) + '...');
        
        // Clean up
        console.log('\\n🧹 Cleaning up test task...');
        await api.deleteTask(createdTask.id);
        console.log('✅ Test task deleted');
        
        console.log('\\n🎉 Full workflow test completed successfully!');
        
    } catch (error) {
        console.error('❌ Workflow test failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

testFullWorkflow();