#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const TASKS_LIST_ID = '901317936119'; // Tasks list in Agentic Development

async function checkCustomFields() {
    console.log('🔍 Checking Custom Fields for Tasks List\n');
    
    try {
        // Get custom fields for the list
        console.log('Getting custom fields...');
        const customFields = await api.getCustomFields(TASKS_LIST_ID);
        
        console.log('Custom fields found:');
        if (customFields.length === 0) {
            console.log('   No custom fields configured for this list');
        } else {
            customFields.forEach((field, index) => {
                console.log(`   ${index + 1}. ${field.name} (${field.id})`);
                console.log(`      Type: ${field.type}`);
                console.log(`      Required: ${field.required || false}`);
                console.log();
            });
        }
        
        // Also check if we can create a custom field
        console.log('\nChecking if we can add custom fields via API...');
        
        // Get a sample task to see its structure
        const tasks = await api.getTasks(TASKS_LIST_ID);
        if (tasks.length > 0) {
            console.log('\nSample task custom fields:');
            const sampleTask = tasks[0];
            console.log('Task name:', sampleTask.name);
            console.log('Custom fields:', sampleTask.custom_fields || 'None');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

checkCustomFields();