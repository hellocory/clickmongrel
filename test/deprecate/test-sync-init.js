#!/usr/bin/env node
import { SyncHandler } from '../../dist/handlers/sync.js';
import chalk from 'chalk';

async function testSyncInit() {
  console.log(chalk.cyan.bold('🧪 Testing Sync Handler Initialization\n'));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const syncHandler = new SyncHandler(apiKey);
  
  try {
    console.log(chalk.yellow('📦 Initializing sync handler...'));
    await syncHandler.initialize();
    console.log(chalk.green('✅ Sync handler initialized'));
    
    // Check if todoIdFieldId was set
    console.log(chalk.cyan('\n🔍 Checking internal state:'));
    console.log('List ID:', syncHandler.listId);
    console.log('Todo ID Field ID:', syncHandler.todoIdFieldId || 'NOT SET');
    
    // Create a test todo to see what happens
    const testTodo = {
      id: `init-test-${Date.now()}`,
      content: `Init Test - ${new Date().toLocaleTimeString()}`,
      status: 'pending'
    };
    
    console.log(chalk.yellow('\n📝 Creating test task...'));
    await syncHandler.syncTodos([testTodo]);
    console.log(chalk.green('✅ Task created'));
    
    console.log(chalk.gray('\nCheck logs above for custom field detection'));
    
  } catch (error) {
    console.log(chalk.red('❌ Test failed:'));
    console.error(error);
  }
}

testSyncInit().catch(console.error);