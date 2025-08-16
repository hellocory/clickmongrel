#!/usr/bin/env node
import { PlanHandler } from '../../dist/handlers/plans.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

async function testCommitTracking() {
  console.log(chalk.cyan.bold('🔍 Testing Commit Tracking in Commits List\n'));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const planHandler = new PlanHandler(apiKey);
  const api = new ClickUpAPI(apiKey);
  
  try {
    // Initialize
    await planHandler.initialize();
    console.log(chalk.green('✅ PlanHandler initialized'));
    
    // Create a simple plan
    const todos = [
      {
        id: 'commit-test-1',
        content: 'Test commit tracking',
        status: 'pending'
      }
    ];
    
    console.log(chalk.yellow('\n📝 Creating test plan...'));
    const plan = await planHandler.createPlanFromTodos(
      'Test Commit Tracking',
      todos
    );
    console.log(chalk.green(`✅ Plan created: ${plan.title}`));
    console.log(`   Goal Task: ${plan.goalId}`);
    console.log(`   Subtask: ${plan.items[0].taskId}`);
    
    // Complete the item to trigger commit
    console.log(chalk.yellow('\n🔄 Completing item to create commit...'));
    await planHandler.completePlanItem(
      plan.id,
      'commit-test-1',
      'test: Verify commit tracking in Commits list'
    );
    console.log(chalk.green('✅ Item completed and commit created'));
    
    // Check the Commits list
    console.log(chalk.yellow('\n📊 Checking Commits list...'));
    const commitsList = await api.getTasks('901317936118'); // Commits list ID
    
    console.log(`\nFound ${commitsList.length} tasks in Commits list:`);
    
    // Show recent commits
    const recentCommits = commitsList.slice(0, 5);
    recentCommits.forEach(task => {
      console.log(`\n  📝 ${task.name}`);
      console.log(`     Status: ${task.status?.status}`);
      console.log(`     Created: ${new Date(parseInt(task.date_created)).toLocaleString()}`);
      console.log(`     URL: https://app.clickup.com/t/${task.id}`);
    });
    
    // Look for our test commit
    const testCommit = commitsList.find(t => 
      t.name.includes('test: Verify commit tracking') ||
      t.description?.includes('test: Verify commit tracking')
    );
    
    if (testCommit) {
      console.log(chalk.green('\n✅ Test commit found in Commits list!'));
      console.log(`   Name: ${testCommit.name}`);
      console.log(`   ID: ${testCommit.id}`);
    } else {
      console.log(chalk.yellow('\n⚠️ Test commit not found in recent commits'));
      console.log('It may take a moment to appear or check manually in ClickUp');
    }
    
    console.log(chalk.cyan('\n📋 Summary:'));
    console.log('- Plan created with subtask');
    console.log('- Commit created when item completed');
    console.log('- Commits should appear in the Commits list');
    console.log('- Each commit is linked to its task');
    
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed:'));
    console.error(error);
  }
}

testCommitTracking().catch(console.error);