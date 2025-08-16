#!/usr/bin/env node
/**
 * AI-friendly setup for ClickUp integration
 * This can be called directly by Claude when user says "setup clickup for me"
 */

import chalk from 'chalk';
import ClickUpAPI from './utils/clickup-api.js';
import * as fs from 'fs';
import * as path from 'path';
import { ClickUpTeam, ClickUpSpace } from './types/index.js';

export class AISetup {
  private api: ClickUpAPI;
  private apiKey: string;

  constructor(apiKey?: string) {
    // Try to get API key from various sources
    this.apiKey = apiKey || 
                  process.env.CLICKUP_API_KEY || 
                  this.getStoredApiKey() ||
                  '';
    
    if (!this.apiKey) {
      throw new Error('No API key provided. Please provide: --api-key <YOUR_KEY>');
    }
    
    this.api = new ClickUpAPI(this.apiKey);
  }

  /**
   * Main setup function - handles all scenarios
   */
  async setup(options?: {
    spaceName?: string;  // Optional: create new space with this name
    spaceId?: string;    // Optional: use existing space
    workspaceName?: string; // Optional: specific workspace to use
  }): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 Setting up ClickUp Integration\n'));

    try {
      // 1. Test connection and get workspace
      const workspace = await this.getWorkspace(options?.workspaceName);
      
      // 2. Handle space (create new, use existing, or find default)
      const space = await this.handleSpace(workspace, options);
      
      // 3. Create folder structure
      await this.createFolders(space);
      
      // 4. Create lists
      const lists = await this.createLists(space);
      
      // 5. Save configuration
      await this.saveConfiguration(workspace, space, lists);
      
      // 6. Display success and instructions
      this.displaySuccess(space, lists);
      
    } catch (error: any) {
      console.error(chalk.red('\n❌ Setup failed:'), error.message);
      throw error;
    }
  }

  /**
   * Get the workspace to use - from config, environment, or user selection
   */
  private async getWorkspace(workspaceName?: string): Promise<ClickUpTeam> {
    console.log(chalk.yellow('Connecting to ClickUp...'));
    
    const user = await this.api.getCurrentUser();
    console.log(chalk.green(`✓ Connected as: ${user.username}`));
    
    const teams = await this.api.getTeams();
    if (teams.length === 0) {
      throw new Error('No workspaces found in your ClickUp account');
    }
    
    let workspace: ClickUpTeam | undefined;
    
    // Priority order for workspace selection:
    // 1. Explicitly provided workspace name
    // 2. Workspace from existing project config
    // 3. Workspace from environment variable
    // 4. If only one workspace exists, use it
    // 5. Otherwise, list options and ask user to specify
    
    if (workspaceName) {
      // User specified a workspace
      workspace = teams.find(t => t.name === workspaceName || t.id === workspaceName);
      if (!workspace) {
        console.error(chalk.red(`\n❌ ERROR: Workspace "${workspaceName}" not found`));
        console.error(chalk.yellow('Available workspaces:'));
        teams.forEach(t => console.error(`  - ${t.name} (ID: ${t.id})`));
        throw new Error(`Workspace "${workspaceName}" not found`);
      }
    } else {
      // Try to get from existing config
      const existingWorkspace = this.getConfiguredWorkspace();
      if (existingWorkspace) {
        workspace = teams.find(t => t.id === existingWorkspace.id || t.name === existingWorkspace.name);
        if (workspace) {
          console.log(chalk.gray(`Using workspace from config: ${workspace.name}`));
        }
      }
      
      // Try environment variable
      if (!workspace && process.env.CLICKUP_WORKSPACE_ID) {
        workspace = teams.find(t => t.id === process.env.CLICKUP_WORKSPACE_ID);
        if (workspace) {
          console.log(chalk.gray(`Using workspace from environment: ${workspace.name}`));
        }
      }
      
      // If only one workspace, use it
      if (!workspace && teams.length === 1) {
        workspace = teams[0];
        console.log(chalk.gray(`Using only available workspace: ${workspace?.name}`));
      }
      
      // Otherwise, need user to specify
      if (!workspace) {
        console.error(chalk.yellow('\n⚠️  Multiple workspaces found. Please specify which to use:'));
        teams.forEach(t => console.error(`  - ${t.name} (ID: ${t.id})`));
        console.error(chalk.cyan('\nRun with: --workspace-name "<workspace name or ID>"'));
        throw new Error('Multiple workspaces found - please specify which to use');
      }
    }
    
    console.log(chalk.green(`✓ Using workspace: ${workspace.name}\n`));
    return workspace;
  }
  
  /**
   * Get workspace from existing configuration if available
   */
  private getConfiguredWorkspace(): { id: string; name: string } | null {
    try {
      // Check project config
      const projectConfig = path.join(process.cwd(), '.claude', 'clickup', 'config.json');
      if (fs.existsSync(projectConfig)) {
        const config = JSON.parse(fs.readFileSync(projectConfig, 'utf-8'));
        if (config.workspace) {
          return config.workspace;
        }
      }
      
      // Check home directory config
      const homeConfig = path.join(process.env.HOME || '', '.claude', 'clickup', 'default-workspace.json');
      if (fs.existsSync(homeConfig)) {
        const config = JSON.parse(fs.readFileSync(homeConfig, 'utf-8'));
        if (config.workspace) {
          return config.workspace;
        }
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * Handle space selection/creation
   */
  private async handleSpace(
    workspace: ClickUpTeam, 
    options?: { spaceName?: string; spaceId?: string }
  ): Promise<ClickUpSpace> {
    
    // If specific space ID provided, use it
    if (options?.spaceId) {
      console.log(chalk.yellow(`Looking for space ID: ${options.spaceId}...`));
      const space = await this.api.getSpace(options.spaceId);
      console.log(chalk.green(`✓ Using existing space: ${space.name}\n`));
      return space;
    }
    
    // If space name provided, create it
    if (options?.spaceName) {
      console.log(chalk.yellow(`Creating new space: ${options.spaceName}...`));
      const space = await this.createSpace(workspace.id, options.spaceName);
      console.log(chalk.green(`✓ Created space: ${space.name}\n`));
      return space;
    }
    
    // Otherwise, find or create default "Agentic Development" space
    console.log(chalk.yellow('Setting up default Agentic Development space...'));
    const spaces = await this.api.getSpaces(workspace.id);
    
    let space = spaces.find(s => 
      s.name === 'Agentic Development' || 
      s.name.toLowerCase().includes('agentic')
    );
    
    if (space) {
      console.log(chalk.green(`✓ Found existing space: ${space.name}\n`));
    } else {
      space = await this.createSpace(workspace.id, 'Agentic Development');
      console.log(chalk.green(`✓ Created space: Agentic Development\n`));
    }
    
    return space;
  }

  /**
   * Create a new space
   */
  private async createSpace(workspaceId: string, name: string): Promise<ClickUpSpace> {
    const spaceData = {
      name,
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
    
    const space = await this.api.makeRequest(
      `/team/${workspaceId}/space`,
      'POST',
      spaceData
    );
    
    // Wait for space to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return space;
  }

  /**
   * Create folder structure
   */
  private async createFolders(space: ClickUpSpace): Promise<void> {
    console.log(chalk.yellow('Creating folder structure...'));
    
    const folders = [
      { name: 'Weekly Reports', description: 'Weekly development reports' },
      { name: 'Daily Reports', description: 'Daily progress updates' },
      { name: 'Docs', description: 'Documentation and context' }
    ];
    
    for (const folder of folders) {
      try {
        await this.api.makeRequest(`/space/${space.id}/folder`, 'POST', folder);
        console.log(chalk.green(`  ✓ Created folder: ${folder.name}`));
      } catch (error: any) {
        if (error.message?.includes('taken') || error.message?.includes('exists')) {
          console.log(chalk.gray(`  • Folder exists: ${folder.name}`));
        }
      }
    }
    console.log('');
  }

  /**
   * Create lists
   */
  private async createLists(space: ClickUpSpace): Promise<{ commits?: string; tasks?: string }> {
    console.log(chalk.yellow('Creating lists...'));
    
    const lists: { commits?: string; tasks?: string } = {};
    
    // Check existing lists
    const existingLists = await this.api.getLists(space.id);
    
    // Create or find Commits list
    let commitsList = existingLists.find(l => l.name === 'Commits');
    if (!commitsList) {
      try {
        commitsList = await this.api.makeRequest(`/space/${space.id}/list`, 'POST', {
          name: 'Commits',
          content: 'Git commit tracking'
        });
        console.log(chalk.green(`  ✓ Created list: Commits`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not create Commits list`));
      }
    } else {
      console.log(chalk.gray(`  • List exists: Commits`));
    }
    if (commitsList) lists.commits = commitsList.id;
    
    // Create or find Tasks list
    let tasksList = existingLists.find(l => l.name === 'Tasks');
    if (!tasksList) {
      try {
        tasksList = await this.api.makeRequest(`/space/${space.id}/list`, 'POST', {
          name: 'Tasks',
          content: 'Task and goal management'
        });
        console.log(chalk.green(`  ✓ Created list: Tasks`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not create Tasks list`));
      }
    } else {
      console.log(chalk.gray(`  • List exists: Tasks`));
    }
    if (tasksList) lists.tasks = tasksList.id;
    
    console.log('');
    return lists;
  }

  /**
   * Save configuration to project
   */
  private async saveConfiguration(
    workspace: ClickUpTeam,
    space: ClickUpSpace,
    lists: { commits?: string; tasks?: string }
  ): Promise<void> {
    const projectRoot = process.cwd();
    const claudeDir = path.join(projectRoot, '.claude');
    const clickupDir = path.join(claudeDir, 'clickup');
    
    // Create directories
    fs.mkdirSync(clickupDir, { recursive: true });
    fs.mkdirSync(path.join(clickupDir, 'cache'), { recursive: true });
    fs.mkdirSync(path.join(clickupDir, 'logs'), { recursive: true });
    fs.mkdirSync(path.join(clickupDir, 'reports', 'daily'), { recursive: true });
    fs.mkdirSync(path.join(clickupDir, 'reports', 'weekly'), { recursive: true });
    
    // Save configuration
    const config = {
      apiKey: this.apiKey,
      workspace: {
        id: workspace.id,
        name: workspace.name
      },
      space: {
        id: space.id,
        name: space.name
      },
      lists: {
        commits: lists.commits,
        tasks: lists.tasks
      },
      initialized: new Date().toISOString()
    };
    
    const configPath = path.join(clickupDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Also save MCP environment config
    const mcpEnv = {
      CLICKUP_API_KEY: this.apiKey,
      CLICKUP_SPACE_ID: space.id,
      CLICKUP_SPACE_NAME: space.name,
      CLICKUP_COMMITS_LIST: lists.commits,
      CLICKUP_TASKS_LIST: lists.tasks
    };
    
    const mcpPath = path.join(clickupDir, 'mcp-env.json');
    fs.writeFileSync(mcpPath, JSON.stringify(mcpEnv, null, 2));
  }

  /**
   * Display success message
   */
  private displaySuccess(space: ClickUpSpace, lists: { commits?: string; tasks?: string }): void {
    console.log(chalk.green.bold('✅ ClickUp Integration Setup Complete!\n'));
    
    console.log(chalk.cyan('Configuration:'));
    console.log(`  • Space: ${space.name}`);
    console.log(`  • Folders: Weekly Reports, Daily Reports, Docs`);
    if (lists.commits) console.log(`  • Commits List: Ready`);
    if (lists.tasks) console.log(`  • Tasks List: Ready`);
    console.log(`  • Config saved to: .claude/clickup/\n`);
    
    console.log(chalk.yellow.bold('⚠️  Manual Step Required:\n'));
    console.log('Please configure custom statuses in ClickUp:');
    console.log('');
    console.log(chalk.white('For Commits list:'));
    console.log('  1. Open ClickUp → ' + space.name + ' → Commits');
    console.log('  2. Click ... → List Settings → Statuses');
    console.log('  3. Add: COMMITTED, DEVELOPING, PROTOTYPING,');
    console.log('     REJECTED, PRODUCTION/TESTING, PRODUCTION/FINAL');
    console.log('');
    console.log(chalk.white('For Tasks list:'));
    console.log('  1. Open ClickUp → ' + space.name + ' → Tasks');
    console.log('  2. Click ... → List Settings → Statuses');
    console.log('  3. Add: to do, future, in progress, fixing, completed');
    console.log('');
    console.log(chalk.green('Once statuses are configured:'));
    console.log('  • TodoWrite will auto-sync to Tasks list');
    console.log('  • Git commits will track to Commits list');
    console.log('  • Reports will be generated in folders');
  }

  /**
   * Try to get stored API key from previous setup
   */
  private getStoredApiKey(): string | null {
    try {
      const configPath = path.join(process.cwd(), '.claude', 'clickup', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return config.apiKey || null;
      }
    } catch {
      // Ignore errors
    }
    return null;
  }
}

// Export for use in other modules
export default AISetup;

// CLI interface
if (process.argv[1]?.endsWith('ai-setup.ts') || process.argv[1]?.endsWith('ai-setup.js')) {
  const args = process.argv.slice(2);
  
  let apiKey: string | undefined;
  let workspaceName: string | undefined;
  let spaceName: string | undefined;
  let spaceId: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-key' && args[i + 1]) {
      apiKey = args[i + 1];
      i++;
    } else if (args[i] === '--workspace-name' && args[i + 1]) {
      workspaceName = args[i + 1];
      i++;
    } else if (args[i] === '--space-name' && args[i + 1]) {
      spaceName = args[i + 1];
      i++;
    } else if (args[i] === '--space-id' && args[i + 1]) {
      spaceId = args[i + 1];
      i++;
    }
  }
  
  try {
    const setup = new AISetup(apiKey);
    setup.setup({ workspaceName, spaceName, spaceId }).catch(error => {
      console.error(chalk.red('Setup failed:'), error.message);
      process.exit(1);
    });
  } catch (error: any) {
    console.error(chalk.red('Error:'), error.message);
    console.log('\nUsage: ai-setup --api-key <KEY> [--workspace-name <WORKSPACE>] [--space-name <NAME> | --space-id <ID>]');
    process.exit(1);
  }
}