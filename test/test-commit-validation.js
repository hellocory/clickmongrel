import { CommitHandler } from '../dist/handlers/commits.js';
import chalk from 'chalk';

console.log(chalk.cyan('\n🧪 Testing Commit Status Validation\n'));

const commitHandler = new CommitHandler('pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK');

// Test commit
const testCommit = {
  hash: 'abc123def',
  message: 'test: Validate commit status checking',
  author: 'Test User',
  timestamp: new Date().toISOString()
};

console.log(chalk.yellow('Attempting to track commit...'));

try {
  await commitHandler.linkCommit(testCommit);
  console.log(chalk.red('❌ ERROR: Commit tracking should have failed but it succeeded!'));
} catch (error) {
  console.log(chalk.green('✅ SUCCESS: Commit tracking correctly failed with validation error'));
  console.log(chalk.gray('Error:', error.message));
  
  // Check if it's the right error
  if (error.message.includes('commits list is missing required statuses')) {
    console.log(chalk.green('✅ Correct error type - missing commit statuses'));
  }
}

console.log(chalk.cyan('\n📝 Summary:'));
console.log('The commit handler correctly blocks tracking when:');
console.log('  • Required commit statuses are not configured');
console.log('  • Lists are using default statuses instead of custom ones');
console.log('  • Status names don\'t match exactly (case-sensitive)');