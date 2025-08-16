#!/usr/bin/env node

import SyncHandler from '../../dist/handlers/sync.js';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119'; // Correct Tasks list in Agentic Development

async function debugSync() {
    console.log('🔍 Debugging Sync Handler\n');
    
    try {
        console.log('Creating sync handler with list:', TASKS_LIST_ID);
        const syncHandler = new SyncHandler(API_KEY, TASKS_LIST_ID);
        
        console.log('Initializing...');
        await syncHandler.initialize();
        
        console.log('Testing simple todo sync...');
        const todos = [
            { id: 'debug-1', content: 'Debug test task', status: 'pending' }
        ];
        
        await syncHandler.syncTodos(todos);
        console.log('✅ Sync completed');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugSync();