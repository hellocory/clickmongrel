#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';

async function verifyWorkspace() {
  console.log('🔍 Verifying Ghost Codes Workspace\n');
  
  const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
  
  try {
    // Get the specific workspace
    const workspaceId = '90131285250'; // Ghost Codes's Workspace
    
    console.log(`📂 Checking workspace ID: ${workspaceId}`);
    const spaces = await api.getSpaces(workspaceId);
    
    console.log(`\n📁 Spaces found (${spaces.length}):`);
    spaces.forEach(space => {
      console.log(`  - "${space.name}" (ID: ${space.id})`);
    });
    
    // Look for Agentic System space
    const agenticSpace = spaces.find(s => s.name === 'Agentic System');
    
    if (agenticSpace) {
      console.log(`\n✅ Found "Agentic System" space: ${agenticSpace.id}`);
      
      // Get lists in this space
      const lists = await api.getLists(agenticSpace.id);
      console.log(`\n📋 Lists in Agentic System:`);
      lists.forEach(list => {
        console.log(`  - "${list.name}" (ID: ${list.id})`);
        
        // Check statuses
        if (list.statuses && list.statuses.length > 0) {
          console.log(`    Statuses: ${list.statuses.map(s => s.status).join(', ')}`);
        }
      });
      
      const devTasksList = lists.find(l => l.name === 'Development Tasks');
      if (devTasksList) {
        console.log(`\n✅ Found "Development Tasks" list: ${devTasksList.id}`);
      } else {
        console.log(`\n❌ "Development Tasks" list not found`);
      }
      
    } else {
      console.log(`\n❌ "Agentic System" space not found`);
      console.log(`Available spaces: ${spaces.map(s => s.name).join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyWorkspace();