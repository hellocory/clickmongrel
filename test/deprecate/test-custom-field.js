#!/usr/bin/env node

import SyncHandler from '../../dist/handlers/sync.js';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119';

async function testCustomField() {
    console.log('🧪 Testing Custom Field Implementation\n');
    
    try {
        const syncHandler = new SyncHandler(API_KEY, TASKS_LIST_ID);
        await syncHandler.initialize();
        
        const testTodo = {
            id: 'custom-field-test-123',
            content: 'Test Custom Field Integration',
            status: 'pending'
        };
        
        console.log('Creating task with custom field...');
        await syncHandler.syncTodos([testTodo]);
        
        console.log('✅ Task created with custom field!');
        console.log('Check ClickUp to see if the Todo ID field is populated with:', testTodo.id);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCustomField();