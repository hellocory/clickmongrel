import { SyncHandler } from '../../dist/handlers/sync.js';
import chalk from 'chalk';

console.log(chalk.cyan('\n🧪 Testing Status Validation Failure\n'));

const syncHandler = new SyncHandler('pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK');

// Initialize
await syncHandler.initialize();

// Try to sync - this should fail
const testTodos = [{
  id: 'will-fail',
  content: 'This should fail without proper statuses',
  status: 'pending'
}];

console.log(chalk.yellow('Attempting to sync todo...'));

try {
  await syncHandler.syncTodos(testTodos);
  console.log(chalk.red('❌ ERROR: Sync should have failed but it succeeded!'));
} catch (error) {
  console.log(chalk.green('✅ SUCCESS: Sync correctly failed with validation error'));
  console.log(chalk.gray('Error message:', error.message));
}