#!/usr/bin/env node
import { PlanHandler } from '../../dist/handlers/plans.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

async function testPlanWorkflow() {
  console.log(chalk.cyan.bold('🎯 TESTING COMPLETE PLAN WORKFLOW\n'));
  console.log(chalk.gray('=' .repeat(60)));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const planHandler = new PlanHandler(apiKey);
  const api = new ClickUpAPI(apiKey);
  
  try {
    // 1. Initialize
    console.log(chalk.yellow('\n📦 1. INITIALIZE\n'));
    await planHandler.initialize();
    console.log(chalk.green('✅ PlanHandler initialized'));
    
    // 2. Create a plan from TodoWrite-like items
    console.log(chalk.yellow('\n📝 2. CREATE PLAN FROM TODOS\n'));
    
    const todos = [
      {
        id: 'setup-1',
        content: 'Set up project structure',
        status: 'pending'
      },
      {
        id: 'db-1',
        content: 'Create database schema',
        status: 'pending'
      },
      {
        id: 'api-1',
        content: 'Implement REST API endpoints',
        status: 'pending'
      },
      {
        id: 'ui-1',
        content: 'Build user interface',
        status: 'pending'
      },
      {
        id: 'test-1',
        content: 'Write unit tests',
        status: 'pending'
      }
    ];
    
    console.log(`Creating plan with ${todos.length} items...`);
    
    const plan = await planHandler.createPlanFromTodos(
      'Build Feature: User Dashboard',
      todos
    );
    
    console.log(chalk.green(`\n✅ Plan created: ${plan.title}`));
    console.log(`   Plan ID: ${plan.id}`);
    console.log(`   Goal Task ID: ${plan.goalId}`);
    console.log(`   Items: ${plan.items.length}`);
    
    // Show subtasks
    console.log(chalk.cyan('\n📋 Subtasks created:'));
    for (const item of plan.items) {
      console.log(`   - ${item.content}`);
      console.log(chalk.gray(`     Task ID: ${item.taskId}`));
    }
    
    // 3. Complete some plan items (simulating work progress)
    console.log(chalk.yellow('\n🔄 3. COMPLETING PLAN ITEMS\n'));
    
    // Complete first item
    console.log('Completing: "Set up project structure"...');
    await planHandler.completePlanItem(
      plan.id,
      'setup-1',
      'feat: Initialize project structure with necessary directories'
    );
    console.log(chalk.green('✅ Item 1 completed (commit created if in git repo)'));
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Complete second item
    console.log('\nCompleting: "Create database schema"...');
    await planHandler.completePlanItem(
      plan.id,
      'db-1',
      'feat: Add database schema with user and dashboard tables'
    );
    console.log(chalk.green('✅ Item 2 completed'));
    
    // 4. Check plan status
    console.log(chalk.yellow('\n📊 4. PLAN STATUS\n'));
    
    const updatedPlan = planHandler.getPlanStatus(plan.id);
    if (updatedPlan) {
      const completedCount = updatedPlan.items.filter(i => i.status === 'completed').length;
      const totalCount = updatedPlan.items.length;
      const progress = Math.round((completedCount / totalCount) * 100);
      
      console.log(`Plan Progress: ${completedCount}/${totalCount} items (${progress}%)`);
      console.log('\nItem Status:');
      updatedPlan.items.forEach(item => {
        const status = item.status === 'completed' ? '✅' : '⏳';
        const commit = item.commit ? ` (commit: ${item.commit.hash?.substring(0, 8)})` : '';
        console.log(`   ${status} ${item.content}${commit}`);
      });
    }
    
    // 5. Verify in ClickUp
    console.log(chalk.yellow('\n🔍 5. VERIFY IN CLICKUP\n'));
    
    if (plan.goalId) {
      const goalTask = await api.getTask(plan.goalId);
      console.log(`Goal Task: ${goalTask.name}`);
      console.log(`   Status: ${goalTask.status?.status}`);
      console.log(`   URL: https://app.clickup.com/t/${goalTask.id}`);
      
      // Check subtasks
      console.log('\nSubtasks in ClickUp:');
      for (const item of plan.items.slice(0, 3)) {
        if (item.taskId) {
          try {
            const subtask = await api.getTask(item.taskId);
            console.log(`   - ${subtask.name}: ${subtask.status?.status}`);
          } catch (e) {
            console.log(`   - ${item.content}: (error fetching)`);
          }
        }
      }
    }
    
    // 6. Complete all remaining items (optional - commented out)
    console.log(chalk.yellow('\n📝 6. NEXT STEPS\n'));
    console.log('To complete the plan:');
    console.log('1. Complete remaining items using completePlanItem()');
    console.log('2. Each completion creates a commit and updates progress');
    console.log('3. When all items are done, the goal is marked complete');
    
    console.log(chalk.green.bold('\n✅ PLAN WORKFLOW TEST SUCCESSFUL!\n'));
    console.log(chalk.gray('=' .repeat(60)));
    
    console.log(chalk.cyan('\n📊 Summary:'));
    console.log('- Plan created with goal task and subtasks');
    console.log('- Items can be completed with automatic commits');
    console.log('- Progress is tracked and updated');
    console.log('- Goal completes when all subtasks are done');
    
    console.log(chalk.yellow('\n⚠️  Tasks NOT deleted - review in ClickUp'));
    
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed:'));
    console.error(error);
    process.exit(1);
  }
}

// Run the test
console.log(chalk.cyan('Starting Plan Workflow Test...'));
console.log(chalk.gray('This will create a goal with subtasks in ClickUp.\n'));

testPlanWorkflow().catch(console.error);