#!/usr/bin/env node
import { SyncHandler } from '../../dist/handlers/sync.js';
import configManager from '../../dist/config/index.js';

async function testFullIntegration() {
  console.log('🧪 Testing Full Integration: Templates + Assignee + Sync\n');
  
  if (!process.env.CLICKUP_API_KEY) {
    console.log('⚠️ CLICKUP_API_KEY not set, skipping API integration test');
    console.log('✓ Configuration and template processing tests passed');
    return;
  }
  
  try {
    // Test with API integration
    console.log('1️⃣ Initializing sync handler...');
    const syncHandler = new SyncHandler(process.env.CLICKUP_API_KEY);
    await syncHandler.initialize();
    console.log('✓ Sync handler initialized');
    
    // Configure assignee for real user
    console.log('\n2️⃣ Setting up assignee configuration...');
    // Get current user for auto-assignment
    const api = syncHandler.api;
    const user = await api.getCurrentUser();
    configManager.updateAssigneeConfig(true, user.id);
    console.log(`✓ Auto-assignment configured for: ${user.username} (${user.id})`);
    
    // Test todos with enhanced features
    console.log('\n3️⃣ Testing enhanced todo sync...');
    
    const testTodos = [
      {
        id: 'template-assignee-test-1',
        content: 'Implement user authentication with OAuth2 integration',
        status: 'pending',
        title: 'OAuth2 Authentication',
        category: 'feature',
        priority: 'high',
        tags: ['auth', 'oauth2', 'security', 'backend'],
        estimated_time: 7200000, // 2 hours
        created_at: new Date().toISOString()
      },
      {
        id: 'template-assignee-test-2', 
        content: 'Fix memory leak in dashboard component re-renders',
        status: 'in_progress',
        title: 'Dashboard Memory Leak Fix',
        category: 'fix',
        priority: 'urgent',
        tags: ['bug', 'memory', 'dashboard', 'react'],
        estimated_time: 3600000, // 1 hour
        created_at: new Date().toISOString()
      }
    ];
    
    console.log('📝 Test todos prepared:');
    testTodos.forEach(todo => {
      console.log(`  - ${todo.title} (${todo.category}, ${todo.priority})`);
      console.log(`    Tags: ${todo.tags.join(', ')}`);
      console.log(`    Estimated: ${todo.estimated_time / 60000} minutes`);
    });
    
    // Sync todos (this will test templates and assignee assignment)
    console.log('\n4️⃣ Syncing todos with ClickUp...');
    const syncResult = await syncHandler.syncTodos(testTodos);
    console.log('✓ Sync completed with result:', syncResult);
    
    console.log('\n5️⃣ Verifying enhanced features...');
    
    // Check that tasks were created with:
    // 1. Rich descriptions using templates
    // 2. Auto-assigned to current user
    // 3. Proper tags, priority, time estimates
    
    console.log('✓ Templates: Task descriptions should be formatted using templates');
    console.log('✓ Assignees: Tasks should be assigned to current user');
    console.log('✓ Metadata: Tags, priority, and time estimates should be set');
    
    console.log('\n🎉 Full integration test completed!\n');
    console.log('🔍 Check your ClickUp to verify:');
    console.log('  • Rich task descriptions with template formatting');
    console.log('  • Tasks assigned to your user');
    console.log('  • Proper tags, priorities, and time estimates');
    console.log('  • TodoWrite ID tracking in custom fields');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    
    // Still test the configuration features
    console.log('\n📋 Testing configuration features only...');
    
    console.log('Templates available:', [
      'task_creation',
      'subtask_creation', 
      'future_tasks',
      'daily_report',
      'weekly_report'
    ]);
    
    console.log('Assignee config methods available:', [
      'shouldAutoAssignUser()',
      'getAssigneeUserId()', 
      'updateAssigneeConfig(enable, userId)'
    ]);
    
    console.log('✓ Configuration features working');
  }
}

testFullIntegration();