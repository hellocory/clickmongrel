#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';

async function checkGhostCodesWorkspace() {
  console.log('🔍 Checking GHOST CODES WORKSPACE ONLY\n');
  
  const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
  
  try {
    // Get teams and find Ghost Codes's Workspace
    const teams = await api.getTeams();
    const ghostCodesWorkspace = teams.find(t => t.name === "Ghost Codes's Workspace");
    
    if (!ghostCodesWorkspace) {
      console.error("❌ Ghost Codes's Workspace not found!");
      return;
    }
    
    console.log(`✅ Found Ghost Codes's Workspace (ID: ${ghostCodesWorkspace.id})\n`);
    
    // Get spaces in Ghost Codes's Workspace ONLY
    const spaces = await api.getSpaces(ghostCodesWorkspace.id);
    console.log(`📁 Spaces in Ghost Codes's Workspace (${spaces.length}):`);
    
    spaces.forEach(space => {
      console.log(`\n  📂 "${space.name}" (ID: ${space.id})`);
      
      // Get lists for each space
      api.getLists(space.id).then(lists => {
        console.log(`     📋 Lists in ${space.name}:`);
        lists.forEach(list => {
          console.log(`       - "${list.name}" (ID: ${list.id})`);
        });
      });
    });
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkGhostCodesWorkspace();