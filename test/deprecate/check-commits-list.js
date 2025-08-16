#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);

// Get workspace from config
import configManager from '../../dist/config/index.js';
const config = configManager.getConfig();
const workspaceId = config.clickup.workspace_id || '90131285250';

// Get spaces
const spaces = await api.getSpaces(workspaceId);
const space = spaces.find(s => s.name === 'Agentic Development') || spaces[0];

// Get lists
const lists = await api.getLists(space.id);

console.log(chalk.cyan('Lists in space:', space.name));
lists.forEach(list => {
  console.log(`  - ${list.name} (${list.id})`);
});

// Check for Commits list
const commitsList = lists.find(l => 
  l.name.toLowerCase().includes('commit') || 
  l.name.toLowerCase() === 'commits'
);

if (commitsList) {
  console.log(chalk.green(`\n✅ Found Commits list: ${commitsList.name} (${commitsList.id})`));
} else {
  console.log(chalk.yellow('\n⚠️ No Commits list found'));
  console.log('Creating Commits list...');
  
  // Create the Commits list
  const newList = await api.createList(space.id, {
    name: 'Commits',
    content: 'Git commits tracking',
    status: {
      statuses: [
        { status: 'COMMITTED', color: '#87909e', orderindex: 0 },
        { status: 'DEVELOPING', color: '#5e9fde', orderindex: 1 },
        { status: 'PRODUCTION/TESTING', color: '#ff9800', orderindex: 2 },
        { status: 'PRODUCTION/FINAL', color: '#4caf50', orderindex: 3 },
        { status: 'REJECTED', color: '#f44336', orderindex: 4 }
      ]
    }
  });
  
  console.log(chalk.green(`✅ Created Commits list: ${newList.id}`));
}