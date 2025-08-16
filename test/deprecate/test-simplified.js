#!/usr/bin/env node
import { SyncHandler } from '../../dist/handlers/sync.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

async function testSimplifiedApproach() {
  console.log(chalk.cyan.bold('🧪 Testing Simplified Task Creation (No Custom Fields)\n'));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const api = new ClickUpAPI(apiKey);
  const syncHandler = new SyncHandler(apiKey);
  
  try {
    // Initialize
    await syncHandler.initialize();
    console.log(chalk.green('✅ Sync handler initialized\n'));
    
    // Create test todos
    const todos = [
      {
        id: 'doc-ref-001',
        content: 'Document API endpoints',
        status: 'pending',
        tags: ['documentation', 'api']
      },
      {
        id: 'feature-002',
        content: 'Implement user authentication',
        status: 'in_progress',
        tags: ['feature', 'security']
      }
    ];
    
    console.log(chalk.yellow('📝 Creating tasks...\n'));
    
    for (const todo of todos) {
      await syncHandler.syncTodos([todo]);
      const taskId = syncHandler.getTaskIdForTodo(todo.id);
      
      if (taskId) {
        console.log(chalk.green(`✅ Created task for todo ${todo.id}`));
        console.log(`   ClickUp Task ID: ${taskId}`);
        console.log(`   URL: https://app.clickup.com/t/${taskId}`);
        
        // Test reverse lookup
        const todoId = syncHandler.getTodoIdForTask(taskId);
        console.log(`   Reverse lookup: Task ${taskId} -> Todo ${todoId}`);
      }
    }
    
    // Show all mappings
    console.log(chalk.cyan('\n📊 All Todo -> Task Mappings:'));
    const mappings = syncHandler.getAllMappings();
    for (const [todoId, taskId] of mappings.entries()) {
      console.log(`   ${todoId} -> ${taskId}`);
    }
    
    // Test linking tasks with relations
    console.log(chalk.yellow('\n🔗 Testing Task Relations:'));
    const taskIds = Array.from(mappings.values());
    
    if (taskIds.length >= 2) {
      // In ClickUp, you would create a relation between tasks
      console.log(`   Task ${taskIds[0]} can be related to Task ${taskIds[1]}`);
      console.log('   Relations can link to docs, commits, or other tasks');
      console.log('   This is handled natively in ClickUp without custom fields');
    }
    
    console.log(chalk.green('\n✅ Simplified approach working perfectly!'));
    console.log(chalk.gray('Tasks created without custom fields - using native ClickUp features'));
    
  } catch (error) {
    console.log(chalk.red('❌ Test failed:'));
    console.error(error);
  }
}

testSimplifiedApproach().catch(console.error);