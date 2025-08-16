#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

const API_KEY = 'pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK';

async function debugSubtasks() {
  const api = new ClickUpAPI(API_KEY);
  const listId = '901317943757';
  
  console.log(chalk.cyan('Fetching all tasks...\n'));
  
  const tasks = await api.getTasks(listId);
  
  // Group tasks
  const parents = tasks.filter(t => !t.parent && t.name.includes('authentication'));
  const withParent = tasks.filter(t => t.parent);
  const orphans = tasks.filter(t => !t.parent && !t.name.includes('authentication'));
  
  console.log(chalk.yellow('Parent Tasks:'));
  parents.forEach(p => {
    console.log(`  ${p.name} (${p.id})`);
    // Check raw API response
    console.log(`    Raw parent field: ${JSON.stringify(p.parent)}`);
  });
  
  console.log(chalk.yellow('\nTasks with parent field:'));
  withParent.forEach(t => {
    console.log(`  ${t.name}`);
    console.log(`    parent: ${t.parent}`);
  });
  
  console.log(chalk.yellow('\nOrphan tasks (no parent):'));
  orphans.forEach(t => {
    console.log(`  ${t.name} (${t.id})`);
  });
  
  // Try to get subtasks directly from API
  console.log(chalk.cyan('\nTrying direct API call for parent task...'));
  const parent = parents[0];
  if (parent) {
    const response = await api.makeRequest(`/task/${parent.id}`, 'GET');
    console.log('Parent task details:');
    console.log('  Subtasks field:', response.data.subtasks);
    console.log('  Children field:', response.data.children);
  }
}

debugSubtasks().catch(console.error);