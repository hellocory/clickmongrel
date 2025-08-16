#!/usr/bin/env node
import { SyncHandler } from '../../dist/handlers/sync.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

async function testTodoFieldCreation() {
  console.log(chalk.cyan.bold('🧪 Testing Todo ID Field Population\n'));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const api = new ClickUpAPI(apiKey);
  const syncHandler = new SyncHandler(apiKey);
  
  try {
    // Initialize sync handler (should detect the custom field)
    console.log(chalk.yellow('📦 Initializing sync handler...'));
    await syncHandler.initialize();
    console.log(chalk.green('✅ Sync handler initialized'));
    
    // Create a test todo
    const testTodo = {
      id: `field-test-${Date.now()}`,
      content: `Todo Field Test - ${new Date().toLocaleTimeString()}`,
      status: 'pending',
      title: 'Testing Todo ID Field',
      priority: 'normal',
      tags: ['test', 'todo-id'],
      created_at: new Date().toISOString()
    };
    
    console.log(chalk.yellow('\n📝 Creating task with Todo ID:'));
    console.log(`  Todo ID: ${testTodo.id}`);
    console.log(`  Title: ${testTodo.title}`);
    
    // Sync the todo
    await syncHandler.syncTodos([testTodo]);
    console.log(chalk.green('✅ Task created'));
    
    // Wait a moment for ClickUp to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find and verify the task
    const listId = '901317936119';
    const tasks = await api.getTasks(listId);
    const createdTask = tasks.find(t => 
      t.name === testTodo.content || 
      t.name === testTodo.title
    );
    
    if (createdTask) {
      console.log(chalk.green(`\n✅ Task found: ${createdTask.name}`));
      console.log(`  Task ID: ${createdTask.id}`);
      
      // Get full task details
      const fullTask = await api.getTask(createdTask.id);
      
      // Check custom fields
      console.log(chalk.cyan('\n📊 Custom Fields:'));
      if (fullTask.custom_fields && fullTask.custom_fields.length > 0) {
        fullTask.custom_fields.forEach(field => {
          if (field.name === 'Todo ID') {
            if (field.value) {
              console.log(chalk.green(`  ✅ ${field.name}: ${field.value}`));
            } else {
              console.log(chalk.red(`  ❌ ${field.name}: No value set`));
            }
          }
        });
      }
      
      console.log(chalk.yellow(`\n🔗 Task URL: https://app.clickup.com/t/${createdTask.id}`));
      console.log(chalk.yellow('⚠️  Task NOT deleted - verify Todo ID field and delete manually'));
      
    } else {
      console.log(chalk.red('❌ Task not found'));
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Test failed:'));
    console.error(error);
  }
}

testTodoFieldCreation().catch(console.error);