#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';
import WorkflowHandler from '../../dist/handlers/workflow.js';
import configManager from '../../dist/config/index.js';

const API_KEY = configManager.getApiKey() || process.env.CLICKUP_API_KEY || 'pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK';

console.log('API Key being used:', API_KEY ? API_KEY.substring(0, 10) + '...' : 'NONE');

async function testCompleteWorkflow() {
  console.log('🚀 TESTING COMPLETE WORKFLOW\n');
  
  const api = new ClickUpAPI(API_KEY);
  const workflowHandler = new WorkflowHandler(api);
  
  // Initialize and get lists
  await workflowHandler.initialize();
  const lists = workflowHandler.getCurrentLists();
  
  console.log('📋 Current Configuration:');
  console.log(`  - Primary List: ${lists.primaryList?.name} (${lists.primaryListId})`);
  console.log(`  - Commits List: ${lists.commitsList?.name} (${lists.commitsListId})`);
  console.log('\n---\n');
  
  // Step 1: Create a parent task with subtasks
  console.log('1️⃣ Creating parent task with subtasks...');
  const todos = [
    { id: 'parent-1', content: 'Build user authentication system', status: 'pending' },
    { id: 'sub-1', content: '  - Create login form', status: 'pending' },
    { id: 'sub-2', content: '  - Add password validation', status: 'pending' },
    { id: 'sub-3', content: '  - Implement JWT tokens', status: 'pending' }
  ];
  
  const createResult = await workflowHandler.createTasks(todos);
  console.log(`✅ Created ${createResult.created.length} tasks`);
  
  // Wait a moment for ClickUp to process
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 2: Complete first subtask
  console.log('\n2️⃣ Completing first subtask (should create commit)...');
  const sub1Id = createResult.created.find(t => t.name.includes('Create login form'))?.id;
  if (sub1Id) {
    const completeResult = await workflowHandler.completeTask(sub1Id);
    console.log(`✅ Task completed: ${completeResult.task.name}`);
    if (completeResult.commit) {
      console.log(`📝 Commit created: ${completeResult.commit.title}`);
      console.log(`   Status: ${completeResult.commit.status}`);
      console.log(`   In Commits list: ${completeResult.commit.id}`);
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 3: Check Commits list
  console.log('\n3️⃣ Checking Commits list...');
  const commitsListTasks = await api.getTasks(lists.commitsListId);
  console.log(`Found ${commitsListTasks.tasks.length} tasks in Commits list:`);
  commitsListTasks.tasks.forEach(task => {
    console.log(`  - ${task.name} (status: ${task.status.status})`);
  });
  
  // Step 4: Complete remaining subtasks
  console.log('\n4️⃣ Completing remaining subtasks...');
  for (const task of createResult.created) {
    if (task.name.includes('password validation') || task.name.includes('JWT tokens')) {
      await workflowHandler.completeTask(task.id);
      console.log(`✅ Completed: ${task.name}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Step 5: Check if parent auto-completed
  console.log('\n5️⃣ Checking parent task status...');
  const parentId = createResult.created.find(t => t.name.includes('authentication system'))?.id;
  if (parentId) {
    const parentTask = await api.getTask(parentId);
    console.log(`Parent task status: ${parentTask.status.status}`);
    if (parentTask.status.status === 'complete' || parentTask.status.status === 'done') {
      console.log('✅ Parent task auto-completed!');
    }
  }
  
  // Final check
  console.log('\n📊 FINAL STATUS:');
  const finalCommitsList = await api.getTasks(lists.commitsListId);
  console.log(`Commits in list: ${finalCommitsList.tasks.length}`);
  
  const primaryListTasks = await api.getTasks(lists.primaryListId);
  const completedTasks = primaryListTasks.tasks.filter(t => 
    t.status.status === 'complete' || t.status.status === 'done'
  );
  console.log(`Completed tasks: ${completedTasks.length}`);
  
  console.log('\n✨ Workflow test complete!');
}

testCompleteWorkflow().catch(console.error);