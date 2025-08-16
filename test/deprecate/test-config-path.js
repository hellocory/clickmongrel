#!/usr/bin/env node
import configManager from '../../dist/config/index.js';
import { SyncHandler } from '../../dist/handlers/sync.js';

async function testConfig() {
  console.log('🧪 Testing .claude/clickup Configuration\n');
  
  try {
    // Test config loading
    const config = configManager.getConfig();
    console.log('1️⃣ Configuration loaded from .claude/clickup:');
    console.log('  Workspace ID:', config.clickup.workspace_id);
    console.log('  Default Space:', config.clickup.default_space);
    console.log('  Default List:', config.clickup.default_list);
    console.log('  Auto-assign:', config.clickup.auto_assign_user);
    console.log('  Assignee ID:', config.clickup.assignee_user_id);
    
    // Test template loading
    console.log('\n2️⃣ Template loading test:');
    const taskTemplate = configManager.loadTemplate('task_creation');
    console.log('  Task template loaded:', taskTemplate ? '✓' : '✗');
    
    if (process.env.CLICKUP_API_KEY) {
      console.log('\n3️⃣ Testing sync handler initialization...');
      const syncHandler = new SyncHandler(process.env.CLICKUP_API_KEY);
      await syncHandler.initialize();
      console.log('  ✓ Sync handler initialized successfully');
      
      // Get the actual list being used
      console.log('\n4️⃣ Verifying list configuration:');
      console.log('  List ID:', syncHandler.listId || 'Not set');
    } else {
      console.log('\n⚠️ Set CLICKUP_API_KEY to test full initialization');
    }
    
    console.log('\n✅ Configuration test passed!');
    console.log('📁 Config location: .claude/clickup/config.json');
    console.log('📁 Templates location: .claude/clickup/templates/');
    
  } catch (error) {
    console.error('❌ Configuration test failed:', error);
    process.exit(1);
  }
}

testConfig();