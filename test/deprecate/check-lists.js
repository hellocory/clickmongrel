#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const teams = await api.getTeams();
const ghost = teams.find(t => t.name.includes('Ghost Codes'));

console.log(`\nWorkspace: ${ghost.name} (${ghost.id})\n`);

const spaces = await api.getSpaces(ghost.id);
for (const space of spaces) {
  console.log(`📁 Space: ${space.name}`);
  const lists = await api.getLists(space.id);
  if (lists.length === 0) {
    console.log('   (no lists)');
  } else {
    lists.forEach(l => console.log(`   📋 ${l.name} (${l.id})`));
  }
  console.log();
}