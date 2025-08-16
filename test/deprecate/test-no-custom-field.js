#!/usr/bin/env node

import SyncHandler from '../../dist/handlers/sync.js';

const API_KEY = process.env.CLICKUP_API_KEY;
// Using the "List" from Space (which has no custom fields)
const NO_CUSTOM_FIELDS_LIST_ID = '901311714167'; 

async function testNoCustomField() {
    console.log('🧪 Testing Fallback Behavior (No Custom Field)\n');
    
    try {
        const syncHandler = new SyncHandler(API_KEY, NO_CUSTOM_FIELDS_LIST_ID);
        await syncHandler.initialize();
        
        const testTodo = {
            id: 'fallback-test-456',
            content: 'Test Fallback Description Tracking',
            status: 'pending'
        };
        
        console.log('\nCreating task without custom field...');
        await syncHandler.syncTodos([testTodo]);
        
        console.log('✅ Task created with description fallback!');
        console.log('Check ClickUp to see the enhanced description with setup instructions.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testNoCustomField();