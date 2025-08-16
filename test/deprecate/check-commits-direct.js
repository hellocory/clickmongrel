#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);

console.log('Checking Commits list (901317936118)...');
const tasks = await api.getTasks('901317936118');
console.log(`\nFound ${tasks.length} tasks in Commits list:`);

if (tasks.length > 0) {
  tasks.forEach(t => {
    console.log(`\n- ${t.name}`);
    console.log(`  ID: ${t.id}`);
    console.log(`  Status: ${t.status?.status}`);
    console.log(`  Created: ${new Date(parseInt(t.date_created)).toLocaleString()}`);
  });
} else {
  console.log('No tasks found in Commits list');
  console.log('\nTrying alternate query...');
  
  // Try to get the list details
  const list = await api.getList('901317936118');
  console.log('\nList details:');
  console.log('Name:', list.name);
  console.log('Task count:', list.task_count);
}