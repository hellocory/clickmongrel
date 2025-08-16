import ClickUpAPI from '../dist/utils/clickup-api.js';
import chalk from 'chalk';

const api = new ClickUpAPI('pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK');

async function checkAssignment() {
  try {
    // Get the Tasks list
    const listId = '901317943757';
    console.log(chalk.cyan('\n📋 Checking task assignments in Tasks list...\n'));
    
    // Get recent tasks
    const tasks = await api.getTasks(listId);
    console.log(`Found ${tasks.length} tasks\n`);
    
    // Check each task for assignees
    for (const task of tasks.slice(0, 10)) {
      console.log(chalk.yellow(`Task: ${task.name}`));
      console.log(`  Status: ${task.status.status}`);
      
      if (task.assignees && task.assignees.length > 0) {
        console.log(chalk.green(`  ✅ Assigned to:`));
        for (const assignee of task.assignees) {
          console.log(`     - ${assignee.username} (${assignee.email})`);
        }
      } else {
        console.log(chalk.red(`  ❌ No assignees`));
      }
      console.log('');
    }
    
    // Summary
    const assignedTasks = tasks.filter(t => t.assignees && t.assignees.length > 0);
    const unassignedTasks = tasks.filter(t => !t.assignees || t.assignees.length === 0);
    
    console.log(chalk.cyan('\n📊 Summary:'));
    console.log(`  Assigned tasks: ${chalk.green(assignedTasks.length)}`);
    console.log(`  Unassigned tasks: ${chalk.red(unassignedTasks.length)}`);
    
    if (unassignedTasks.length > 0) {
      console.log(chalk.yellow('\n⚠️  Some tasks are not assigned. Check auto-assignment configuration.'));
    } else {
      console.log(chalk.green('\n✅ All tasks are properly assigned!'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
}

checkAssignment();