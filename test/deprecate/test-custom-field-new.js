#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

async function testCustomField() {
  console.log(chalk.cyan.bold('🔍 Testing Custom Field Setup\n'));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const api = new ClickUpAPI(apiKey);
  const listId = '901317936119';
  
  try {
    // Get list details with custom fields
    console.log(chalk.yellow('📋 Getting list details...'));
    const list = await api.getList(listId);
    
    console.log(chalk.cyan('\nCustom Fields in List:'));
    if (list.custom_fields && list.custom_fields.length > 0) {
      list.custom_fields.forEach(field => {
        console.log(`\n  Field: ${field.name}`);
        console.log(`    ID: ${field.id}`);
        console.log(`    Type: ${field.type}`);
        console.log(`    Required: ${field.required}`);
      });
      
      // Find the Todo ID field
      const todoField = list.custom_fields.find(f => 
        f.name.toLowerCase().includes('todo') || 
        f.name.toLowerCase().includes('claude')
      );
      
      if (todoField) {
        console.log(chalk.green(`\n✅ Found Todo ID field: ${todoField.name} (${todoField.id})`));
        
        // Test creating a task with this custom field
        console.log(chalk.yellow('\n🧪 Testing task creation with custom field...'));
        
        const testTask = {
          name: `Custom Field Test - ${Date.now()}`,
          description: 'Testing custom field population',
          status: 'to do',
          priority: 3,
          assignees: [138190514],
          custom_fields: [
            {
              id: todoField.id,
              value: `test-todo-${Date.now()}`
            }
          ]
        };
        
        console.log('\nCreating task with custom field:');
        console.log(JSON.stringify(testTask.custom_fields, null, 2));
        
        const createdTask = await api.createTask(listId, testTask);
        
        console.log(chalk.green('\n✅ Task created successfully!'));
        console.log(`Task ID: ${createdTask.id}`);
        
        // Check if custom field was set
        const taskWithDetails = await api.getTask(createdTask.id);
        const customFieldValue = taskWithDetails.custom_fields?.find(f => f.id === todoField.id);
        
        if (customFieldValue && customFieldValue.value) {
          console.log(chalk.green(`✅ Custom field value set: ${customFieldValue.value}`));
        } else {
          console.log(chalk.red('❌ Custom field value NOT set'));
          console.log('Custom fields on task:', JSON.stringify(taskWithDetails.custom_fields, null, 2));
        }
        
        // Clean up - delete test task
        console.log(chalk.yellow('\n🗑️ Cleaning up test task...'));
        await api.deleteTask(createdTask.id);
        console.log(chalk.green('✅ Test task deleted'));
        
      } else {
        console.log(chalk.red('\n❌ No Todo ID field found in list'));
      }
      
    } else {
      console.log(chalk.yellow('No custom fields found in list'));
    }
    
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed:'));
    console.error(error);
  }
}

testCustomField().catch(console.error);