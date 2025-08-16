#!/usr/bin/env node
import { SyncHandler } from '../../dist/handlers/sync.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import configManager from '../../dist/config/index.js';
import chalk from 'chalk';

async function testTaskCreation() {
  console.log(chalk.cyan.bold('🧪 Testing Task Creation System\n'));
  
  // Check API key
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  console.log(chalk.green('✅ API Key found'));
  
  // Create API and sync handler instances
  const api = new ClickUpAPI(apiKey);
  const syncHandler = new SyncHandler(apiKey);
  
  try {
    // Initialize sync handler
    console.log(chalk.yellow('\n📦 Initializing sync handler...'));
    await syncHandler.initialize();
    console.log(chalk.green('✅ Sync handler initialized'));
    
    // Create a comprehensive test todo
    const testTodo = {
      id: `test-${Date.now()}`,
      content: `Test Task Creation - ${new Date().toLocaleString()}`,
      status: 'pending',
      // Additional fields to test
      title: 'Test Task with All Fields',
      category: 'testing',
      priority: 'high',
      estimated_time: 3600000, // 1 hour in milliseconds
      tags: ['test', 'automated', 'mcp'],
      created_at: new Date().toISOString(),
      metadata: {
        source: 'test-script',
        version: '1.0.0'
      }
    };
    
    console.log(chalk.yellow('\n📝 Creating test task with:'));
    console.log(JSON.stringify(testTodo, null, 2));
    
    // Sync the todo
    console.log(chalk.yellow('\n🔄 Syncing todo to ClickUp...'));
    const results = await syncHandler.syncTodos([testTodo]);
    console.log(chalk.green('✅ Sync completed'));
    console.log('Results:', JSON.stringify(results, null, 2));
    
    // Fetch the created task to verify all fields
    console.log(chalk.yellow('\n🔍 Fetching created task from ClickUp...'));
    
    // Get the list ID from config
    const config = configManager.getConfig();
    const listId = syncHandler.listId || config.clickup.default_list;
    
    if (!listId) {
      throw new Error('No list ID available');
    }
    
    // Search for the task
    const tasks = await api.getTasks(listId);
    const createdTask = tasks.find(t => 
      t.name === testTodo.content || 
      t.name === testTodo.title
    );
    
    if (!createdTask) {
      console.log(chalk.red('❌ Task not found in ClickUp'));
      console.log('Available tasks:', tasks.map(t => t.name));
      return;
    }
    
    console.log(chalk.green('✅ Task found in ClickUp!'));
    console.log(chalk.cyan('\n📋 Task Details:'));
    console.log(`  ID: ${createdTask.id}`);
    console.log(`  Name: ${createdTask.name}`);
    console.log(`  Status: ${createdTask.status?.status || 'N/A'}`);
    console.log(`  Priority: ${createdTask.priority?.priority || 'N/A'}`);
    console.log(`  Description: ${createdTask.description?.substring(0, 100)}...`);
    console.log(`  Tags: ${createdTask.tags?.map(t => t.name).join(', ') || 'None'}`);
    console.log(`  Assignees: ${createdTask.assignees?.map(a => a.username).join(', ') || 'None'}`);
    console.log(`  Time Estimate: ${createdTask.time_estimate || 'Not set'}`);
    console.log(`  Custom Fields: ${createdTask.custom_fields?.length || 0} fields`);
    
    if (createdTask.custom_fields && createdTask.custom_fields.length > 0) {
      console.log(chalk.cyan('\n📊 Custom Fields:'));
      createdTask.custom_fields.forEach(field => {
        console.log(`  ${field.name}: ${field.value || 'N/A'}`);
      });
    }
    
    // Full task JSON for inspection
    console.log(chalk.cyan('\n📄 Full Task JSON:'));
    console.log(JSON.stringify(createdTask, null, 2));
    
    console.log(chalk.yellow('\n⚠️  TASK NOT DELETED - Please verify in ClickUp and delete manually when done'));
    console.log(chalk.gray(`Task URL: https://app.clickup.com/t/${createdTask.id}`));
    
    // Test status update
    console.log(chalk.yellow('\n🔄 Testing status update...'));
    const updateTodo = {
      ...testTodo,
      status: 'in_progress'
    };
    
    await syncHandler.syncTodos([updateTodo]);
    console.log(chalk.green('✅ Status update synced'));
    
    // Fetch again to verify update
    const updatedTask = await api.getTask(createdTask.id);
    console.log(`Updated Status: ${updatedTask.status?.status}`);
    
    console.log(chalk.green.bold('\n✅ Task creation test completed successfully!'));
    console.log(chalk.yellow('📝 Remember to check ClickUp and delete the test task when done.'));
    
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed:'));
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testTaskCreation().catch(console.error);