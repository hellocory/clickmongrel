#!/usr/bin/env node
import inquirer from 'inquirer';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ClickUpAPI from './utils/clickup-api.js';
import configManager from './config/index.js';
import { SpaceStatusConfig, ClickUpSpace, ClickUpList, ClickUpStatus } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.cyan.bold('\n🚀 ClickMongrel MCP Server - Initialization\n'));

async function init() {
  try {
    // Step 1: Check for API key
    let apiKey = process.env.CLICKUP_API_KEY;
    
    if (!apiKey) {
      const { inputApiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'inputApiKey',
          message: 'Enter your ClickUp API key:',
          validate: (input) => input.length > 0 || 'API key is required'
        }
      ]);
      apiKey = inputApiKey;
    }

    console.log(chalk.green('✓ API key configured'));

    // Step 2: Initialize API and test connection
    const api = new ClickUpAPI(apiKey!);
    console.log(chalk.yellow('Testing ClickUp connection...'));
    
    const user = await api.getCurrentUser();
    console.log(chalk.green(`✓ Connected as: ${user.username} (${user.email})`));

    // Step 3: Get teams/workspaces
    console.log(chalk.yellow('Fetching workspaces...'));
    const teams = await api.getTeams();
    
    if (teams.length === 0) {
      console.log(chalk.red('No workspaces found. Please check your API key.'));
      process.exit(1);
    }

    // Step 4: Select workspace
    const { selectedTeam } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTeam',
        message: 'Select your workspace:',
        choices: teams.map((t) => ({ name: t.name, value: t }))
      }
    ]);

    console.log(chalk.green(`✓ Selected workspace: ${selectedTeam.name}`));

    // Step 5: Get spaces
    console.log(chalk.yellow('Fetching spaces...'));
    const spaces = await api.getSpaces(selectedTeam.id);
    
    if (spaces.length === 0) {
      console.log(chalk.red('No spaces found in workspace.'));
      process.exit(1);
    }

    // Step 6: Select space
    const { selectedSpace } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedSpace',
        message: 'Select your default space:',
        choices: spaces.map((s: ClickUpSpace) => ({ name: s.name, value: s }))
      }
    ]);

    console.log(chalk.green(`✓ Selected space: ${selectedSpace.name}`));

    // Step 7: Get lists
    console.log(chalk.yellow('Fetching lists...'));
    const lists = await api.getLists(selectedSpace.id);
    
    if (lists.length === 0) {
      console.log(chalk.red('No lists found in space.'));
      process.exit(1);
    }

    // Step 8: Select list
    const { selectedList } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedList',
        message: 'Select your default list for tasks:',
        choices: lists.map((l: ClickUpList) => ({ name: `${l.name} (${l.task_count || 0} tasks)`, value: l }))
      }
    ]);

    console.log(chalk.green(`✓ Selected list: ${selectedList.name}`));

    // Step 9: Get and cache statuses
    console.log(chalk.yellow('Configuring status mappings...'));
    const statuses = selectedList.statuses;
    
    // Find best matches for todo statuses
    const todoStatus = statuses.find((s: ClickUpStatus) => 
      s.status.toLowerCase().includes('to do') || 
      s.status.toLowerCase().includes('todo')
    ) || statuses[0];
    
    const progressStatus = statuses.find((s: ClickUpStatus) => 
      s.status.toLowerCase().includes('progress') || 
      s.status.toLowerCase().includes('doing')
    ) || statuses[1];
    
    const doneStatus = statuses.find((s: ClickUpStatus) => 
      s.status.toLowerCase().includes('done') || 
      s.status.toLowerCase().includes('complete')
    ) || statuses[statuses.length - 1];

    console.log(chalk.cyan('\nStatus mappings:'));
    console.log(`  pending → ${todoStatus.status}`);
    console.log(`  in_progress → ${progressStatus.status}`);
    console.log(`  completed → ${doneStatus.status}`);

    const { confirmMappings } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmMappings',
        message: 'Are these status mappings correct?',
        default: true
      }
    ]);

    let statusMappings = {
      pending: todoStatus.status,
      in_progress: progressStatus.status,
      completed: doneStatus.status
    };

    if (!confirmMappings) {
      // Allow custom mapping
      const customMappings = await inquirer.prompt([
        {
          type: 'list',
          name: 'pending',
          message: 'Select status for "pending" todos:',
          choices: statuses.map((s: ClickUpStatus) => s.status)
        },
        {
          type: 'list',
          name: 'in_progress',
          message: 'Select status for "in_progress" todos:',
          choices: statuses.map((s: ClickUpStatus) => s.status)
        },
        {
          type: 'list',
          name: 'completed',
          message: 'Select status for "completed" todos:',
          choices: statuses.map((s: ClickUpStatus) => s.status)
        }
      ]);
      statusMappings = customMappings;
    }

    // Step 10: Save configuration
    console.log(chalk.yellow('\nSaving configuration...'));

    // Save main config
    const config = {
      clickup: {
        api_key: apiKey!,
        workspace_id: selectedTeam.id,
        default_space: selectedSpace.name,
        default_list: selectedList.name
      },
      sync: {
        enabled: true,
        interval: 300,
        todo_write_sync: true,
        commit_tracking: true,
        auto_status_update: true
      },
      goals: {
        track_progress: true,
        auto_switch: true,
        clickup_custom_field: 'goal_id'
      },
      reports: {
        daily: {
          enabled: true,
          time: '18:00',
          auto_submit: false
        },
        weekly: {
          enabled: true,
          day: 'friday',
          time: '17:00',
          auto_submit: false
        }
      },
      hooks: {
        todo_write: true,
        git_commit: true,
        status_change: true
      }
    };

    configManager.saveConfig(config);

    // Save status config
    const statusConfig: SpaceStatusConfig = {
      spaces: {
        [selectedSpace.name]: {
          lists: {
            [selectedList.name]: {
              statuses: statuses,
              default_status: todoStatus.status,
              complete_status: doneStatus.status
            }
          }
        }
      },
      status_mappings: statusMappings
    };

    configManager.saveStatusConfig(statusConfig);

    console.log(chalk.green('✓ Configuration saved'));

    // Step 11: Setup instructions
    console.log(chalk.cyan.bold('\n📋 Setup Complete!\n'));
    console.log('To start using ClickMongrel with Claude Code:\n');
    console.log(chalk.white('1. Build the project:'));
    console.log(chalk.gray('   pnpm run build\n'));
    console.log(chalk.white('2. Add to Claude Code:'));
    console.log(chalk.gray(`   claude mcp add clickmongrel --env CLICKUP_API_KEY=${apiKey} -- node ${path.join(__dirname, '../dist/index.js')}\n`));
    console.log(chalk.white('3. Test the integration:'));
    console.log(chalk.gray('   In Claude Code, type: /mcp'));
    console.log(chalk.gray('   Then use: mcp__clickmongrel__get_sync_status\n'));
    
    console.log(chalk.yellow('Optional: Configure hooks in .claude/settings.json for automatic TodoWrite sync'));
    console.log(chalk.green('\n✨ Happy coding with ClickMongrel!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Initialization failed:'), error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  init();
}

export default init;