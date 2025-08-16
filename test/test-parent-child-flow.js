#!/usr/bin/env node

import { SyncHandler } from '../dist/handlers/sync.js';
import ClickUpAPI from '../dist/utils/clickup-api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load config from project
const configPath = path.join(process.cwd(), '.claude/clickup/config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ ClickUp config not found. Run initialization first.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const API_KEY = process.env.CLICKUP_API_KEY || 'pk_138190514_A0D0GWFHH2CNBHJJXQW0OP9XPO5K9O27';
const LIST_ID = config.lists?.tasks;

if (!LIST_ID) {
  console.error('❌ Tasks list ID not found in config');
  process.exit(1);
}

console.log('🧪 Testing Parent-Child Task Flow with Auto-Completion\n');
console.log(`📍 Using list: ${LIST_ID}`);
console.log('─'.repeat(60));

async function cleanupTestTasks(api, listId) {
  console.log('\n🧹 Cleaning up existing test tasks...');
  const tasks = await api.getTasks(listId, true);
  const testTasks = tasks.filter(t => 
    t.tags?.some(tag => tag.name === 'test-parent-child') ||
    t.name.includes('[TEST]')
  );
  
  for (const task of testTasks) {
    try {
      await api.deleteTask(task.id);
      console.log(`  ❌ Deleted: ${task.name}`);
    } catch (e) {
      // Ignore errors
    }
  }
  
  if (testTasks.length > 0) {
    console.log(`  ✅ Cleaned up ${testTasks.length} test tasks\n`);
  }
}

async function testParentChildFlow() {
  const api = new ClickUpAPI(API_KEY);
  const syncHandler = new SyncHandler(API_KEY, LIST_ID);
  await syncHandler.initialize();
  
  // Clean up first
  await cleanupTestTasks(api, LIST_ID);
  
  // Create test todos simulating TodoWrite structure
  const timestamp = Date.now();
  
  // Parent task
  const parentTodo = {
    id: `parent-${timestamp}`,
    content: '[TEST] Build new authentication system',
    status: 'pending',
    tags: ['test-parent-child', 'parent']
  };
  
  // Subtasks
  const subtask1 = {
    id: `sub1-${timestamp}`,
    content: '[TEST] Design authentication flow',
    status: 'pending',
    parent_id: parentTodo.id,
    tags: ['test-parent-child', 'subtask']
  };
  
  const subtask2 = {
    id: `sub2-${timestamp}`,
    content: '[TEST] Implement login component',
    status: 'pending',
    parent_id: parentTodo.id,
    tags: ['test-parent-child', 'subtask']
  };
  
  const subtask3 = {
    id: `sub3-${timestamp}`,
    content: '[TEST] Add OAuth integration',
    status: 'pending',
    parent_id: parentTodo.id,
    tags: ['test-parent-child', 'subtask']
  };
  
  try {
    // Step 1: Create all tasks
    console.log('\n📝 Step 1: Creating parent task and 3 subtasks...');
    await syncHandler.syncTodos([parentTodo, subtask1, subtask2, subtask3]);
    
    // Wait for sync to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify creation
    let tasks = await api.getTasks(LIST_ID, true);
    const createdParent = tasks.find(t => t.name === parentTodo.content);
    const createdSub1 = tasks.find(t => t.name === subtask1.content);
    const createdSub2 = tasks.find(t => t.name === subtask2.content);
    const createdSub3 = tasks.find(t => t.name === subtask3.content);
    
    if (!createdParent || !createdSub1 || !createdSub2 || !createdSub3) {
      throw new Error('Failed to create all tasks');
    }
    
    console.log('  ✅ Parent task created: ' + createdParent.id);
    console.log('  ✅ Subtask 1 created: ' + createdSub1.id);
    console.log('  ✅ Subtask 2 created: ' + createdSub2.id);
    console.log('  ✅ Subtask 3 created: ' + createdSub3.id);
    
    // Verify parent relationships
    console.log('\n🔗 Verifying parent-child relationships:');
    console.log(`  Parent status: ${createdParent.status.status}`);
    console.log(`  Sub1 parent: ${createdSub1.parent || 'none'}`);
    console.log(`  Sub2 parent: ${createdSub2.parent || 'none'}`);
    console.log(`  Sub3 parent: ${createdSub3.parent || 'none'}`);
    
    // Step 2: Start working on first subtask
    console.log('\n📝 Step 2: Setting subtask 1 to in_progress...');
    subtask1.status = 'in_progress';
    await syncHandler.syncTodos([subtask1]);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check parent status
    tasks = await api.getTasks(LIST_ID, true);
    const parentAfterStart = tasks.find(t => t.name === parentTodo.content);
    console.log(`  Parent status after subtask starts: ${parentAfterStart.status.status}`);
    console.log(`  Expected: "in progress" or similar`);
    
    if (parentAfterStart.status.status.toLowerCase().includes('progress')) {
      console.log('  ✅ Parent correctly set to in progress!');
    } else {
      console.log('  ⚠️ Parent status not updated as expected');
    }
    
    // Step 3: Complete first subtask
    console.log('\n📝 Step 3: Completing subtask 1...');
    subtask1.status = 'completed';
    await syncHandler.syncTodos([subtask1]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    tasks = await api.getTasks(LIST_ID, true);
    const parentAfterOne = tasks.find(t => t.name === parentTodo.content);
    console.log(`  Parent status: ${parentAfterOne.status.status}`);
    console.log('  Expected: Still "in progress" (other subtasks pending)');
    
    // Step 4: Complete second subtask
    console.log('\n📝 Step 4: Working on and completing subtask 2...');
    subtask2.status = 'in_progress';
    await syncHandler.syncTodos([subtask2]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    subtask2.status = 'completed';
    await syncHandler.syncTodos([subtask2]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    tasks = await api.getTasks(LIST_ID, true);
    const parentAfterTwo = tasks.find(t => t.name === parentTodo.content);
    console.log(`  Parent status: ${parentAfterTwo.status.status}`);
    console.log('  Expected: Still "in progress" (one subtask remaining)');
    
    // Step 5: Complete final subtask
    console.log('\n📝 Step 5: Completing final subtask...');
    subtask3.status = 'in_progress';
    await syncHandler.syncTodos([subtask3]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    subtask3.status = 'completed';
    await syncHandler.syncTodos([subtask3]);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Final verification
    console.log('\n🔍 Final Verification:');
    tasks = await api.getTasks(LIST_ID, true);
    
    const finalParent = tasks.find(t => t.name === parentTodo.content);
    const finalSub1 = tasks.find(t => t.name === subtask1.content);
    const finalSub2 = tasks.find(t => t.name === subtask2.content);
    const finalSub3 = tasks.find(t => t.name === subtask3.content);
    
    console.log('─'.repeat(60));
    console.log('📊 Final Status Report:');
    console.log('─'.repeat(60));
    
    const parentCompleted = ['completed', 'done', 'complete', 'closed']
      .includes(finalParent.status.status.toLowerCase());
    const sub1Completed = ['completed', 'done', 'complete', 'closed']
      .includes(finalSub1.status.status.toLowerCase());
    const sub2Completed = ['completed', 'done', 'complete', 'closed']
      .includes(finalSub2.status.status.toLowerCase());
    const sub3Completed = ['completed', 'done', 'complete', 'closed']
      .includes(finalSub3.status.status.toLowerCase());
    
    console.log(`Parent Task: ${finalParent.status.status} ${parentCompleted ? '✅' : '❌'}`);
    console.log(`  └─ Subtask 1: ${finalSub1.status.status} ${sub1Completed ? '✅' : '❌'}`);
    console.log(`  └─ Subtask 2: ${finalSub2.status.status} ${sub2Completed ? '✅' : '❌'}`);
    console.log(`  └─ Subtask 3: ${finalSub3.status.status} ${sub3Completed ? '✅' : '❌'}`);
    console.log('─'.repeat(60));
    
    // Test results
    if (parentCompleted && sub1Completed && sub2Completed && sub3Completed) {
      console.log('\n🎉 SUCCESS! Parent-child auto-completion working perfectly!');
      console.log('✅ All subtasks completed');
      console.log('✅ Parent task auto-completed when all subtasks finished');
      return true;
    } else {
      console.log('\n⚠️ Test partially successful');
      if (!parentCompleted) {
        console.log('❌ Parent task did not auto-complete');
      }
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    return false;
  }
}

// Run the test
console.log('\n🚀 Starting parent-child task flow test...\n');

testParentChildFlow()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests passed successfully!');
      console.log('Check your ClickUp workspace to see the tasks.');
    } else {
      console.log('\n⚠️ Some tests did not pass as expected.');
      console.log('Check the implementation and try again.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });