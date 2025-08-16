#!/usr/bin/env node

import { SyncHandler } from '../dist/handlers/sync.js';
import ClickUpAPI from '../dist/utils/clickup-api.js';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.CLICKUP_API_KEY;
const LIST_ID = process.env.CLICKUP_TASKS_LIST_ID;

if (!API_KEY || !LIST_ID) {
  console.error('Missing CLICKUP_API_KEY or CLICKUP_TASKS_LIST_ID environment variable');
  process.exit(1);
}

async function testSmartStatusManagement() {
  console.log('🧪 Testing Smart Status Management for Parent-Child Tasks\n');
  
  const api = new ClickUpAPI(API_KEY);
  const syncHandler = new SyncHandler(API_KEY, LIST_ID);
  await syncHandler.initialize();
  
  // Create test todos with parent-child relationship
  const parentTodo = {
    id: 'test-parent-' + Date.now(),
    content: 'Parent Task: Implement new feature',
    status: 'pending',
    tags: ['test', 'parent']
  };
  
  const subtask1 = {
    id: 'test-sub1-' + Date.now(),
    content: 'Subtask 1: Design the architecture',
    status: 'pending',
    parent_id: parentTodo.id,
    tags: ['test', 'subtask']
  };
  
  const subtask2 = {
    id: 'test-sub2-' + Date.now(),
    content: 'Subtask 2: Write the code',
    status: 'pending',
    parent_id: parentTodo.id,
    tags: ['test', 'subtask']
  };
  
  const subtask3 = {
    id: 'test-sub3-' + Date.now(),
    content: 'Subtask 3: Write tests',
    status: 'pending',
    parent_id: parentTodo.id,
    tags: ['test', 'subtask']
  };
  
  try {
    console.log('📝 Step 1: Creating parent task and subtasks...');
    await syncHandler.syncTodos([parentTodo, subtask1, subtask2, subtask3]);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for sync
    
    console.log('✅ Tasks created in ClickUp\n');
    
    // Test 1: Start working on a subtask
    console.log('🔄 Step 2: Setting subtask 1 to in_progress...');
    subtask1.status = 'in_progress';
    await syncHandler.syncTodos([subtask1]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('   ⏳ Expected: Parent task should now be in_progress too\n');
    
    // Test 2: Complete first subtask
    console.log('🔄 Step 3: Completing subtask 1...');
    subtask1.status = 'completed';
    await syncHandler.syncTodos([subtask1]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('   ⏳ Expected: Parent still in_progress (other subtasks pending)\n');
    
    // Test 3: Start and complete remaining subtasks
    console.log('🔄 Step 4: Starting subtask 2...');
    subtask2.status = 'in_progress';
    await syncHandler.syncTodos([subtask2]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔄 Step 5: Completing subtask 2...');
    subtask2.status = 'completed';
    await syncHandler.syncTodos([subtask2]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔄 Step 6: Starting and completing subtask 3...');
    subtask3.status = 'in_progress';
    await syncHandler.syncTodos([subtask3]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    subtask3.status = 'completed';
    await syncHandler.syncTodos([subtask3]);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('   ✅ Expected: Parent task should now be completed!\n');
    
    // Verify the final state
    console.log('🔍 Verifying final state in ClickUp...');
    const tasks = await api.getTasks(LIST_ID, true);
    
    const parentTask = tasks.find(t => t.name === parentTodo.content);
    const sub1 = tasks.find(t => t.name === subtask1.content);
    const sub2 = tasks.find(t => t.name === subtask2.content);
    const sub3 = tasks.find(t => t.name === subtask3.content);
    
    console.log('\n📊 Final Status Report:');
    console.log('─'.repeat(50));
    
    if (parentTask) {
      console.log(`✅ Parent Task: ${parentTask.status.status}`);
      console.log(`   Expected: completed or done`);
    }
    
    if (sub1) console.log(`✅ Subtask 1: ${sub1.status.status}`);
    if (sub2) console.log(`✅ Subtask 2: ${sub2.status.status}`);
    if (sub3) console.log(`✅ Subtask 3: ${sub3.status.status}`);
    
    console.log('─'.repeat(50));
    console.log('\n🎉 Smart status management test complete!');
    console.log('Check your ClickUp to verify the parent-child relationships and auto-completion.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSmartStatusManagement().catch(console.error);