#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';

async function checkAgenticDev() {
  console.log('🔍 Checking Agentic Development Space\n');
  
  const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
  
  try {
    const spaceId = '90139254308'; // Agentic Development
    
    // Get lists in this space
    const lists = await api.getLists(spaceId);
    console.log(`📋 Lists in Agentic Development (${lists.length}):`);
    
    lists.forEach(list => {
      console.log(`\n  📁 "${list.name}" (ID: ${list.id})`);
      
      // Check statuses
      if (list.statuses && list.statuses.length > 0) {
        console.log(`     Statuses available (${list.statuses.length}):`);
        list.statuses.forEach((s, i) => {
          console.log(`       ${i+1}. "${s.status}" (color: ${s.color}, type: ${s.type})`);
        });
      } else {
        console.log(`     ⚠️ No statuses found`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAgenticDev();