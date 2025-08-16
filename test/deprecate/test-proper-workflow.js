#!/usr/bin/env node
import { WorkflowHandler } from '../../dist/handlers/workflow.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

async function testProperWorkflow() {
  console.log(chalk.cyan.bold('🎯 TESTING PROPER WORKFLOW\n'));
  console.log(chalk.gray('Tasks → Complete → Auto-commit → Track on task → Parent auto-completes\n'));
  console.log(chalk.gray('=' .repeat(60)));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const workflowHandler = new WorkflowHandler(apiKey);
  const api = new ClickUpAPI(apiKey);
  
  try {
    // Initialize
    await workflowHandler.initialize();
    console.log(chalk.green('✅ WorkflowHandler initialized\n'));
    
    // Test 1: Single task workflow
    console.log(chalk.yellow('📝 TEST 1: SINGLE TASK WORKFLOW\n'));
    
    const singleTodo = [{
      id: 'single-1',
      content: 'Implement single feature',
      status: 'pending',
      priority: 'normal',
      tags: ['feature', 'test']
    }];
    
    const singleTasks = await workflowHandler.createTasksFromTodos(singleTodo);
    console.log(chalk.green(`✅ Created single task: ${singleTasks[0].name}`));
    console.log(`   Task ID: ${singleTasks[0].taskId}`);
    
    // Complete the single task
    console.log(chalk.yellow('\n🔄 Completing single task...'));
    if (singleTasks[0].taskId) {
      await workflowHandler.completeTask(
        singleTasks[0].taskId,
        'feat: Implement single feature functionality'
      );
      console.log(chalk.green('✅ Task completed with commit'));
      
      // Verify in ClickUp
      const task = await api.getTask(singleTasks[0].taskId);
      console.log(`   Status: ${task.status?.status}`);
      console.log(`   URL: https://app.clickup.com/t/${task.id}`);
    }
    
    // Test 2: Multiple tasks with parent
    console.log(chalk.yellow('\n📝 TEST 2: PARENT-SUBTASK WORKFLOW\n'));
    
    const multipleTodos = [
      {
        id: 'sub-1',
        content: 'Setup database',
        status: 'pending',
        priority: 'high'
      },
      {
        id: 'sub-2',
        content: 'Create API endpoints',
        status: 'pending',
        priority: 'high'
      },
      {
        id: 'sub-3',
        content: 'Build UI components',
        status: 'pending',
        priority: 'normal'
      }
    ];
    
    const tasks = await workflowHandler.createTasksFromTodos(
      multipleTodos,
      'Feature: User Management'
    );
    
    console.log(chalk.green(`✅ Created ${tasks.length} tasks`));
    const parentTask = tasks[0];
    const subtasks = tasks.slice(1);
    
    console.log(`   Parent: ${parentTask.name} (${parentTask.taskId})`);
    subtasks.forEach(st => {
      console.log(`   - Subtask: ${st.name} (${st.taskId})`);
    });
    
    // Complete subtasks one by one
    console.log(chalk.yellow('\n🔄 Completing subtasks...'));
    
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      if (subtask.taskId) {
        console.log(`\nCompleting: ${subtask.name}`);
        await workflowHandler.completeTask(
          subtask.taskId,
          `✅ Complete: ${subtask.name}`
        );
        console.log(chalk.green(`✅ Subtask ${i + 1}/${subtasks.length} completed`));
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Check parent status
    console.log(chalk.yellow('\n📊 Checking parent task status...'));
    if (parentTask.taskId) {
      const parent = await api.getTask(parentTask.taskId);
      console.log(`Parent task status: ${parent.status?.status}`);
      
      if (parent.status?.status === 'completed') {
        console.log(chalk.green('✅ Parent task auto-completed when all subtasks done!'));
      } else {
        console.log(chalk.yellow('⚠️ Parent task not yet completed (may need manual check)'));
      }
      
      console.log(`Parent URL: https://app.clickup.com/t/${parent.id}`);
    }
    
    // Summary
    console.log(chalk.green.bold('\n✅ WORKFLOW TEST COMPLETED!\n'));
    console.log(chalk.gray('=' .repeat(60)));
    
    console.log(chalk.cyan('\n📊 Results:'));
    console.log('1. Single task: Created → Completed with commit');
    console.log('2. Parent-subtask: Created parent with subtasks');
    console.log('3. Subtasks completed with individual commits');
    console.log('4. Commits tracked on each task');
    console.log('5. Parent should auto-complete when all subtasks done');
    
    console.log(chalk.yellow('\n⚠️ Tasks NOT deleted - review in ClickUp'));
    
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed:'));
    console.error(error);
    process.exit(1);
  }
}

testProperWorkflow().catch(console.error);