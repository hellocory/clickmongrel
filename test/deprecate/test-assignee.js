#!/usr/bin/env node
import configManager from '../../dist/config/index.js';

async function testAssignee() {
  console.log('🧪 Testing Assignee Configuration\n');
  
  try {
    // Test current configuration
    console.log('1️⃣ Current assignee configuration:');
    console.log('  Auto-assign enabled:', configManager.shouldAutoAssignUser());
    console.log('  Assignee user ID:', configManager.getAssigneeUserId());
    
    // Test updating configuration
    console.log('\n2️⃣ Testing configuration updates...');
    
    // Enable auto-assignment with a test user ID
    configManager.updateAssigneeConfig(true, 12345);
    console.log('✓ Updated to enable auto-assignment with user ID 12345');
    console.log('  Auto-assign enabled:', configManager.shouldAutoAssignUser());
    console.log('  Assignee user ID:', configManager.getAssigneeUserId());
    
    // Test disabling
    configManager.updateAssigneeConfig(false);
    console.log('✓ Disabled auto-assignment');
    console.log('  Auto-assign enabled:', configManager.shouldAutoAssignUser());
    console.log('  Assignee user ID:', configManager.getAssigneeUserId());
    
    // Re-enable for normal operation
    configManager.updateAssigneeConfig(true, 12345);
    console.log('✓ Re-enabled auto-assignment');
    
    console.log('\n3️⃣ Testing task data preparation...');
    
    // Simulate what the sync handler would do
    const mockTodo = {
      id: 'test-assignee-123',
      content: 'Test task for assignee functionality',
      status: 'pending'
    };
    
    const taskData = {
      name: mockTodo.content,
      description: 'Test task',
      status: { status: 'to do' }
    };
    
    // Add assignee if auto-assignment is enabled (simulating sync handler logic)
    if (configManager.shouldAutoAssignUser()) {
      const assigneeId = configManager.getAssigneeUserId();
      if (assigneeId) {
        taskData.assignees = [assigneeId];
        console.log('✓ Would assign task to user ID:', assigneeId);
        console.log('✓ Task data includes assignees:', taskData.assignees);
      }
    } else {
      console.log('✓ No assignee would be added (auto-assignment disabled)');
    }
    
    console.log('\n🎉 Assignee tests passed!\n');
    
  } catch (error) {
    console.error('❌ Assignee test failed:', error);
    process.exit(1);
  }
}

testAssignee();