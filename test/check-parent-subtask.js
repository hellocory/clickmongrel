#!/usr/bin/env node

import ClickUpAPI from '../dist/utils/clickup-api.js';
import chalk from 'chalk';

const API_KEY = 'pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK';

async function checkParentSubtask() {
  const api = new ClickUpAPI(API_KEY);
  
  // Get tasks list
  const listId = '901317943757';
  const tasks = await api.getTasks(listId);
  
  console.log(chalk.cyan('Checking parent-subtask relationships:\n'));
  
  // Find parent task
  const parentTask = tasks.find(t => t.name.includes('authentication system'));
  if (parentTask) {
    console.log(chalk.yellow(`Parent: ${parentTask.name} (${parentTask.id})`));
    console.log(`  Status: ${parentTask.status.status}`);
    console.log(`  Has parent field: ${parentTask.parent || 'none'}`);
    
    // Find subtasks
    const subtasks = tasks.filter(t => t.parent === parentTask.id);
    console.log(`\n  Subtasks with parent=${parentTask.id}:`);
    
    if (subtasks.length > 0) {
      subtasks.forEach(st => {
        console.log(chalk.gray(`    - ${st.name} (${st.status.status})`));
      });
    } else {
      console.log(chalk.red('    No subtasks found with this parent ID'));
      
      // Check if tasks exist but without parent
      const possibleSubtasks = tasks.filter(t => 
        t.name.includes('login form') || 
        t.name.includes('password validation') || 
        t.name.includes('JWT token')
      );
      
      if (possibleSubtasks.length > 0) {
        console.log(chalk.yellow('\n  Tasks that should be subtasks:'));
        possibleSubtasks.forEach(t => {
          console.log(`    - ${t.name} (parent: ${t.parent || 'NONE'})`);
        });
      }
    }
  } else {
    console.log(chalk.red('Parent task not found'));
  }
  
  // Show all tasks with parent field
  console.log(chalk.cyan('\n\nAll tasks with parent field:'));
  tasks.filter(t => t.parent).forEach(t => {
    console.log(`  ${t.name} -> parent: ${t.parent}`);
  });
}

checkParentSubtask().catch(console.error);