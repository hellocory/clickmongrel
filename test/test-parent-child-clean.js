#!/usr/bin/env node

import { SyncHandler } from '../dist/handlers/sync.js';
import ClickUpAPI from '../dist/utils/clickup-api.js';
import chalk from 'chalk';

const API_KEY = 'pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK';

async function cleanupTestTasks(api, listId) {
  console.log(chalk.yellow('Cleaning up previous test tasks...'));
  const tasks = await api.getTasks(listId);
  
  for (const task of tasks) {
    if (task.name.includes('TEST:') || 
        task.name.includes('authentication system') ||
        task.name.includes('login form') ||
        task.name.includes('password validation') ||
        task.name.includes('JWT token')) {
      try {
        await api.deleteTask(task.id);
        console.log(chalk.gray(`  Deleted: ${task.name}`));
      } catch (e) {
        // Ignore
      }
    }
  }
}

async function testParentChild() {
  console.log(chalk.cyan.bold('\n🧪 Clean Parent-Child Task Test\n'));
  
  const syncHandler = new SyncHandler(API_KEY);
  const api = new ClickUpAPI(API_KEY);
  
  await syncHandler.initialize();
  const listId = syncHandler.listId;
  
  // Clean up first
  await cleanupTestTasks(api, listId);
  
  console.log(chalk.yellow('\n1. Creating parent task first...'));
  
  // Step 1: Create parent task
  const parentTodo = {
    id: 'parent-123',
    content: 'TEST: Parent Task for Authentication',
    status: 'pending'
  };
  
  await syncHandler.syncTodos([parentTodo]);
  await new Promise(r => setTimeout(r, 2000)); // Wait for ClickUp
  
  console.log(chalk.green('   ✓ Parent task created'));
  
  // Step 2: Create subtasks with parent reference
  console.log(chalk.yellow('\n2. Creating subtasks with parent reference...'));
  
  const todosWithSubtasks = [
    parentTodo, // Include parent for mapping
    {
      id: 'sub-1',
      content: 'TEST: Subtask 1 - Login Form',
      status: 'pending',
      parent_id: 'parent-123'
    },
    {
      id: 'sub-2',
      content: 'TEST: Subtask 2 - Validation',
      status: 'pending',
      parent_id: 'parent-123'
    },
    {
      id: 'sub-3',
      content: 'TEST: Subtask 3 - JWT',
      status: 'pending',
      parent_id: 'parent-123'
    }
  ];
  
  await syncHandler.syncTodos(todosWithSubtasks);
  await new Promise(r => setTimeout(r, 3000)); // Wait for ClickUp
  
  console.log(chalk.green('   ✓ Subtasks created'));
  
  // Step 3: Verify parent-child relationships
  console.log(chalk.yellow('\n3. Verifying parent-child relationships...'));
  
  const tasks = await api.getTasks(listId);
  const parentTask = tasks.find(t => t.name.includes('Parent Task'));
  
  if (parentTask) {
    console.log(chalk.cyan(`\nParent: ${parentTask.name}`));
    console.log(`  ID: ${parentTask.id}`);
    console.log(`  Status: ${parentTask.status.status}`);
    
    const subtasks = tasks.filter(t => t.parent === parentTask.id);
    console.log(`\n  Subtasks (${subtasks.length}):`);
    
    if (subtasks.length > 0) {
      subtasks.forEach(st => {
        console.log(chalk.green(`    ✓ ${st.name} (parent: ${st.parent})`));
      });
    } else {
      console.log(chalk.red('    No subtasks found with parent relationship!'));
      
      // Show what we have
      const testTasks = tasks.filter(t => t.name.includes('TEST:'));
      console.log(chalk.yellow('\n  All test tasks:'));
      testTasks.forEach(t => {
        console.log(`    - ${t.name} (parent: ${t.parent || 'NONE'})`);
      });
    }
  }
  
  // Step 4: Test auto-completion
  console.log(chalk.yellow('\n4. Testing parent auto-completion...'));
  console.log(chalk.gray('   Completing all subtasks...'));
  
  // Complete all subtasks
  const completedTodos = todosWithSubtasks.map(t => ({
    ...t,
    status: t.id === 'parent-123' ? 'pending' : 'completed'
  }));
  
  await syncHandler.syncTodos(completedTodos);
  await new Promise(r => setTimeout(r, 3000)); // Wait for auto-completion
  
  // Check parent status
  const updatedParent = await api.getTask(parentTask.id);
  console.log(chalk.cyan(`\n  Parent task status: ${updatedParent.status.status}`));
  
  if (updatedParent.status.status.toLowerCase() === 'completed') {
    console.log(chalk.green.bold('  ✅ SUCCESS: Parent auto-completed!'));
  } else {
    console.log(chalk.yellow('  ⚠️  Parent not auto-completed'));
  }
  
  console.log(chalk.cyan.bold('\n✨ Test Complete!\n'));
}

testParentChild().catch(console.error);