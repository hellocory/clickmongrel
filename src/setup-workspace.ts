#!/usr/bin/env node
import chalk from 'chalk';
import ClickUpAPI from './utils/clickup-api.js';
import configManager from './config/index.js';
import { ClickUpSpace } from './types/index.js';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Setup script to create and configure the "Agentic Development" space
 * with proper folders, lists, and statuses for all AI-assisted development
 */

const SPACE_NAME = 'Agentic Development';
const DEFAULT_STATUSES = [
  { name: 'to do', color: '#87909e' },
  { name: 'in progress', color: '#5b9fd6' },
  { name: 'review', color: '#f9d900' },
  { name: 'done', color: '#6bc950' },
  { name: 'archived', color: '#c7c7c7' }
];

const DEFAULT_FOLDERS = [
  { name: 'Active Projects', lists: ['Development Tasks', 'Bugs & Issues', 'Testing'] },
  { name: 'Documentation', lists: ['API Docs', 'User Guides', 'Architecture'] },
  { name: 'Reports', lists: ['Daily Reports', 'Weekly Reports', 'Commit History'] },
  { name: 'Goals', lists: ['Current Goals', 'Future Goals', 'Completed Goals'] }
];

class WorkspaceSetup {
  private api: ClickUpAPI;
  private teamId: string | undefined;
  private spaceId: string | undefined;

  constructor(apiKey: string) {
    this.api = new ClickUpAPI(apiKey);
  }

  async run(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 ClickMongrel - Agentic Development Workspace Setup\n'));

    try {
      // Step 1: Get team/workspace
      await this.selectTeam();

      // Step 2: Check if Agentic Development space exists
      const existingSpace = await this.checkExistingSpace();
      
      if (existingSpace) {
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: `"${SPACE_NAME}" space already exists. What would you like to do?`,
            choices: [
              { name: 'Use existing space', value: 'use' },
              { name: 'Reconfigure existing space', value: 'reconfigure' },
              { name: 'Create new space with different name', value: 'new' },
              { name: 'Exit', value: 'exit' }
            ]
          }
        ]);

        if (action === 'exit') {
          console.log(chalk.yellow('Setup cancelled.'));
          process.exit(0);
        } else if (action === 'use') {
          this.spaceId = existingSpace.id;
        } else if (action === 'reconfigure') {
          this.spaceId = existingSpace.id;
          await this.configureSpace();
        } else {
          await this.createNewSpace();
        }
      } else {
        await this.createNewSpace();
      }

      // Step 3: Save configuration
      await this.saveConfiguration();

      // Step 4: Initialize project folder structure
      await this.initializeProjectFolder();

      console.log(chalk.green.bold('\n✅ Workspace setup complete!\n'));
      console.log(chalk.cyan('Your "Agentic Development" space is ready with:'));
      console.log('  • 4 main folders (Active Projects, Documentation, Reports, Goals)');
      console.log('  • Standardized lists in each folder');
      console.log('  • Consistent status workflow across all lists');
      console.log('  • Configured for TodoWrite sync');
      
      console.log(chalk.yellow('\nNext steps:'));
      console.log('1. Your todos will sync to "Active Projects > Development Tasks"');
      console.log('2. Reports will be saved to "Reports" folder');
      console.log('3. Goals will be tracked in "Goals" folder');
      console.log('4. All commits will be linked to relevant tasks');

    } catch (error) {
      console.error(chalk.red('\n❌ Setup failed:'), error);
      process.exit(1);
    }
  }

  private async selectTeam(): Promise<void> {
    console.log(chalk.yellow('Fetching workspaces...'));
    const teams = await this.api.getTeams();
    
    if (teams.length === 0) {
      throw new Error('No workspaces found');
    }

    if (teams.length === 1) {
      this.teamId = teams[0]!.id;
      console.log(chalk.green(`Using workspace: ${teams[0]!.name}`));
    } else {
      const { selectedTeam } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTeam',
          message: 'Select your workspace:',
          choices: teams.map(t => ({ name: t.name, value: t }))
        }
      ]);
      this.teamId = selectedTeam.id;
      console.log(chalk.green(`✓ Selected workspace: ${selectedTeam.name}`));
    }
  }

  private async checkExistingSpace(): Promise<ClickUpSpace | null> {
    if (!this.teamId) throw new Error('Team ID not set');
    
    console.log(chalk.yellow('Checking for existing Agentic Development space...'));
    const spaces = await this.api.getSpaces(this.teamId);
    
    return spaces.find(s => s.name === SPACE_NAME) || null;
  }

  private async createNewSpace(): Promise<void> {
    if (!this.teamId) throw new Error('Team ID not set');

    const { spaceName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'spaceName',
        message: 'Enter space name:',
        default: SPACE_NAME,
        validate: (input) => input.length > 0 || 'Space name is required'
      }
    ]);

    console.log(chalk.yellow(`Creating "${spaceName}" space...`));
    
    // Note: ClickUp API doesn't have a direct create space endpoint
    // You'll need to create it manually in ClickUp, then we configure it
    console.log(chalk.yellow('\n⚠️  Please create the space manually in ClickUp:'));
    console.log(`1. Go to your ClickUp workspace`);
    console.log(`2. Create a new space called "${spaceName}"`);
    console.log(`3. Press Enter when done`);
    
    await inquirer.prompt([
      {
        type: 'confirm',
        name: 'created',
        message: 'Have you created the space?',
        default: true
      }
    ]);

    // Fetch spaces again
    const spaces = await this.api.getSpaces(this.teamId);
    const newSpace = spaces.find(s => s.name === spaceName);
    
    if (!newSpace) {
      throw new Error(`Could not find "${spaceName}" space. Please create it in ClickUp first.`);
    }

    this.spaceId = newSpace.id;
    console.log(chalk.green(`✓ Found space: ${spaceName}`));
    
    await this.configureSpace();
  }

  private async configureSpace(): Promise<void> {
    if (!this.spaceId) throw new Error('Space ID not set');

    console.log(chalk.yellow('\nConfiguring space structure...'));
    
    // Get existing lists
    const existingLists = await this.api.getLists(this.spaceId);
    console.log(chalk.cyan(`Found ${existingLists.length} existing lists`));

    // Create folder structure
    console.log(chalk.yellow('\n📁 Setting up folder structure:'));
    
    for (const folder of DEFAULT_FOLDERS) {
      console.log(chalk.cyan(`\n  ${folder.name}/`));
      
      for (const listName of folder.lists) {
        // Check if list exists
        const existingList = existingLists.find(l => 
          l.name === listName && l.folder?.name === folder.name
        );
        
        if (existingList) {
          console.log(chalk.gray(`    ✓ ${listName} (exists)`));
        } else {
          console.log(chalk.yellow(`    + ${listName} (needs creation)`));
        }
      }
    }

    console.log(chalk.yellow('\n⚠️  Please create the following structure in ClickUp:'));
    console.log('1. Create folders: Active Projects, Documentation, Reports, Goals');
    console.log('2. In each folder, create the lists shown above');
    console.log('3. Ensure all lists have these statuses: to do, in progress, review, done, archived');
    
    const { configured } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'configured',
        message: 'Have you configured the space structure?',
        default: true
      }
    ]);

    if (configured) {
      console.log(chalk.green('✓ Space structure configured'));
    }
  }

  private async saveConfiguration(): Promise<void> {
    if (!this.teamId || !this.spaceId) {
      throw new Error('Team or Space ID not set');
    }

    console.log(chalk.yellow('\nSaving configuration...'));

    // Get the Development Tasks list for syncing
    const lists = await this.api.getLists(this.spaceId);
    const devTasksList = lists.find(l => l.name === 'Development Tasks');
    
    if (!devTasksList) {
      console.log(chalk.yellow('Warning: "Development Tasks" list not found. Please create it in the Active Projects folder.'));
      return;
    }

    // Get statuses from the list
    const statuses = devTasksList.statuses || DEFAULT_STATUSES;

    // Save configuration
    const config = {
      clickup: {
        api_key: process.env.CLICKUP_API_KEY || '',
        workspace_id: this.teamId,
        default_space: SPACE_NAME,
        default_list: 'Development Tasks'
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
          auto_submit: true
        },
        weekly: {
          enabled: true,
          day: 'friday',
          time: '17:00',
          auto_submit: true
        }
      },
      hooks: {
        todo_write: true,
        git_commit: true,
        status_change: true
      }
    };

    configManager.saveConfig(config);

    // Save status mappings
    const statusConfig = {
      spaces: {
        [SPACE_NAME]: {
          lists: {
            'Development Tasks': {
              statuses: statuses,
              default_status: statuses.find((s: any) => s.status?.toLowerCase().includes('to do'))?.status || 'to do',
              complete_status: statuses.find((s: any) => s.status?.toLowerCase().includes('done'))?.status || 'done'
            }
          }
        }
      },
      status_mappings: {
        pending: statuses.find((s: any) => s.status?.toLowerCase().includes('to do'))?.status || 'to do',
        in_progress: statuses.find((s: any) => s.status?.toLowerCase().includes('progress'))?.status || 'in progress',
        completed: statuses.find((s: any) => s.status?.toLowerCase().includes('done'))?.status || 'done'
      }
    };

    configManager.saveStatusConfig(statusConfig);
    console.log(chalk.green('✓ Configuration saved'));

    // Display configuration summary
    console.log(chalk.cyan('\n📋 Configuration Summary:'));
    console.log(`  Workspace: ${this.teamId}`);
    console.log(`  Space: ${SPACE_NAME}`);
    console.log(`  Default List: Development Tasks`);
    console.log(`  Todo Sync: Enabled`);
    console.log(`  Commit Tracking: Enabled`);
    console.log(`  Auto Reports: Enabled`);
  }

  private async initializeProjectFolder(): Promise<void> {
    console.log(chalk.yellow('\n📁 Initializing project folder structure...'));
    
    // Determine project root (current directory or parent)
    const cwd = process.cwd();
    const projectRoot = cwd;
    
    // Create .claude/clickup directory structure
    const claudeDir = path.join(projectRoot, '.claude');
    const clickupDir = path.join(claudeDir, 'clickup');
    
    // Create directories
    const directories = [
      claudeDir,
      clickupDir,
      path.join(clickupDir, 'goals'),
      path.join(clickupDir, 'goals', 'active'),
      path.join(clickupDir, 'goals', 'future'),
      path.join(clickupDir, 'goals', 'completed'),
      path.join(clickupDir, 'reports'),
      path.join(clickupDir, 'reports', 'daily'),
      path.join(clickupDir, 'reports', 'weekly'),
      path.join(clickupDir, 'cache'),
      path.join(clickupDir, 'logs')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(chalk.green(`  ✓ Created: ${path.relative(projectRoot, dir)}`));
      } else {
        console.log(chalk.gray(`  • Exists: ${path.relative(projectRoot, dir)}`));
      }
    }

    // Create default files
    const files = [
      {
        path: path.join(clickupDir, 'config.json'),
        content: JSON.stringify({
          space: SPACE_NAME,
          default_list: 'Development Tasks',
          project_name: path.basename(projectRoot),
          initialized_at: new Date().toISOString(),
          sync_enabled: true,
          auto_reports: true
        }, null, 2)
      },
      {
        path: path.join(clickupDir, 'current-goal.md'),
        content: `# Current Goal

## Goal: Project Setup
- **Status**: In Progress
- **Started**: ${new Date().toISOString().split('T')[0]}
- **Target**: Complete project initialization

### Tasks
- [x] Initialize ClickMongrel MCP server
- [x] Configure Agentic Development space
- [ ] Test TodoWrite synchronization
- [ ] Verify report generation

### Notes
This file tracks the current active goal for this project.
It syncs with ClickUp's Goals folder.
`
      },
      {
        path: path.join(clickupDir, 'README.md'),
        content: `# ClickUp Integration for ${path.basename(projectRoot)}

This folder contains all ClickUp-related configuration and data for this project.

## Structure

\`\`\`
.claude/clickup/
├── config.json          # Project-specific ClickUp configuration
├── current-goal.md      # Active goal tracking
├── goals/               # Goal documentation
│   ├── active/         # Currently active goals
│   ├── future/         # Planned future goals
│   └── completed/      # Archived completed goals
├── reports/            # Generated reports
│   ├── daily/         # Daily development reports
│   └── weekly/        # Weekly summary reports
├── cache/             # Cached ClickUp data
└── logs/              # Sync and error logs
\`\`\`

## Configuration

- **Space**: ${SPACE_NAME}
- **Default List**: Development Tasks
- **Sync**: Enabled
- **Reports**: Auto-generated daily and weekly

## Usage

1. TodoWrite automatically syncs to ClickUp
2. Reports are generated and saved here
3. Goals are tracked in the goals/ folder
4. All commits link to active tasks

## Commands

\`\`\`bash
# Check sync status
clickmongrel status

# Generate report
clickmongrel report daily

# View current goal
clickmongrel goal --current

# Force sync
clickmongrel sync
\`\`\`
`
      },
      {
        path: path.join(claudeDir, 'settings.json'),
        content: JSON.stringify({
          hooks: {
            PostToolUse: [
              {
                matcher: "TodoWrite",
                hooks: [
                  {
                    type: "command",
                    command: "echo 'TodoWrite changed - syncing to ClickUp...' >&2"
                  }
                ]
              }
            ],
            PreToolUse: [
              {
                matcher: "Bash",
                hooks: [
                  {
                    type: "command", 
                    command: "if [[ \"$1\" == *\"git commit\"* ]]; then echo 'Commit detected - will link to ClickUp' >&2; fi"
                  }
                ]
              }
            ],
            SessionStart: [
              {
                matcher: "startup|resume",
                hooks: [
                  {
                    type: "command",
                    command: "echo 'ClickMongrel: Agentic Development space active' >&2"
                  }
                ]
              }
            ]
          }
        }, null, 2)
      }
    ];

    for (const file of files) {
      if (!fs.existsSync(file.path)) {
        fs.writeFileSync(file.path, file.content);
        console.log(chalk.green(`  ✓ Created: ${path.relative(projectRoot, file.path)}`));
      } else {
        console.log(chalk.gray(`  • Exists: ${path.relative(projectRoot, file.path)}`));
      }
    }

    console.log(chalk.green('\n✓ Project folder structure initialized'));
    console.log(chalk.cyan(`  Location: ${path.relative(process.cwd(), clickupDir)}`));
  }
}

// Run if called directly
async function main() {
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('Error: CLICKUP_API_KEY environment variable is required'));
    process.exit(1);
  }
  const setup = new WorkspaceSetup(apiKey);
  await setup.run();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export default WorkspaceSetup;