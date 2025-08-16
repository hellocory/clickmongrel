#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

async function analyzeTaskFields() {
  console.log(chalk.cyan.bold('🔍 Analyzing Task Fields\n'));
  
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ CLICKUP_API_KEY not set'));
    process.exit(1);
  }
  
  const api = new ClickUpAPI(apiKey);
  const taskId = '86ab17z6j'; // The test task we just created
  
  try {
    // Get full task details
    const task = await api.getTask(taskId);
    
    console.log(chalk.yellow('📋 Field Analysis:\n'));
    
    // Check what was set vs what we sent
    const analysis = {
      '✅ Successfully Set': [],
      '⚠️ Partially Set': [],
      '❌ Not Set/Missing': [],
      '🔧 Needs Improvement': []
    };
    
    // Name/Title
    if (task.name) {
      analysis['✅ Successfully Set'].push(`Name: "${task.name}"`);
    }
    
    // Description
    if (task.description) {
      analysis['✅ Successfully Set'].push(`Description: ${task.description.length} chars`);
      console.log(chalk.gray('\nDescription Preview:'));
      console.log(task.description.substring(0, 300));
    }
    
    // Priority
    if (task.priority) {
      if (task.priority.priority === 'normal') {
        analysis['⚠️ Partially Set'].push(`Priority: Set as "normal" instead of "high"`);
        analysis['🔧 Needs Improvement'].push('Priority mapping from todo.priority to ClickUp priority');
      }
    }
    
    // Tags
    if (task.tags && task.tags.length > 0) {
      analysis['✅ Successfully Set'].push(`Tags: ${task.tags.map(t => t.name).join(', ')}`);
      if (!task.tags.find(t => t.name === 'automated' || t.name === 'mcp')) {
        analysis['🔧 Needs Improvement'].push('Not all tags were created (missing: automated, mcp)');
      }
    }
    
    // Time Estimate
    if (task.time_estimate) {
      analysis['✅ Successfully Set'].push(`Time Estimate: ${task.time_estimate}ms (${task.time_estimate / 60000} minutes)`);
      if (task.time_estimate !== 3600000) {
        analysis['⚠️ Partially Set'].push(`Time was ${task.time_estimate}ms instead of requested 3600000ms`);
      }
    }
    
    // Assignees
    if (!task.assignees || task.assignees.length === 0) {
      analysis['❌ Not Set/Missing'].push('Assignees: No one assigned');
      analysis['🔧 Needs Improvement'].push('Auto-assign to current user based on config');
    }
    
    // Custom Fields
    if (task.custom_fields) {
      task.custom_fields.forEach(field => {
        if (field.name === 'Todo ID' && !field.value) {
          analysis['❌ Not Set/Missing'].push(`Custom Field "${field.name}": No value set`);
          analysis['🔧 Needs Improvement'].push('Set Todo ID custom field value');
        }
      });
    }
    
    // Due Date
    if (!task.due_date) {
      analysis['❌ Not Set/Missing'].push('Due Date: Not set');
    }
    
    // Status
    if (task.status) {
      analysis['✅ Successfully Set'].push(`Status: "${task.status.status}"`);
    }
    
    // Display results
    for (const [category, items] of Object.entries(analysis)) {
      if (items.length > 0) {
        console.log(chalk.bold(`\n${category}:`));
        items.forEach(item => console.log(`  - ${item}`));
      }
    }
    
    // Check available custom fields for the list
    console.log(chalk.cyan('\n📊 Available Custom Fields in List:'));
    const listId = '901317936119';
    const listDetails = await api.getList(listId);
    
    if (listDetails.custom_fields) {
      listDetails.custom_fields.forEach(field => {
        console.log(`  - ${field.name} (${field.type}): ${field.id}`);
      });
    }
    
    console.log(chalk.yellow('\n🎯 Recommendations:'));
    console.log('1. Implement priority mapping (high -> urgent, normal -> normal, low -> low)');
    console.log('2. Set custom field values when creating tasks');
    console.log('3. Auto-assign tasks based on config settings');
    console.log('4. Create all tags from todo.tags array');
    console.log('5. Preserve exact time estimate from todo');
    
  } catch (error) {
    console.log(chalk.red('❌ Analysis failed:'));
    console.error(error);
  }
}

analyzeTaskFields().catch(console.error);