#!/usr/bin/env node
import chalk from 'chalk';
import ClickUpAPI from './utils/clickup-api.js';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Project-specific setup script that:
 * 1. Asks which workspace/space to use
 * 2. Updates MCP server env variables in .claude.json
 * 3. Creates project folder structure
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectSetup {
  private api: ClickUpAPI;
  private projectRoot: string;
  private claudeJsonPath: string;
  private selectedWorkspace: any;
  private selectedSpace: any;
  private selectedList: any;

  constructor() {
    // Use the API key from current config or default
    const apiKey = process.env.CLICKUP_API_KEY;
    if (!apiKey) {
      throw new Error('CLICKUP_API_KEY environment variable is required');
    }
    this.api = new ClickUpAPI(apiKey);
    this.projectRoot = process.cwd();
    this.claudeJsonPath = path.join(path.dirname(this.projectRoot), '.claude.json');
    
    // Check if we're in a subdirectory and look for .claude.json in parent
    if (!fs.existsSync(this.claudeJsonPath)) {
      this.claudeJsonPath = path.join(process.env.HOME!, '.claude.json');
    }
  }

  async run(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 ClickMongrel Project Setup\n'));
    console.log(chalk.gray(`Project: ${path.basename(this.projectRoot)}`));
    console.log(chalk.gray(`Location: ${this.projectRoot}\n`));

    try {
      // Step 1: Select workspace
      await this.selectWorkspace();

      // Step 2: Select or create space
      await this.selectSpace();

      // Step 3: Select list
      await this.selectList();

      // Step 4: Update MCP server configuration
      await this.updateMcpConfig();

      // Step 5: Create project folder structure
      await this.createProjectStructure();

      // Step 6: Save project configuration
      await this.saveProjectConfig();

      console.log(chalk.green.bold('\n✅ Project setup complete!\n'));
      console.log(chalk.cyan('Configuration:'));
      console.log(`  • Workspace: ${this.selectedWorkspace.name}`);
      console.log(`  • Space: ${this.selectedSpace.name}`);
      console.log(`  • Default List: ${this.selectedList.name}`);
      console.log(`  • Project folder: .claude/clickup/`);
      
      console.log(chalk.yellow('\nNext steps:'));
      console.log('1. Restart Claude Code to load new configuration');
      console.log('2. Use TodoWrite - it will sync to your selected list');
      console.log('3. Commits will be tracked automatically');
      console.log('4. Run "clickmongrel report daily" for reports');

    } catch (error) {
      console.error(chalk.red('\n❌ Setup failed:'), error);
      process.exit(1);
    }
  }

  private async selectWorkspace(): Promise<void> {
    console.log(chalk.yellow('Fetching workspaces...'));
    const teams = await this.api.getTeams();
    
    if (teams.length === 0) {
      throw new Error('No workspaces found');
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select your workspace:',
        choices: teams.map(t => ({ 
          name: t.name, 
          value: t 
        }))
      }
    ]);

    this.selectedWorkspace = selected;
    console.log(chalk.green(`✓ Selected workspace: ${this.selectedWorkspace.name}`));
  }

  private async selectSpace(): Promise<void> {
    console.log(chalk.yellow('\nFetching spaces...'));
    const spaces = await this.api.getSpaces(this.selectedWorkspace.id);
    
    if (spaces.length === 0) {
      throw new Error('No spaces found in workspace');
    }

    // Add option to create Agentic Development space
    const choices = [
      ...spaces.map(s => ({ 
        name: s.name, 
        value: { type: 'existing', space: s } 
      })),
      { 
        name: chalk.cyan('+ Create "Agentic Development" space'), 
        value: { type: 'create' } 
      }
    ];

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Select a space:',
        choices
      }
    ]);

    if (selected.type === 'create') {
      console.log(chalk.yellow('\n⚠️  Please create "Agentic Development" space in ClickUp:'));
      console.log('1. Go to your ClickUp workspace');
      console.log('2. Create a new space called "Agentic Development"');
      console.log('3. Add these folders: Active Projects, Documentation, Reports, Goals');
      
      const { created } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'created',
          message: 'Have you created the space?',
          default: true
        }
      ]);

      if (created) {
        // Fetch spaces again
        const updatedSpaces = await this.api.getSpaces(this.selectedWorkspace.id);
        const agenticSpace = updatedSpaces.find(s => 
          s.name.toLowerCase().includes('agentic') || 
          s.name.toLowerCase().includes('development')
        );
        
        if (agenticSpace) {
          this.selectedSpace = agenticSpace;
        } else {
          throw new Error('Could not find Agentic Development space');
        }
      } else {
        throw new Error('Space creation cancelled');
      }
    } else {
      this.selectedSpace = selected.space;
    }

    console.log(chalk.green(`✓ Selected space: ${this.selectedSpace.name}`));
  }

  private async selectList(): Promise<void> {
    console.log(chalk.yellow('\nFetching lists...'));
    const lists = await this.api.getLists(this.selectedSpace.id);
    
    if (lists.length === 0) {
      console.log(chalk.yellow('No lists found. Please create lists in ClickUp.'));
      this.selectedList = { 
        id: 'pending', 
        name: 'Development Tasks',
        statuses: []
      };
      return;
    }

    // Prefer "Development Tasks" if it exists
    const devTasksList = lists.find(l => l.name === 'Development Tasks');
    
    if (devTasksList) {
      this.selectedList = devTasksList;
      console.log(chalk.green(`✓ Auto-selected list: ${devTasksList.name}`));
    } else {
      const { selected } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selected',
          message: 'Select default list for tasks:',
          choices: lists.map(l => ({ 
            name: `${l.name} (${l.task_count || 0} tasks)`, 
            value: l 
          }))
        }
      ]);
      this.selectedList = selected;
      console.log(chalk.green(`✓ Selected list: ${this.selectedList.name}`));
    }
  }

  private async updateMcpConfig(): Promise<void> {
    console.log(chalk.yellow('\nUpdating MCP server configuration...'));
    
    if (!fs.existsSync(this.claudeJsonPath)) {
      console.log(chalk.yellow('No .claude.json found. Creating one...'));
      // Initialize with basic structure
      const initialConfig = {
        projects: {
          [this.projectRoot]: {
            mcpServers: {}
          }
        }
      };
      fs.writeFileSync(this.claudeJsonPath, JSON.stringify(initialConfig, null, 2));
    }

    const claudeJson = JSON.parse(fs.readFileSync(this.claudeJsonPath, 'utf-8'));
    
    // Ensure project exists in config
    if (!claudeJson.projects) {
      claudeJson.projects = {};
    }
    
    if (!claudeJson.projects[this.projectRoot]) {
      claudeJson.projects[this.projectRoot] = {
        mcpServers: {}
      };
    }

    // Update or add clickmongrel MCP server configuration
    claudeJson.projects[this.projectRoot].mcpServers.clickmongrel = {
      type: 'stdio',
      command: 'node',
      args: [
        path.join(__dirname, '../dist/index.js')
      ],
      env: {
        CLICKUP_API_KEY: process.env.CLICKUP_API_KEY || '',
        CLICKUP_WORKSPACE_ID: this.selectedWorkspace.id,
        CLICKUP_WORKSPACE_NAME: this.selectedWorkspace.name,
        CLICKUP_SPACE_ID: this.selectedSpace.id,
        CLICKUP_SPACE_NAME: this.selectedSpace.name,
        CLICKUP_LIST_ID: this.selectedList.id || '',
        CLICKUP_LIST_NAME: this.selectedList.name
      }
    };

    // Save updated configuration
    fs.writeFileSync(this.claudeJsonPath, JSON.stringify(claudeJson, null, 2));
    console.log(chalk.green('✓ Updated MCP server configuration'));
  }

  private async createProjectStructure(): Promise<void> {
    console.log(chalk.yellow('\nCreating project folder structure...'));
    
    const claudeDir = path.join(this.projectRoot, '.claude');
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
        console.log(chalk.green(`  ✓ Created: ${path.relative(this.projectRoot, dir)}`));
      } else {
        console.log(chalk.gray(`  • Exists: ${path.relative(this.projectRoot, dir)}`));
      }
    }
  }

  private async saveProjectConfig(): Promise<void> {
    console.log(chalk.yellow('\nSaving project configuration...'));
    
    const clickupDir = path.join(this.projectRoot, '.claude', 'clickup');
    const configPath = path.join(clickupDir, 'config.json');
    
    const config = {
      workspace: {
        id: this.selectedWorkspace.id,
        name: this.selectedWorkspace.name
      },
      space: {
        id: this.selectedSpace.id,
        name: this.selectedSpace.name
      },
      defaultList: {
        id: this.selectedList.id || '',
        name: this.selectedList.name
      },
      project: {
        name: path.basename(this.projectRoot),
        path: this.projectRoot
      },
      initialized: new Date().toISOString(),
      sync: {
        enabled: true,
        todoWrite: true,
        commits: true,
        reports: true
      }
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Create README
    const readmePath = path.join(clickupDir, 'README.md');
    const readme = `# ClickUp Integration - ${path.basename(this.projectRoot)}

## Configuration
- **Workspace**: ${this.selectedWorkspace.name}
- **Space**: ${this.selectedSpace.name}
- **Default List**: ${this.selectedList.name}

## Features
- ✅ TodoWrite sync to ClickUp
- ✅ Git commit tracking
- ✅ Daily/weekly reports
- ✅ Goal management

## Usage
\`\`\`bash
# Check status
clickmongrel status

# Generate report
clickmongrel report daily

# View current goal
clickmongrel goal --current
\`\`\`

## Folder Structure
- \`goals/\` - Goal tracking
- \`reports/\` - Generated reports
- \`cache/\` - Cached data
- \`logs/\` - Sync logs
`;

    fs.writeFileSync(readmePath, readme);
    console.log(chalk.green('✓ Saved project configuration'));
  }
}

// Run if called directly
async function main() {
  const setup = new ProjectSetup();
  await setup.run();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export default ProjectSetup;