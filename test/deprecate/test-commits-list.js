#!/usr/bin/env node
import { WorkflowHandler } from '../../dist/handlers/workflow.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

async function testCommitsList() {
  console.log(chalk.cyan.bold('🔍 TESTING COMMITS LIST TRACKING\n'));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const workflowHandler = new WorkflowHandler(apiKey);
  const api = new ClickUpAPI(apiKey);
  
  try {
    await workflowHandler.initialize();
    console.log(chalk.green('✅ WorkflowHandler initialized'));
    
    // Check Commits list before
    console.log(chalk.yellow('\n📊 Commits list BEFORE:'));
    const commitsBefore = await api.getTasks('901317936118');
    console.log(`Found ${commitsBefore.length} commits`);
    
    // Create a test task
    const testTodo = [{
      id: 'commit-list-test',
      content: 'Test commit list tracking',
      status: 'pending'
    }];
    
    const tasks = await workflowHandler.createTasksFromTodos(testTodo);
    console.log(chalk.green(`\n✅ Created task: ${tasks[0].name}`));
    console.log(`   Task ID: ${tasks[0].taskId}`);
    
    // Complete the task to trigger commit
    console.log(chalk.yellow('\n🔄 Completing task to create commit...'));
    if (tasks[0].taskId) {
      await workflowHandler.completeTask(
        tasks[0].taskId,
        'test: Verify commits appear in Commits list'
      );
      console.log(chalk.green('✅ Task completed with commit'));
    }
    
    // Wait a moment for ClickUp to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check Commits list after
    console.log(chalk.yellow('\n📊 Commits list AFTER:'));
    const commitsAfter = await api.getTasks('901317936118');
    console.log(`Found ${commitsAfter.length} commits`);
    
    if (commitsAfter.length > commitsBefore.length) {
      console.log(chalk.green(`\n✅ NEW COMMITS ADDED TO LIST!`));
      
      const newCommits = commitsAfter.slice(0, commitsAfter.length - commitsBefore.length);
      console.log(`\nNew commits in list:`);
      newCommits.forEach(commit => {
        console.log(`  - ${commit.name}`);
        console.log(`    Status: ${commit.status?.status}`);
        console.log(`    URL: https://app.clickup.com/t/${commit.id}`);
      });
    } else {
      console.log(chalk.red('\n❌ No new commits in Commits list'));
      console.log('Check the default Commits list ID in CommitHandler');
    }
    
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed:'));
    console.error(error);
  }
}

testCommitsList().catch(console.error);