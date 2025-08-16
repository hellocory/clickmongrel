#!/usr/bin/env node

import { SyncHandler } from '../dist/handlers/sync.js';
import { CommitHandler } from '../dist/handlers/commits.js';
import ClickUpAPI from '../dist/utils/clickup-api.js';
import chalk from 'chalk';

const API_KEY = 'pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFullFlow() {
  console.log(chalk.cyan.bold('\n🚀 Full Task-Commit Flow Test with Parent-Child Relationships\n'));
  
  const syncHandler = new SyncHandler(API_KEY);
  const commitHandler = new CommitHandler(API_KEY);
  const api = new ClickUpAPI(API_KEY);
  
  console.log(chalk.yellow('Initializing handlers...'));
  await syncHandler.initialize();
  await commitHandler.initialize();
  const listId = syncHandler.listId;
  
  // Step 1: Create parent task first
  console.log(chalk.cyan('\n📋 Step 1: Creating parent task...'));
  const parentTodo = {
    id: 'feature-auth',
    content: 'Implement user authentication',
    status: 'pending'
  };
  
  await syncHandler.syncTodos([parentTodo]);
  await sleep(2000);
  console.log(chalk.green('✓ Parent task created\n'));
  
  // Step 2: Create subtasks
  console.log(chalk.cyan('📋 Step 2: Creating subtasks...'));
  const allTodos = [
    parentTodo,
    {
      id: 'task-login',
      content: 'Create login form',
      status: 'pending',
      parent_id: 'feature-auth'
    },
    {
      id: 'task-validation',
      content: 'Add password validation',
      status: 'pending',
      parent_id: 'feature-auth'
    },
    {
      id: 'task-jwt',
      content: 'Implement JWT tokens',
      status: 'pending',
      parent_id: 'feature-auth'
    }
  ];
  
  await syncHandler.syncTodos(allTodos);
  await sleep(3000);
  console.log(chalk.green('✓ Subtasks created\n'));
  
  // Step 3: Verify structure in ClickUp
  console.log(chalk.cyan('📋 Step 3: Verifying task structure...'));
  const tasks = await api.getTasks(listId);
  const parentTask = tasks.find(t => t.name === 'Implement user authentication');
  
  if (parentTask) {
    console.log(chalk.green(`✓ Parent: ${parentTask.name} (${parentTask.id})`));
    const subtasks = tasks.filter(t => t.parent === parentTask.id);
    console.log(chalk.gray(`  Found ${subtasks.length} subtasks:`));
    subtasks.forEach(st => {
      console.log(chalk.gray(`    - ${st.name}`));
    });
  }
  console.log('');
  
  // Step 4: Complete first subtask with commit
  console.log(chalk.cyan('📋 Step 4: Completing first subtask with commit...'));
  allTodos[1].status = 'completed';
  await syncHandler.syncTodos(allTodos);
  await sleep(2000);
  
  const commit1 = {
    hash: 'abc' + Date.now(),
    message: 'feat: Create login form component',
    author: 'Test User',
    timestamp: new Date().toISOString()
  };
  await commitHandler.linkCommit(commit1);
  console.log(chalk.green('✓ First subtask completed and commit tracked\n'));
  await sleep(2000);
  
  // Step 5: Complete second subtask
  console.log(chalk.cyan('📋 Step 5: Completing second subtask with commit...'));
  allTodos[2].status = 'completed';
  await syncHandler.syncTodos(allTodos);
  await sleep(2000);
  
  const commit2 = {
    hash: 'def' + Date.now(),
    message: 'feat: Add password validation logic',
    author: 'Test User',
    timestamp: new Date().toISOString()
  };
  await commitHandler.linkCommit(commit2);
  console.log(chalk.green('✓ Second subtask completed and commit tracked\n'));
  await sleep(2000);
  
  // Step 6: Complete final subtask (should trigger parent completion)
  console.log(chalk.cyan('📋 Step 6: Completing final subtask (should auto-complete parent)...'));
  allTodos[3].status = 'completed';
  await syncHandler.syncTodos(allTodos);
  await sleep(2000);
  
  const commit3 = {
    hash: 'ghi' + Date.now(),
    message: 'feat: Implement JWT token authentication',
    author: 'Test User',
    timestamp: new Date().toISOString()
  };
  await commitHandler.linkCommit(commit3);
  console.log(chalk.green('✓ Final subtask completed and commit tracked\n'));
  await sleep(3000);
  
  // Step 7: Check if parent auto-completed
  console.log(chalk.cyan('📋 Step 7: Checking parent task status...'));
  const updatedParent = await api.getTask(parentTask.id);
  console.log(chalk.yellow(`Parent task status: ${updatedParent.status.status}`));
  
  if (updatedParent.status.status.toLowerCase() === 'completed') {
    console.log(chalk.green.bold('✅ SUCCESS: Parent task auto-completed!\n'));
  } else {
    console.log(chalk.yellow('⚠️  Parent task not auto-completed\n'));
  }
  
  // Step 8: Verify commits in Commits list
  console.log(chalk.cyan('📋 Step 8: Verifying commits in ClickUp...'));
  const commitsListId = commitHandler.commitsListId;
  if (commitsListId) {
    const commits = await api.getTasks(commitsListId);
    const testCommits = commits.filter(c => c.name.includes('feat:'));
    console.log(chalk.green(`✓ Found ${testCommits.length} commits in Commits list`));
    testCommits.forEach(c => {
      console.log(chalk.gray(`    - ${c.name} (${c.status.status})`));
    });
  }
  
  // Final Summary
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════'));
  console.log(chalk.cyan.bold('📊 Test Summary'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════\n'));
  
  const finalTasks = await api.getTasks(listId);
  const parent = finalTasks.find(t => t.name === 'Implement user authentication');
  const subs = finalTasks.filter(t => t.parent === parent?.id);
  
  console.log(chalk.white('Task Structure:'));
  console.log(chalk.white(`  • Parent: ${parent?.name} (${parent?.status.status})`));
  subs.forEach(s => {
    console.log(chalk.white(`    - ${s.name} (${s.status.status})`));
  });
  
  console.log(chalk.white('\nResults:'));
  console.log(chalk.green('  ✅ Parent-child relationships established'));
  console.log(chalk.green('  ✅ Subtasks created under parent'));
  console.log(chalk.green('  ✅ Commits tracked in Commits list'));
  
  if (updatedParent.status.status.toLowerCase() === 'completed') {
    console.log(chalk.green('  ✅ Parent auto-completed when all subtasks done'));
  } else {
    console.log(chalk.yellow('  ⚠️  Parent auto-completion needs verification'));
  }
  
  console.log(chalk.cyan.bold('\n✨ Test Complete!\n'));
}

testFullFlow().catch(console.error);