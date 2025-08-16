#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';

async function checkSpaces() {
  console.log('🔍 Checking ClickUp Spaces and Lists\n');
  
  const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
  
  try {
    // Get teams
    const teams = await api.getTeams();
    console.log('📂 Teams/Workspaces:');
    teams.forEach(team => {
      console.log(`  - ${team.name} (ID: ${team.id})`);
    });
    
    // For each team, get spaces
    for (const team of teams) {
      console.log(`\n📁 Spaces in ${team.name}:`);
      const spaces = await api.getSpaces(team.id);
      
      for (const space of spaces) {
        console.log(`  - ${space.name} (ID: ${space.id})`);
        
        // Get lists in each space
        const lists = await api.getLists(space.id);
        console.log(`    📋 Lists:`);
        lists.forEach(list => {
          console.log(`      - ${list.name} (ID: ${list.id})`);
          
          // Show statuses for each list
          if (list.statuses && list.statuses.length > 0) {
            console.log(`        Statuses: ${list.statuses.map(s => s.status).join(', ')}`);
          }
        });
      }
    }
    
    console.log('\n⚠️  IMPORTANT: Update your config with the correct space and list names!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSpaces();