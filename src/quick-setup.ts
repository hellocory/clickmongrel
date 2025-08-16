#!/usr/bin/env node
import chalk from 'chalk';
import ClickUpAPI from './utils/clickup-api.js';
import * as fs from 'fs';
import * as path from 'path';
import { ClickUpSpace, ClickUpList } from './types/index.js';

/**
 * Quick setup for AI-driven ClickUp integration
 * Simple, direct, no interactive prompts
 */
export class QuickSetup {
  private api: ClickUpAPI;
  private config: {
    apiKey: string;
    workspaceId?: string;
    spaceId?: string;
    spaceName?: string;
    folderId?: string;
    folderName?: string;
    structure?: {
      commitsList?: string;
      tasksList?: string;
    };
  };

  constructor(apiKey: string, spaceId?: string, folderId?: string) {
    this.api = new ClickUpAPI(apiKey);
    this.config = {
      apiKey,
      spaceId,
      folderId
    };
  }

  /**
   * Main setup method - creates everything needed
   */
  async setup(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 ClickMongrel Quick Setup\n'));

    try {
      // Step 1: Validate connection
      await this.validateConnection();

      // Step 2: Setup or validate space
      await this.setupSpace();

      // Step 3: Create standard structure
      await this.createStandardStructure();

      // Step 4: Save project configuration
      await this.saveProjectConfig();

      // Step 5: Update MCP configuration
      await this.updateMcpConfig();

      console.log(chalk.green.bold('\n✅ Setup Complete!\n'));
      this.displaySummary();

    } catch (error: any) {
      console.error(chalk.red('\n❌ Setup failed:'), error.message);
      throw error;
    }
  }

  /**
   * Just validate the API key works
   */
  private async validateConnection(): Promise<void> {
    console.log(chalk.yellow('Testing connection...'));
    const user = await this.api.getCurrentUser();
    console.log(chalk.green(`✓ Connected as: ${user.username}`));
    
    // Get workspace info
    const teams = await this.api.getTeams();
    if (teams.length > 0) {
      this.config.workspaceId = teams[0]?.id;
      console.log(chalk.gray(`  Workspace: ${teams[0]?.name}`));
    }
  }

  /**
   * Setup the space - use existing or create "Agentic Development"
   */
  private async setupSpace(): Promise<void> {
    if (this.config.spaceId) {
      // User provided a space ID, just validate it
      console.log(chalk.yellow(`\nValidating space ID: ${this.config.spaceId}`));
      try {
        const space = await this.api.getSpace(this.config.spaceId);
        this.config.spaceName = space.name;
        console.log(chalk.green(`✓ Using space: ${space.name}`));
        return;
      } catch (error) {
        console.log(chalk.yellow('Space ID not found, will create Agentic Development space'));
      }
    }

    // No space ID or invalid - create/find Agentic Development
    console.log(chalk.yellow('\nSetting up Agentic Development space...'));
    
    if (!this.config.workspaceId) {
      throw new Error('No workspace found');
    }

    const spaces = await this.api.getSpaces(this.config.workspaceId);
    const agenticSpace = spaces.find(s => 
      s.name === 'Agentic Development' || 
      s.name.toLowerCase().includes('agentic')
    );

    if (agenticSpace) {
      this.config.spaceId = agenticSpace.id;
      this.config.spaceName = agenticSpace.name;
      console.log(chalk.green(`✓ Found existing space: ${agenticSpace.name}`));
    } else {
      // Create the space
      console.log(chalk.cyan('Creating Agentic Development space...'));
      const newSpace = await this.createAgenticSpace();
      this.config.spaceId = newSpace.id;
      this.config.spaceName = newSpace.name;
      console.log(chalk.green(`✓ Created space: ${newSpace.name}`));
    }
  }

  /**
   * Create the standard folder/list structure
   */
  private async createStandardStructure(): Promise<void> {
    if (!this.config.spaceId) {
      throw new Error('No space configured');
    }

    console.log(chalk.cyan('\n📁 Setting up structure...\n'));

    // Create folders
    const folders = [
      { name: 'Weekly Reports', description: 'Weekly development reports' },
      { name: 'Daily Reports', description: 'Daily progress updates' },
      { name: 'Docs', description: 'Documentation and context' }
    ];

    for (const folder of folders) {
      try {
        await this.api.makeRequest(
          `/space/${this.config.spaceId}/folder`,
          'POST',
          folder
        );
        console.log(chalk.green(`  ✓ Created folder: ${folder.name}`));
      } catch (error: any) {
        if (error.message?.includes('taken') || error.message?.includes('exists')) {
          console.log(chalk.gray(`  • Folder exists: ${folder.name}`));
        } else {
          console.log(chalk.yellow(`  ⚠ Could not create folder: ${folder.name}`));
        }
      }
    }

    // Create or find lists
    console.log('');
    
    // Get existing lists first
    const existingLists = await this.api.getLists(this.config.spaceId);
    
    // Commits list
    let commitsList = existingLists.find(l => l.name === 'Commits');
    if (!commitsList) {
      try {
        commitsList = await this.createCommitsList();
        console.log(chalk.green(`  ✓ Created list: Commits`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not create Commits list`));
      }
    } else {
      console.log(chalk.gray(`  • List exists: Commits`));
    }
    if (commitsList) {
      this.config.structure = { ...this.config.structure, commitsList: commitsList.id };
    }

    // Tasks list
    let tasksList = existingLists.find(l => l.name === 'Tasks');
    if (!tasksList) {
      try {
        tasksList = await this.createTasksList();
        console.log(chalk.green(`  ✓ Created list: Tasks`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not create Tasks list`));
      }
    } else {
      console.log(chalk.gray(`  • List exists: Tasks`));
    }
    if (tasksList) {
      this.config.structure = { ...this.config.structure, tasksList: tasksList.id };
    }
  }

  /**
   * Create Agentic Development space with features
   */
  private async createAgenticSpace(): Promise<ClickUpSpace> {
    const spaceData = {
      name: 'Agentic Development',
      multiple_assignees: true,
      features: {
        due_dates: {
          enabled: true,
          start_date: true,
          remap_due_dates: false,
          remap_closed_due_date: false
        },
        tags: { enabled: true },
        time_estimates: { enabled: true },
        custom_fields: { enabled: true },
        remap_dependencies: { enabled: true },
        dependency_warning: { enabled: true }
      }
    };

    return await this.api.makeRequest(
      `/team/${this.config.workspaceId}/space`,
      'POST',
      spaceData
    );
  }

  /**
   * Create Commits list with specific statuses
   */
  private async createCommitsList(): Promise<ClickUpList> {
    const listData = {
      name: 'Commits',
      content: 'Git commit tracking',
      status: [
        { status: 'development', color: '#87909e', type: 'custom', orderindex: 0 },
        { status: 'error', color: '#ff5733', type: 'custom', orderindex: 1 },
        { status: 'prototype', color: '#ffab00', type: 'custom', orderindex: 2 },
        { status: 'production', color: '#02c852', type: 'custom', orderindex: 3 }
      ]
    };

    return await this.api.makeRequest(
      `/space/${this.config.spaceId}/list`,
      'POST',
      listData
    );
  }

  /**
   * Create Tasks list with specific statuses
   */
  private async createTasksList(): Promise<ClickUpList> {
    const listData = {
      name: 'Tasks',
      content: 'Task and goal management',
      status: [
        { status: 'to do', color: '#87909e', type: 'custom', orderindex: 0 },
        { status: 'future', color: '#4194f6', type: 'custom', orderindex: 1 },
        { status: 'in progress', color: '#ffab00', type: 'custom', orderindex: 2 },
        { status: 'fixing', color: '#ff8c00', type: 'custom', orderindex: 3 },
        { status: 'completed', color: '#02c852', type: 'custom', orderindex: 4 }
      ]
    };

    return await this.api.makeRequest(
      `/space/${this.config.spaceId}/list`,
      'POST',
      listData
    );
  }

  /**
   * Save configuration to project
   */
  private async saveProjectConfig(): Promise<void> {
    const projectRoot = process.cwd();
    const claudeDir = path.join(projectRoot, '.claude');
    const clickupDir = path.join(claudeDir, 'clickup');

    // Create directories
    [claudeDir, clickupDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Create folder structure
    const dirs = [
      path.join(clickupDir, 'cache'),
      path.join(clickupDir, 'logs'),
      path.join(clickupDir, 'reports'),
      path.join(clickupDir, 'reports', 'daily'),
      path.join(clickupDir, 'reports', 'weekly')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Save config
    const config = {
      apiKey: this.config.apiKey,
      workspace: {
        id: this.config.workspaceId,
        name: 'Active Workspace'
      },
      space: {
        id: this.config.spaceId,
        name: this.config.spaceName
      },
      lists: {
        commits: this.config.structure?.commitsList,
        tasks: this.config.structure?.tasksList
      },
      folder: this.config.folderId ? {
        id: this.config.folderId,
        name: this.config.folderName
      } : null,
      initialized: new Date().toISOString()
    };

    const configPath = path.join(clickupDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`\n✓ Saved config to: .claude/clickup/config.json`));
  }

  /**
   * Update MCP server configuration
   */
  private async updateMcpConfig(): Promise<void> {
    // Store environment variables in the config that MCP can read
    const mcpConfigPath = path.join(process.cwd(), '.claude', 'clickup', 'mcp-env.json');
    
    const mcpEnv = {
      CLICKUP_API_KEY: this.config.apiKey,
      CLICKUP_SPACE_ID: this.config.spaceId,
      CLICKUP_SPACE_NAME: this.config.spaceName,
      CLICKUP_COMMITS_LIST: this.config.structure?.commitsList,
      CLICKUP_TASKS_LIST: this.config.structure?.tasksList
    };

    fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpEnv, null, 2));
    console.log(chalk.green(`✓ Saved MCP config to: .claude/clickup/mcp-env.json`));
  }

  /**
   * Display setup summary
   */
  private displaySummary(): void {
    console.log(chalk.cyan('Configuration:'));
    console.log(`  • Space: ${this.config.spaceName || 'Not configured'}`);
    if (this.config.structure?.commitsList) {
      console.log(`  • Commits List: Ready`);
    }
    if (this.config.structure?.tasksList) {
      console.log(`  • Tasks List: Ready`);
    }
    console.log(`  • Project folder: .claude/clickup/`);
    
    console.log(chalk.yellow('\n📝 AI Instructions:'));
    console.log('• TodoWrite will sync to the Tasks list');
    console.log('• Git commits will track to the Commits list');
    console.log('• Reports will save to the reports folders');
    console.log('• Config is in .claude/clickup/config.json');
    
    console.log(chalk.cyan('\n🤖 For AI to switch spaces:'));
    console.log('Run: clickmongrel quick-setup --space <space-id>');
  }
}

// CLI interface
if (process.argv[1]?.endsWith('quick-setup.ts') || process.argv[1]?.endsWith('quick-setup.js')) {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let apiKey = process.env.CLICKUP_API_KEY;
  let spaceId: string | undefined;
  let folderId: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-key' && args[i + 1]) {
      apiKey = args[i + 1];
      i++;
    } else if (args[i] === '--space' && args[i + 1]) {
      spaceId = args[i + 1];
      i++;
    } else if (args[i] === '--folder' && args[i + 1]) {
      folderId = args[i + 1];
      i++;
    }
  }
  
  if (!apiKey) {
    console.error(chalk.red('Error: API key required'));
    console.log('Usage: clickmongrel quick-setup --api-key <key> [--space <id>] [--folder <id>]');
    process.exit(1);
  }
  
  const setup = new QuickSetup(apiKey, spaceId, folderId);
  setup.setup().catch(error => {
    console.error(chalk.red('Setup failed:'), error);
    process.exit(1);
  });
}

export default QuickSetup;