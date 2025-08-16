#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';
import SyncHandler from '../../dist/handlers/sync.js';

const API_KEY = process.env.CLICKUP_API_KEY;

async function runTests() {
    console.log('🧪 Running ClickMongrel Integration Tests\n');
    
    try {
        // Test 1: API Connection
        console.log('1️⃣ Testing API Connection...');
        const api = new ClickUpAPI(API_KEY);
        const user = await api.getCurrentUser();
        console.log(`   ✅ Connected as: ${user.username} (${user.email})`);
        
        // Test 2: Workspace Detection
        console.log('\n2️⃣ Testing Workspace Detection...');
        const teams = await api.getTeams();
        const ghostCodes = teams.find(w => w.name.includes('Ghost Codes'));
        if (ghostCodes) {
            console.log(`   ✅ Found workspace: ${ghostCodes.name}`);
        } else {
            console.log('   ⚠️ Ghost Codes workspace not found, using first workspace');
        }
        
        // Test 3: List Detection
        console.log('\n3️⃣ Testing List Detection...');
        const workspace = ghostCodes || teams[0];
        const spaces = await api.getSpaces(workspace.id);
        let devList = null;
        let agenticSpace = null;
        
        // Find the Agentic Development space
        agenticSpace = spaces.find(s => s.name === 'Agentic Development');
        if (agenticSpace) {
            const lists = await api.getLists(agenticSpace.id);
            devList = lists.find(l => l.name === 'Tasks');
        }
        
        if (devList) {
            console.log(`   ✅ Found list: ${devList.name} (${devList.id}) in ${agenticSpace.name}`);
        } else {
            console.log('   ❌ Tasks list not found in Agentic Development space');
            process.exit(1);
        }
        
        // Test 4: Create Test Task
        console.log('\n4️⃣ Testing Task Creation...');
        const testTask = {
            name: `Test Task - ${new Date().toISOString()}`,
            description: 'Created by ClickMongrel integration test',
            status: 'to do'
        };
        
        const createdTask = await api.createTask(devList.id, testTask);
        console.log(`   ✅ Created task: ${createdTask.name} (${createdTask.id})`);
        
        // Test 5: Update Task Status
        console.log('\n5️⃣ Testing Status Update...');
        const statuses = await api.getListStatuses(devList.id);
        console.log('   Available statuses:', statuses?.map(s => s.status) || 'none');
        
        if (statuses && statuses.length > 0) {
            // Since we only have "to do" and "complete", let's use "complete"
            const completeStatus = statuses.find(s => 
                s.status.toLowerCase().includes('complete') || 
                s.type === 'closed'
            );
            
            if (completeStatus) {
                await api.updateTask(createdTask.id, { status: completeStatus.status });
                console.log(`   ✅ Updated task status to: ${completeStatus.status}`);
            } else {
                console.log('   ⚠️ Complete status not found, using first status');
                await api.updateTask(createdTask.id, { status: statuses[0].status });
                console.log(`   ✅ Updated task status to: ${statuses[0].status}`);
            }
        } else {
            console.log('   ⚠️ No statuses available for this list');
        }
        
        // Test 6: Sync Handler
        console.log('\n6️⃣ Testing Sync Handler...');
        const syncHandler = new SyncHandler(API_KEY, devList.id);
        await syncHandler.initialize();
        
        const todos = [
            { id: 'sync-test-1', content: 'Sync Test - Pending', status: 'pending' },
            { id: 'sync-test-2', content: 'Sync Test - In Progress', status: 'in_progress' },
            { id: 'sync-test-3', content: 'Sync Test - Completed', status: 'completed' }
        ];
        
        await syncHandler.syncTodos(todos);
        console.log('   ✅ Synced todos successfully');
        
        // Test 7: Verify Sync
        console.log('\n7️⃣ Verifying Sync...');
        const tasks = await api.getTasks(devList.id);
        const syncedTasks = tasks.filter(t => t.name.includes('Sync Test'));
        console.log(`   ✅ Found ${syncedTasks.length} synced tasks in ClickUp`);
        
        // Cleanup
        console.log('\n8️⃣ Cleaning up test tasks...');
        for (const task of syncedTasks) {
            await api.deleteTask(task.id);
        }
        await api.deleteTask(createdTask.id);
        console.log('   ✅ Cleanup complete');
        
        console.log('\n✅ All tests passed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();