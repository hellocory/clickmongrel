import { SyncHandler } from '../../dist/handlers/sync.js';
import configManager from '../../dist/config/index.js';
import chalk from 'chalk';

console.log(chalk.cyan('\n🔍 Debugging Auto-Assignment Configuration\n'));

// Check what configManager thinks
console.log(chalk.yellow('ConfigManager Status:'));
console.log('  auto_assign_user:', configManager.shouldAutoAssignUser());
console.log('  assignee_user_id:', configManager.getAssigneeUserId());

// Check the raw config
const config = configManager.getConfig();
console.log('\nRaw config.clickup:');
console.log('  auto_assign_user:', config.clickup.auto_assign_user);
console.log('  assignee_user_id:', config.clickup.assignee_user_id);

// Now simulate initialization
console.log(chalk.yellow('\nInitializing SyncHandler...'));
const syncHandler = new SyncHandler('pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK');
await syncHandler.initialize();

// Check again after init
console.log(chalk.yellow('\nAfter initialization:'));
console.log('  auto_assign_user:', configManager.shouldAutoAssignUser());
console.log('  assignee_user_id:', configManager.getAssigneeUserId());

// Test creating a task
console.log(chalk.yellow('\nTesting task creation with assignment...'));
const testTodo = {
  id: 'debug-test',
  content: 'Debug assignment test',
  status: 'pending'
};

// Call the internal method to see what task data would be created
const taskData = {
  name: testTodo.content,
  status: 'to do'
};

// Check if assignment would be added
if (configManager.shouldAutoAssignUser()) {
  const assigneeId = configManager.getAssigneeUserId();
  console.log(chalk.green(`✅ Auto-assign is enabled`));
  console.log(`  Assignee ID: ${assigneeId}`);
  
  if (assigneeId) {
    taskData.assignees = [assigneeId];
    console.log(chalk.green(`✅ Task would be assigned to user ID: ${assigneeId}`));
  } else {
    console.log(chalk.red(`❌ No assignee ID found`));
  }
} else {
  console.log(chalk.red(`❌ Auto-assign is disabled`));
}

console.log('\nFinal task data:');
console.log(JSON.stringify(taskData, null, 2));