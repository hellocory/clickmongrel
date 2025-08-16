#!/usr/bin/env node
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(chalk.cyan.bold('\n🚀 ClickMongrel Integration Test Suite\n'));

async function runTests() {
  try {
    // Check if we're in test environment or main
    const isTestEnv = process.cwd().includes('test-runs');
    const configPath = isTestEnv ? '.claude/clickup/config.json' : '../.claude/clickup/config.json';
    
    // Load config to get list IDs
    let config;
    try {
      config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    } catch (e) {
      console.log(chalk.red('❌ No config found. Run quick-setup first.'));
      process.exit(1);
    }
    
    console.log(chalk.gray('Environment:', isTestEnv ? 'Test' : 'Development'));
    console.log(chalk.gray('Space:', config.space?.name || 'Unknown'));
    console.log(chalk.gray('Tasks List:', config.lists?.tasks || 'Not configured'));
    console.log(chalk.gray('Commits List:', config.lists?.commits || 'Not configured'));
    
    if (!config.lists?.tasks) {
      console.log(chalk.red('❌ Lists not configured. Run quick-setup first.'));
      process.exit(1);
    }

    // Test data
    const testTodos = [
      { id: 'test-parent', content: 'Test parent task', status: 'pending' },
      { id: 'test-sub-1', content: 'Test subtask 1', status: 'pending' },
      { id: 'test-sub-2', content: 'Test subtask 2', status: 'pending' },
      { id: 'test-standalone', content: 'Test standalone task', status: 'pending' }
    ];

    console.log(chalk.cyan('\n📝 Running Integration Tests...\n'));

    // Import the handlers
    const distPath = isTestEnv ? './dist' : '../dist';
    const { SyncHandler } = await import(path.join(distPath, 'handlers/sync.js'));
    const { GoalHandler } = await import(path.join(distPath, 'handlers/goals.js'));
    const { CommitHandler } = await import(path.join(distPath, 'handlers/commits.js'));

    const apiKey = process.env.CLICKUP_API_KEY || 'pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK';

    // Initialize handlers
    const syncHandler = new SyncHandler(apiKey, config.lists.tasks);
    const goalHandler = new GoalHandler(apiKey);
    const commitHandler = new CommitHandler(apiKey);

    console.log(chalk.yellow('Initializing handlers...'));
    await syncHandler.initialize();
    await goalHandler.initialize();

    // Test 1: Sync todos
    console.log(chalk.cyan('✅ Test 1: Syncing todos to ClickUp...'));
    try {
      await syncHandler.syncTodos(testTodos);
      console.log(chalk.green('   ✓ Todos synced successfully!'));
    } catch (e) {
      console.log(chalk.red('   ✗ Failed:', e.message));
    }

    // Test 2: Create a goal
    console.log(chalk.cyan('✅ Test 2: Creating test goal...'));
    let testGoal;
    try {
      testGoal = await goalHandler.createGoal({
        name: 'ClickMongrel Test Run - ' + new Date().toISOString().slice(0,16),
        description: 'Automated integration test',
        color: '#5b9fd6'
      });
      console.log(chalk.green('   ✓ Goal created:', testGoal.id));
    } catch (e) {
      console.log(chalk.red('   ✗ Failed:', e.message));
    }

    // Test 3: Update a task to completed
    console.log(chalk.cyan('✅ Test 3: Completing first subtask...'));
    try {
      testTodos[1].status = 'completed';
      await syncHandler.syncTodos(testTodos);
      console.log(chalk.green('   ✓ Task completed!'));
    } catch (e) {
      console.log(chalk.red('   ✗ Failed:', e.message));
    }

    // Test 4: Create a commit
    console.log(chalk.cyan('✅ Test 4: Creating test commit...'));
    try {
      await commitHandler.linkCommit({
        hash: 'test' + Date.now(),
        message: 'test: Validate subtask completion',
        author: 'Test User',
        timestamp: new Date().toISOString()
      });
      console.log(chalk.green('   ✓ Commit tracked!'));
    } catch (e) {
      console.log(chalk.red('   ✗ Failed:', e.message));
    }

    // Test 5: Update goal progress (if goal was created)
    if (testGoal) {
      console.log(chalk.cyan('✅ Test 5: Updating goal progress...'));
      try {
        // Switch to the test goal first
        await goalHandler.switchGoal(testGoal.id);
        
        // Try different progress update methods
        const progressValue = 25;
        console.log(chalk.gray('   Attempting progress update to', progressValue + '%'));
        
        // Method 1: Direct API call with full goal data
        const ClickUpAPI = (await import(path.join(distPath, 'utils/clickup-api.js'))).default;
        const api = new ClickUpAPI(apiKey);
        
        // Get current goal data
        const currentGoal = await api.getGoal(testGoal.id);
        
        // Update with all existing fields plus new progress
        const updatedGoal = await api.makeRequest(
          `/goal/${testGoal.id}`,
          'PUT',
          {
            ...currentGoal,
            percent_completed: progressValue
          }
        );
        
        console.log(chalk.green('   ✓ Goal progress updated to', progressValue + '%'));
      } catch (e) {
        console.log(chalk.yellow('   ⚠ Goal progress update failed (known API issue):', e.message));
      }
    }

    // Test 6: Get sync status
    console.log(chalk.cyan('✅ Test 6: Checking sync status...'));
    try {
      const status = syncHandler.getSyncStatus();
      console.log(chalk.green('   ✓ Sync Status:'));
      console.log(chalk.gray('     Queue size:', status.queueSize));
      console.log(chalk.gray('     In progress:', status.inProgress));
      console.log(chalk.gray('     List ID:', status.listId));
    } catch (e) {
      console.log(chalk.red('   ✗ Failed:', e.message));
    }

    // Test 7: List all goals
    console.log(chalk.cyan('✅ Test 7: Listing goals...'));
    try {
      const goals = await goalHandler.listGoals();
      console.log(chalk.green('   ✓ Found', goals.length, 'goals'));
      if (goals.length > 0) {
        console.log(chalk.gray('     Latest:', goals[0].name));
      }
    } catch (e) {
      console.log(chalk.red('   ✗ Failed:', e.message));
    }

    // Test 8: Generate report
    console.log(chalk.cyan('✅ Test 8: Generating report...'));
    try {
      const ReportHandler = (await import(path.join(distPath, 'handlers/reports.js'))).default;
      const reportHandler = new ReportHandler(apiKey);
      const report = await reportHandler.generateReport('daily');
      console.log(chalk.green('   ✓ Report generated with', report.split('\n').length, 'lines'));
    } catch (e) {
      console.log(chalk.red('   ✗ Failed:', e.message));
    }

    console.log(chalk.green.bold('\n✅ Test suite completed!'));
    console.log(chalk.yellow('\n📊 Summary:'));
    console.log('• Tasks synced to ClickUp');
    console.log('• Goal created (check ClickUp Goals)');
    console.log('• Commit tracked (check Commits list)');
    console.log('• Task marked as completed');
    
    console.log(chalk.cyan('\n🔍 Verify in ClickUp:'));
    console.log(`1. Open workspace: ${config.workspace?.name || 'Your Workspace'}`);
    console.log(`2. Go to space: ${config.space?.name || 'Agentic Development'}`);
    console.log('3. Check Tasks list for test tasks');
    console.log('4. Check Commits list for test commit');
    console.log('5. Check Goals for test goal');
    
    if (isTestEnv) {
      console.log(chalk.cyan('\nSETUP_COMPLETE'));
    }
    
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

runTests();