#!/usr/bin/env node
import chalk from 'chalk';
import ClickUpAPI from './utils/clickup-api.js';
import { WorkspaceResolver } from './utils/workspace-resolver.js';
import logger from './utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { ClickUpSpace, ClickUpList } from './types/index.js';

/**
 * Quick setup for AI-driven ClickUp integration
 * Simple, direct, no interactive prompts
 */
export class QuickSetup {
  private api: ClickUpAPI;
  private resolver: WorkspaceResolver;
  private config: {
    apiKey: string;
    userId?: number;
    workspaceId?: string;
    workspaceName?: string;
    spaceId?: string;
    spaceName?: string;
    folderId?: string;
    folderName?: string;
    structure?: {
      commitsList?: string;
      tasksList?: string;
    };
  };

  constructor(apiKey: string, workspaceName?: string, spaceName?: string, spaceId?: string, folderId?: string) {
    this.api = new ClickUpAPI(apiKey);
    this.resolver = new WorkspaceResolver(apiKey);
    this.config = {
      apiKey,
      workspaceName,
      spaceName,
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

      // Step 4: Create commit templates
      await this.createCommitTemplates();

      // Step 5: Save project configuration
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
    
    // Store user ID for auto-assignment
    this.config.userId = user.id;
    console.log(chalk.gray(`  Auto-assign enabled for: ${user.username}`));
    
    // If workspace name is provided, find it
    if (this.config.workspaceName) {
      const workspace = await this.resolver.findWorkspaceByName(this.config.workspaceName);
      if (workspace) {
        this.config.workspaceId = workspace.id;
        // Keep the user-provided name, don't use the API's version
        // this.config.workspaceName = workspace.name;  // DON'T override
        console.log(chalk.gray(`  Workspace: ${this.config.workspaceName}`));
      } else {
        // Workspace not found - show error and available workspaces
        const teams = await this.api.getTeams();
        console.error(chalk.red(`\n❌ ERROR: Workspace "${this.config.workspaceName}" not found`));
        console.error(chalk.yellow('Available workspaces:'));
        teams.forEach(t => console.error(`  - ${t.name} (ID: ${t.id})`));
        throw new Error(`Workspace "${this.config.workspaceName}" not found. Please use one of the available workspaces.`);
      }
    } else {
      // No workspace specified - if only one exists, use it, otherwise error
      const teams = await this.api.getTeams();
      if (teams.length === 1) {
        this.config.workspaceId = teams[0]?.id;
        this.config.workspaceName = teams[0]?.name;
        console.log(chalk.gray(`  Workspace: ${this.config.workspaceName} (only workspace)`));
      } else if (teams.length > 1) {
        console.error(chalk.yellow('\n⚠️  Multiple workspaces found. Please specify which to use:'));
        teams.forEach(t => console.error(`  - ${t.name} (ID: ${t.id})`));
        throw new Error('Multiple workspaces found - please specify which workspace to use');
      } else {
        throw new Error('No workspaces found in ClickUp account');
      }
    }
  }

  /**
   * Setup the space - use provided name, existing ID, or create default
   */
  private async setupSpace(): Promise<void> {
    if (!this.config.workspaceId) {
      throw new Error('No workspace found');
    }

    // If space ID provided, validate it
    if (this.config.spaceId) {
      console.log(chalk.yellow(`\nValidating space ID: ${this.config.spaceId}`));
      try {
        const space = await this.api.getSpace(this.config.spaceId);
        this.config.spaceName = space.name;
        console.log(chalk.green(`✓ Using space: ${space.name}`));
        return;
      } catch (error) {
        console.log(chalk.yellow('Space ID not found, will continue with space name or default'));
      }
    }

    // If space name provided, find or create it
    if (this.config.spaceName) {
      console.log(chalk.yellow(`\nSetting up space: ${this.config.spaceName}...`));
      
      const spaces = await this.api.getSpaces(this.config.workspaceId);
      
      // Try exact match first
      let targetSpace = spaces.find(s => 
        s.name.toLowerCase() === this.config.spaceName?.toLowerCase()
      );
      
      // Try partial match
      if (!targetSpace) {
        targetSpace = spaces.find(s => 
          s.name.toLowerCase().includes(this.config.spaceName?.toLowerCase() || '') ||
          (this.config.spaceName?.toLowerCase() || '').includes(s.name.toLowerCase())
        );
      }
      
      if (targetSpace) {
        this.config.spaceId = targetSpace.id;
        this.config.spaceName = targetSpace.name;
        console.log(chalk.green(`✓ Found existing space: ${targetSpace.name}`));
      } else {
        // Create new space with the provided name
        console.log(chalk.yellow(`Creating new space: ${this.config.spaceName}...`));
        const newSpace = await this.createSpace(this.config.workspaceId, this.config.spaceName);
        this.config.spaceId = newSpace.id;
        this.config.spaceName = newSpace.name;
        console.log(chalk.green(`✓ Created space: ${newSpace.name}`));
      }
      return;
    }

    // No space name or ID - use default "Agentic Development"
    console.log(chalk.yellow('\nSetting up default Agentic Development space...'));
    
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
   * Create commit templates
   */
  private async createCommitTemplates(): Promise<void> {
    console.log(chalk.yellow('\n📝 Setting up commit templates...'));
    
    const commitTemplatePath = path.join(process.cwd(), '.claude/clickup/templates/commit-templates.json');
    const templateDir = path.dirname(commitTemplatePath);
    
    // Ensure template directory exists
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    
    if (!fs.existsSync(commitTemplatePath)) {
      const defaultCommitTemplates = {
        templates: {
          default: {
            title: "[COMMIT] {type}: {description}",
            body: "## Commit Details\\n\\n**Type:** {type}\\n**Scope:** {scope}\\n**Description:** {description}\\n\\n**Hash:** `{hash}`\\n**Author:** {author}\\n**Timestamp:** {timestamp}\\n\\n### Changes\\n{changes}\\n\\n### Files Modified\\n{files}\\n\\n---\\n*Tracked by ClickMongrel MCP*"
          },
          simple: {
            title: "{type}: {description}",
            body: "Commit: `{hash}`\\nAuthor: {author}\\n\\n{description}"
          },
          detailed: {
            title: "[{type}] {scope}: {description} ({hash_short})",
            body: "## 📝 Commit Information\\n\\n### Summary\\n{description}\\n\\n### Details\\n- **Type:** `{type}`\\n- **Scope:** `{scope}`\\n- **Hash:** `{hash}`\\n- **Author:** {author}\\n- **Date:** {timestamp}\\n\\n### Modified Files\\n```\\n{files}\\n```\\n\\n### Full Commit Message\\n```\\n{raw_message}\\n```"
          }
        },
        typeMapping: {
          feat: "✨ Feature",
          fix: "🐛 Fix",
          docs: "📚 Documentation",
          style: "💎 Style",
          refactor: "♻️ Refactor",
          test: "✅ Test",
          chore: "🔧 Chore",
          perf: "⚡ Performance",
          ci: "👷 CI",
          build: "📦 Build",
          revert: "⏪ Revert"
        },
        defaultTemplate: "default",
        parsePattern: "^(?<type>\\\\w+)(?:\\\\((?<scope>[^)]+)\\\\))?:\\\\s+(?<description>.+)$"
      };
      
      fs.writeFileSync(commitTemplatePath, JSON.stringify(defaultCommitTemplates, null, 2));
      console.log(chalk.green('✓ Commit templates created'));
    } else {
      console.log(chalk.green('✓ Commit templates already exist'));
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
        // Check if it's just a "folder already exists" error
        if (error.message?.includes('taken') || error.message?.includes('exists') || error.message?.includes('CAT_014')) {
          console.log(chalk.gray(`  • Folder exists: ${folder.name} (using existing)`));
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

  // Removed duplicate - using the one at line 589

  /**
   * Create Commits list with specific statuses
   */
  private async createCommitsList(): Promise<ClickUpList> {
    // Create list without custom statuses first
    const list = await this.api.createList(this.config.spaceId!, {
      name: 'Commits',
      content: 'Git commit tracking'
    });

    // Note: Custom statuses must be added manually in ClickUp UI
    // The API doesn't support adding custom statuses to lists
    logger.info('Note: Add custom statuses (development, error, prototype, production) manually in ClickUp');
    
    return list;
  }

  /**
   * Create Tasks list with specific statuses
   */
  private async createTasksList(): Promise<ClickUpList> {
    // Create list first (don't include status field at all)
    const list = await this.api.createList(this.config.spaceId!, {
      name: 'Tasks',
      content: 'Task and goal management'
      // Note: 'status' field is for list color, not task statuses
    });

    // Try to create custom statuses for the list
    // Note: This requires creating statuses separately via the status API
    try {
      await this.createListStatuses(list.id);
    } catch (e) {
      logger.info('Note: Add custom statuses (to do, in progress, completed) manually in ClickUp');
    }
    
    return list;
  }

  /**
   * Create custom statuses for a list
   */
  private async createListStatuses(_listId: string): Promise<void> {
    // The ClickUp API for creating custom statuses is limited
    // Statuses are typically inherited from the space
    // Lists will use the default space statuses
    
    // Note: The actual API endpoint for creating statuses is not publicly documented
    // or requires specific permissions. Lists typically inherit space statuses.
    logger.info('Custom statuses should be configured in ClickUp UI for best results');
  }

  /**
   * Save configuration to project
   */
  private async saveProjectConfig(): Promise<void> {
    // Also copy the status setup guide
    await this.copyStatusGuide();
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
      userId: this.config.userId,
      autoAssign: true,
      workspace: {
        id: this.config.workspaceId,
        name: this.config.workspaceName || 'Active Workspace'
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
   * Copy status setup guide to project
   */
  private async copyStatusGuide(): Promise<void> {
    try {
      const projectRoot = process.cwd();
      const claudeDir = path.join(projectRoot, '.claude');
      const clickupDir = path.join(claudeDir, 'clickup');
      
      // Ensure directory exists
      if (!fs.existsSync(clickupDir)) {
        fs.mkdirSync(clickupDir, { recursive: true });
      }
      
      // Copy the status guide
      const guidePath = path.join(clickupDir, 'STATUS_SETUP_GUIDE.md');
      
      // Try to find the template
      let templateContent = `# Status Setup Guide

Please configure your ClickUp lists with custom statuses:

## Tasks List Statuses:
- TO DO (gray)
- FUTURE (blue) 
- IN PROGRESS (yellow)
- FIXING (orange)
- COMPLETED (green)

## Commits List Statuses:
- development update (gray)
- development push (blue)
- upstream merge (purple)
- merged (green)
- production/testing (yellow)
- production/staging (orange)
- production/final (green)

See the full guide at: https://github.com/hellocory/clickmongrel/docs/STATUS_SETUP.md
`;
      
      // Try to read the actual template if it exists
      try {
        const actualTemplatePath = path.join(__dirname, '..', 'templates', 'STATUS_SETUP_GUIDE.md');
        if (fs.existsSync(actualTemplatePath)) {
          templateContent = fs.readFileSync(actualTemplatePath, 'utf-8');
        }
      } catch (e) {
        // Use default content
      }
      
      fs.writeFileSync(guidePath, templateContent);
      console.log(chalk.green('✓ Status setup guide saved to: .claude/clickup/STATUS_SETUP_GUIDE.md'));
      console.log(chalk.yellow('\n⚠️  IMPORTANT: Read STATUS_SETUP_GUIDE.md to configure ClickUp statuses!'));
    } catch (error) {
      console.log(chalk.yellow('Could not copy status guide'));
    }
  }

  /**
   * Create a new space with custom name
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
        time_tracking: { enabled: true },
        tags: { enabled: true },
        time_estimates: { enabled: true },
        checklists: { enabled: true },
        custom_fields: { enabled: true },
        remap_dependencies: { enabled: false },
        dependency_warning: { enabled: true },
        portfolios: { enabled: true }
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
   * Create the default Agentic Development space
   */
  private async createAgenticSpace(): Promise<ClickUpSpace> {
    if (!this.config.workspaceId) {
      throw new Error('No workspace ID available');
    }
    return this.createSpace(this.config.workspaceId, 'Agentic Development');
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
    
    console.log(chalk.red.bold('\n⚠️  CRITICAL: Configure ClickUp Statuses!'));
    console.log(chalk.red('The system will NOT work until you configure custom statuses.'));
    console.log('');
    console.log(chalk.yellow('Required steps:'));
    console.log(chalk.yellow('1. Open .claude/clickup/STATUS_SETUP_GUIDE.md'));
    console.log(chalk.yellow('2. Go to ClickUp and configure custom statuses for both lists'));
    console.log(chalk.yellow('3. Run: clickmongrel check-statuses (to verify)'));
    console.log('');
    console.log(chalk.red.bold('Without proper statuses:'));
    console.log(chalk.red('  ❌ Task syncing will fail'));
    console.log(chalk.red('  ❌ Commit tracking will fail'));
    console.log(chalk.red('  ❌ All operations will be blocked'));
  }
}

// CLI interface
if (process.argv[1]?.endsWith('quick-setup.ts') || process.argv[1]?.endsWith('quick-setup.js')) {
  const args = process.argv.slice(2);
  
  // Parse arguments - support both positional and named arguments
  let apiKey = process.env.CLICKUP_API_KEY;
  let workspaceName: string | undefined;
  let spaceName: string | undefined;
  let spaceId: string | undefined;
  let folderId: string | undefined;
  
  // Check for positional arguments first (for backward compatibility)
  // Format: quick-setup.js "workspace name" "project name" "list name" ...
  if (args.length > 0 && !args[0]?.startsWith('--')) {
    workspaceName = args[0]; // First positional arg is workspace name
    // Skip other positional args for now
  } else {
    // Parse named arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--api-key' && args[i + 1]) {
        apiKey = args[i + 1];
        i++;
      } else if (args[i] === '--workspace' && args[i + 1]) {
        workspaceName = args[i + 1];
        i++;
      } else if (args[i] === '--space-name' && args[i + 1]) {
        spaceName = args[i + 1];
        i++;
      } else if (args[i] === '--space' && args[i + 1]) {
        spaceId = args[i + 1];
        i++;
      } else if (args[i] === '--folder' && args[i + 1]) {
        folderId = args[i + 1];
        i++;
      }
    }
  }
  
  if (!apiKey) {
    console.error(chalk.red('Error: API key required'));
    console.log('Usage: clickmongrel quick-setup [workspace-name] OR');
    console.log('       clickmongrel quick-setup --api-key <key> [--workspace <name>] [--space-name <name>] [--space <id>] [--folder <id>]');
    process.exit(1);
  }
  
  const setup = new QuickSetup(apiKey, workspaceName, spaceName, spaceId, folderId);
  setup.setup().catch(error => {
    console.error(chalk.red('Setup failed:'), error);
    process.exit(1);
  });
}

export default QuickSetup;