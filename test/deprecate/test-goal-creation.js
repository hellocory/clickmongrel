#!/usr/bin/env node
import { GoalHandler } from '../../dist/handlers/goals.js';
import chalk from 'chalk';

async function testGoalCreation() {
  console.log(chalk.cyan.bold('🎯 Testing Goal Creation\n'));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const goalHandler = new GoalHandler(apiKey);
  
  try {
    // Initialize
    await goalHandler.initialize();
    console.log(chalk.green('✅ Goal handler initialized'));
    
    // List existing goals
    const existingGoals = await goalHandler.getGoals();
    console.log(`\nFound ${existingGoals.length} existing goals:`);
    existingGoals.forEach(g => {
      console.log(`  - ${g.name} (${g.percent_completed}%)`);
    });
    
    // Create a test goal
    console.log(chalk.yellow('\n📝 Creating test goal...'));
    const testGoal = await goalHandler.createGoal({
      name: `Test Goal ${Date.now()}`,
      description: 'Testing goal creation from ClickMongrel',
      percent_completed: 0
    });
    
    console.log(chalk.green('\n✅ Goal created:'));
    console.log(`  Name: ${testGoal.name}`);
    console.log(`  ID: ${testGoal.id}`);
    console.log(`  Description: ${testGoal.description}`);
    console.log(`  Progress: ${testGoal.percent_completed}%`);
    
    // Update progress
    console.log(chalk.yellow('\n🔄 Updating progress to 50%...'));
    const updated = await goalHandler.updateGoalProgress(testGoal.id, 50);
    console.log(chalk.green(`✅ Progress updated to ${updated.percent_completed}%`));
    
    console.log(chalk.yellow('\n⚠️ Goal NOT deleted - clean up manually if needed'));
    
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed:'));
    console.error(error);
  }
}

testGoalCreation().catch(console.error);