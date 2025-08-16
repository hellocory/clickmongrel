#!/usr/bin/env node

import { ClickUpAPI } from '../../dist/utils/clickup-api.js';
import { StatusValidator } from '../../dist/utils/status-validator.js';
import { SyncHandler } from '../../dist/handlers/sync.js';
import { CommitHandler } from '../../dist/handlers/commits.js';
import chalk from 'chalk';

console.log(chalk.cyan.bold('\n🧪 Final Verification Test\n'));
console.log('This test verifies that the status validation system is working correctly.\n');

const API_KEY = 'pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK';

async function testStatusValidation() {
  console.log(chalk.yellow('1. Testing StatusValidator...'));
  
  const validator = new StatusValidator(API_KEY);
  const api = new ClickUpAPI(API_KEY);
  
  // Get workspace and lists
  const user = await api.getCurrentUser();
  const teams = await api.getTeams();
  const workspace = teams[0];
  
  console.log(`   Workspace: ${workspace.name}`);
  
  const spaces = await api.getSpaces(workspace.id);
  if (spaces.length === 0) {
    console.log(chalk.red('   ❌ No spaces found'));
    return;
  }
  
  const space = spaces[0];
  console.log(`   Space: ${space.name}`);
  
  const lists = await api.getLists(space.id);
  console.log(`   Found ${lists.length} lists\n`);
  
  // Test validation for each list
  for (const list of lists) {
    console.log(chalk.yellow(`2. Testing list: ${list.name}`));
    
    const statuses = await api.getListStatuses(list.id);
    console.log(`   Current statuses: ${statuses.map(s => s.status).join(', ')}`);
    
    try {
      await validator.validateListStatuses(list.id, list.name.toLowerCase());
      console.log(chalk.green(`   ✅ Validation passed for ${list.name}`));
    } catch (error) {
      console.log(chalk.red(`   ❌ Validation failed: ${error.message}`));
    }
    console.log('');
  }
  
  // Test SyncHandler
  console.log(chalk.yellow('3. Testing SyncHandler initialization...'));
  try {
    const syncHandler = new SyncHandler(API_KEY);
    await syncHandler.initialize();
    console.log(chalk.green('   ✅ SyncHandler initialized successfully'));
  } catch (error) {
    console.log(chalk.red(`   ❌ SyncHandler failed: ${error.message}`));
  }
  
  // Test CommitHandler
  console.log(chalk.yellow('\n4. Testing CommitHandler...'));
  try {
    const commitHandler = new CommitHandler(API_KEY);
    await commitHandler.initialize();
    console.log(chalk.green('   ✅ CommitHandler initialized successfully'));
  } catch (error) {
    console.log(chalk.red(`   ❌ CommitHandler failed: ${error.message}`));
  }
  
  console.log(chalk.cyan.bold('\n✨ Test Complete!\n'));
  console.log('If you see validation failures above, you need to:');
  console.log('1. Go to ClickUp and add the required custom statuses');
  console.log('2. Follow the guide in .claude/clickup/STATUS_SETUP_GUIDE.md');
  console.log('3. Run "clickmongrel check-statuses" to verify');
}

testStatusValidation().catch(console.error);