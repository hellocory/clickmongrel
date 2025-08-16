#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);

// Check the last created task
const taskId = '86ab17zqp';

const task = await api.getTask(taskId);
console.log(chalk.cyan('Task name:'), task.name);
console.log(chalk.cyan('Custom fields:'));

const todoField = task.custom_fields?.find(f => f.id === 'd7541e2d-ae1e-480e-ba92-262c9735920a');
if (todoField) {
  if (todoField.value) {
    console.log(chalk.green(`✅ Todo ID field is set: ${todoField.value}`));
  } else {
    console.log(chalk.red('❌ Todo ID field exists but has no value'));
  }
} else {
  console.log(chalk.red('❌ Todo ID field not found on task'));
}

console.log('\nAll custom fields:', JSON.stringify(task.custom_fields, null, 2));