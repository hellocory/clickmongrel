#!/usr/bin/env node
import { SyncHandler } from '../../dist/handlers/sync.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import configManager from '../../dist/config/index.js';
import chalk from 'chalk';

async function testCompleteTaskCreation() {
  console.log(chalk.cyan.bold('🧪 Testing Complete Task Creation with All Fields\n'));
  
  // Check API key
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  console.log(chalk.green('✅ API Key found'));
  
  // Ensure auto-assign is enabled
  const config = configManager.getConfig();
  config.clickup.auto_assign_user = true;
  configManager.saveConfig(config);
  console.log(chalk.green('✅ Auto-assign enabled'));
  
  // Create API and sync handler instances
  const api = new ClickUpAPI(apiKey);
  const syncHandler = new SyncHandler(apiKey);
  
  try {
    // Initialize sync handler
    console.log(chalk.yellow('\n📦 Initializing sync handler...'));
    await syncHandler.initialize();
    console.log(chalk.green('✅ Sync handler initialized'));
    
    // Create test todos with different priorities and fields
    const testTodos = [
      {
        id: `urgent-${Date.now()}`,
        content: `URGENT: Fix production bug - ${new Date().toLocaleTimeString()}`,
        status: 'pending',
        title: 'URGENT Production Bug Fix',
        category: 'bug-fix',
        priority: 'urgent',
        estimated_time: 7200000, // 2 hours
        tags: ['urgent', 'production', 'bug', 'critical'],
        created_at: new Date().toISOString()
      },
      {
        id: `high-${Date.now()}`,
        content: `HIGH: Implement new feature - ${new Date().toLocaleTimeString()}`,
        status: 'in_progress',
        title: 'Feature: User Dashboard',
        category: 'feature',
        priority: 'high',
        estimated_time: 14400000, // 4 hours
        tags: ['feature', 'dashboard', 'ui', 'priority'],
        created_at: new Date().toISOString()
      },
      {
        id: `normal-${Date.now()}`,
        content: `Update documentation - ${new Date().toLocaleTimeString()}`,
        status: 'pending',
        title: 'Documentation Update',
        category: 'documentation',
        priority: 'normal',
        estimated_time: 3600000, // 1 hour
        tags: ['docs', 'maintenance', 'readme'],
        created_at: new Date().toISOString()
      },
      {
        id: `low-${Date.now()}`,
        content: `Refactor utility functions - ${new Date().toLocaleTimeString()}`,
        status: 'pending',
        title: 'Code Refactoring',
        category: 'refactoring',
        priority: 'low',
        estimated_time: 5400000, // 1.5 hours
        tags: ['refactor', 'cleanup', 'technical-debt'],
        created_at: new Date().toISOString()
      }
    ];
    
    console.log(chalk.yellow('\n📝 Creating test tasks with different priorities:\n'));
    
    const createdTasks = [];
    
    for (const todo of testTodos) {
      console.log(chalk.cyan(`\nCreating ${todo.priority?.toUpperCase() || 'NORMAL'} priority task:`));
      console.log(`  Title: ${todo.title}`);
      console.log(`  Priority: ${todo.priority}`);
      console.log(`  Status: ${todo.status}`);
      console.log(`  Time: ${todo.estimated_time / 3600000} hours`);
      console.log(`  Tags: ${todo.tags.join(', ')}`);
      
      // Sync the todo
      await syncHandler.syncTodos([todo]);
      console.log(chalk.green(`  ✅ Created successfully`));
      
      // Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for tasks to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fetch and verify all created tasks
    console.log(chalk.yellow('\n🔍 Verifying created tasks in ClickUp...\n'));
    
    const listId = syncHandler.listId || config.clickup.default_list;
    const tasks = await api.getTasks(listId);
    
    for (const todo of testTodos) {
      const task = tasks.find(t => 
        t.name === todo.content || 
        t.name === todo.title
      );
      
      if (task) {
        createdTasks.push(task);
        console.log(chalk.green(`\n✅ Found: ${task.name}`));
        console.log(`   ID: ${task.id}`);
        console.log(`   Status: ${task.status?.status}`);
        console.log(`   Priority: ${task.priority?.priority} (level ${task.priority?.id})`);
        console.log(`   Time Est: ${task.time_estimate ? (task.time_estimate / 3600000) + ' hours' : 'Not set'}`);
        console.log(`   Tags: ${task.tags?.map(t => t.name).join(', ') || 'None'}`);
        console.log(`   Assignees: ${task.assignees?.map(a => a.username).join(', ') || 'None'}`);
        console.log(`   Due Date: ${task.due_date ? new Date(parseInt(task.due_date)).toLocaleString() : 'Not set'}`);
        
        // Check custom fields
        const todoIdField = task.custom_fields?.find(f => 
          f.name.toLowerCase().includes('todo') || 
          f.name.toLowerCase().includes('claude')
        );
        if (todoIdField) {
          console.log(`   Todo ID: ${todoIdField.value || 'Not set'}`);
        }
        
        console.log(`   URL: https://app.clickup.com/t/${task.id}`);
      } else {
        console.log(chalk.red(`❌ Not found: ${todo.title}`));
      }
    }
    
    // Summary
    console.log(chalk.cyan.bold('\n📊 Summary:\n'));
    console.log(`Tasks Created: ${createdTasks.length}/${testTodos.length}`);
    
    // Field verification
    console.log(chalk.cyan('\n🔍 Field Verification:'));
    let allFieldsCorrect = true;
    
    for (const task of createdTasks) {
      const todo = testTodos.find(t => 
        task.name === t.content || 
        task.name === t.title
      );
      
      if (!todo) continue;
      
      const issues = [];
      
      // Check priority mapping
      const expectedPriority = {
        urgent: 'urgent',
        high: 'high', 
        normal: 'normal',
        low: 'low'
      }[todo.priority];
      
      if (task.priority?.priority !== expectedPriority) {
        issues.push(`Priority: expected ${expectedPriority}, got ${task.priority?.priority}`);
      }
      
      // Check time estimate
      if (task.time_estimate !== todo.estimated_time) {
        issues.push(`Time: expected ${todo.estimated_time}ms, got ${task.time_estimate}ms`);
      }
      
      // Check assignee
      if (!task.assignees || task.assignees.length === 0) {
        issues.push('No assignee set');
      }
      
      // Check due date for urgent/high priority
      if ((todo.priority === 'urgent' || todo.priority === 'high') && !task.due_date) {
        issues.push('Due date not set for high priority task');
      }
      
      // Check tags
      const missingTags = todo.tags.filter(tag => 
        !task.tags?.find(t => t.name === tag)
      );
      if (missingTags.length > 0) {
        issues.push(`Missing tags: ${missingTags.join(', ')}`);
      }
      
      if (issues.length > 0) {
        console.log(chalk.yellow(`\n⚠️  ${task.name}:`));
        issues.forEach(issue => console.log(`   - ${issue}`));
        allFieldsCorrect = false;
      } else {
        console.log(chalk.green(`✅ ${task.name}: All fields correct`));
      }
    }
    
    if (allFieldsCorrect) {
      console.log(chalk.green.bold('\n🎉 All tasks created with correct field mappings!'));
    } else {
      console.log(chalk.yellow.bold('\n⚠️  Some field mappings need improvement'));
    }
    
    console.log(chalk.yellow.bold('\n📝 TASKS NOT DELETED - Review in ClickUp and delete manually'));
    console.log(chalk.gray('You can view all tasks at: https://app.clickup.com'));
    
  } catch (error) {
    console.log(chalk.red('\n❌ Test failed:'));
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testCompleteTaskCreation().catch(console.error);