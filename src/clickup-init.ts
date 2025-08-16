#!/usr/bin/env node
import chalk from 'chalk';
import ClickUpAPI from './utils/clickup-api.js';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { ClickUpTeam, ClickUpSpace, ClickUpFolder, ClickUpList } from './types/index.js';

/**
 * Complete ClickUp workspace initialization
 * Creates the Agentic Development space with all required structure
 */
class ClickUpInitializer {
  private api: ClickUpAPI;
  private selectedWorkspace: ClickUpTeam | null = null;
  private agenticSpace: ClickUpSpace | null = null;
  private createdStructure: {
    folders: ClickUpFolder[];
    lists: ClickUpList[];
  } = { folders: [], lists: [] };

  constructor(apiKey: string) {
    this.api = new ClickUpAPI(apiKey);
  }

  async run(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 ClickUp Agentic Development Setup\n'));
    console.log(chalk.yellow('This will create the complete structure in your ClickUp workspace.\n'));

    try {
      // Step 1: Select workspace
      await this.selectWorkspace();

      // Step 2: Check for existing Agentic Development space
      const existingSpace = await this.checkExistingSpace();
      
      if (existingSpace) {
        const { useExisting } = await inquirer.prompt([{
          type: 'confirm',
          name: 'useExisting',
          message: `Found existing "${existingSpace.name}" space. Use it?`,
          default: true
        }]);

        if (useExisting) {
          this.agenticSpace = existingSpace;
          console.log(chalk.green(`✓ Using existing space: ${existingSpace.name}`));
        } else {
          await this.createAgenticSpace();
        }
      } else {
        await this.createAgenticSpace();
      }

      // Step 3: Create folder structure
      await this.createFolders();

      // Step 4: Create lists with custom statuses
      await this.createLists();

      // Step 5: Save configuration
      await this.saveConfiguration();

      // Step 6: Display summary
      this.displaySummary();

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

    if (teams.length === 1) {
      const workspace = teams[0];
      if (!workspace) {
        throw new Error('Invalid workspace data');
      }
      this.selectedWorkspace = workspace;
      console.log(chalk.green(`✓ Using workspace: ${workspace.name}`));
    } else {
      const { selected } = await inquirer.prompt([{
        type: 'list',
        name: 'selected',
        message: 'Select your workspace:',
        choices: teams.map(t => ({ 
          name: t.name, 
          value: t 
        }))
      }]);
      this.selectedWorkspace = selected;
      console.log(chalk.green(`✓ Selected workspace: ${this.selectedWorkspace!.name}`));
    }
  }

  private async checkExistingSpace(): Promise<ClickUpSpace | null> {
    console.log(chalk.yellow('\nChecking for existing Agentic Development space...'));
    if (!this.selectedWorkspace) {
      throw new Error('No workspace selected');
    }
    const spaces = await this.api.getSpaces(this.selectedWorkspace.id);
    
    const found = spaces.find(s => 
      s.name === 'Agentic Development' || 
      s.name.toLowerCase().includes('agentic')
    );
    return found || null;
  }

  private async createAgenticSpace(): Promise<void> {
    console.log(chalk.cyan('\n📦 Creating Agentic Development space...'));
    
    try {
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
          time_tracking: { enabled: true },
          tags: { enabled: true },
          time_estimates: { enabled: true },
          checklists: { enabled: true },
          custom_fields: { enabled: true },
          remap_dependencies: { enabled: true },
          dependency_warning: { enabled: true },
          portfolios: { enabled: true },
          milestones: { enabled: false }
        }
      };

      const response = await this.api.makeRequest(
        `/team/${this.selectedWorkspace ? this.selectedWorkspace.id : ''}/space`,
        'POST',
        spaceData
      );

      this.agenticSpace = response;
      console.log(chalk.green(`✓ Created space: ${this.agenticSpace?.name || 'Agentic Development'}`));
      
      // Wait a moment for ClickUp to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(chalk.yellow('Space already exists, fetching...'));
        const space = await this.checkExistingSpace();
        if (!space) {
          throw new Error('Could not find Agentic Development space after claiming it exists');
        }
        this.agenticSpace = space;
      } else {
        throw error;
      }
    }
  }

  private async createFolders(): Promise<void> {
    console.log(chalk.cyan('\n📁 Creating folder structure...'));
    
    const folders = [
      { name: 'Weekly Reports', description: 'Weekly development reports and summaries' },
      { name: 'Daily Reports', description: 'Daily standup reports and progress updates' },
      { name: 'Docs', description: 'Documentation for context and memories' }
    ];

    for (const folder of folders) {
      try {
        console.log(chalk.gray(`  Creating folder: ${folder.name}...`));
        
        const response = await this.api.makeRequest(
          `/space/${this.agenticSpace!.id}/folder`,
          'POST',
          folder
        );
        
        this.createdStructure.folders.push(response);
        console.log(chalk.green(`  ✓ Created folder: ${folder.name}`));
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(chalk.yellow(`  • Folder already exists: ${folder.name}`));
        } else {
          console.error(chalk.red(`  ✗ Failed to create folder ${folder.name}:`), error.message);
        }
      }
    }
  }

  private async createLists(): Promise<void> {
    console.log(chalk.cyan('\n📋 Creating lists with custom statuses...'));
    
    const lists = [
      {
        name: 'Commits',
        description: 'Git commit tracking',
        statuses: [
          { status: 'development', color: '#87909e', orderindex: 0 },
          { status: 'error', color: '#ff5733', orderindex: 1 },
          { status: 'prototype', color: '#ffab00', orderindex: 2 },
          { status: 'production', color: '#02c852', orderindex: 3 }
        ]
      },
      {
        name: 'Tasks',
        description: 'Goal and task management',
        statuses: [
          { status: 'to do', color: '#87909e', orderindex: 0 },
          { status: 'future', color: '#4194f6', orderindex: 1 },
          { status: 'in progress', color: '#ffab00', orderindex: 2 },
          { status: 'fixing', color: '#ff8c00', orderindex: 3 },
          { status: 'completed', color: '#02c852', orderindex: 4 }
        ]
      }
    ];

    // First, try to create in a folder if we have one
    const targetFolderId = this.createdStructure.folders[0]?.id;
    
    for (const list of lists) {
      try {
        console.log(chalk.gray(`  Creating list: ${list.name}...`));
        
        const listData = {
          name: list.name,
          content: list.description,
          status: list.statuses.map(s => ({
            ...s,
            type: 'custom'
          }))
        };

        // Determine endpoint based on whether we have a folder
        const endpoint = targetFolderId 
          ? `/folder/${targetFolderId}/list`
          : `/space/${this.agenticSpace!.id}/list`;
        
        const response = await this.api.makeRequest(endpoint, 'POST', listData);
        
        this.createdStructure.lists.push(response);
        console.log(chalk.green(`  ✓ Created list: ${list.name}`));
        
        // Log the statuses
        list.statuses.forEach(s => {
          console.log(chalk.gray(`    • Status: ${s.status} (${s.color})`));
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(chalk.yellow(`  • List already exists: ${list.name}`));
          // Try to get the existing list
          try {
            const lists = await this.api.getLists(this.agenticSpace!.id);
            const existingList = lists.find(l => l.name === list.name);
            if (existingList) {
              this.createdStructure.lists.push(existingList);
            }
          } catch (e) {
            console.error(chalk.red(`  ✗ Could not fetch existing list: ${list.name}`));
          }
        } else {
          console.error(chalk.red(`  ✗ Failed to create list ${list.name}:`), error.message);
        }
      }
    }
  }

  private async saveConfiguration(): Promise<void> {
    console.log(chalk.cyan('\n💾 Saving configuration...'));
    
    const projectRoot = process.cwd();
    const claudeDir = path.join(projectRoot, '.claude');
    const clickupDir = path.join(claudeDir, 'clickup');
    
    // Ensure directories exist
    if (!fs.existsSync(clickupDir)) {
      fs.mkdirSync(clickupDir, { recursive: true });
    }
    
    // Find the specific lists
    const commitsList = this.createdStructure.lists.find(l => l.name === 'Commits');
    const tasksList = this.createdStructure.lists.find(l => l.name === 'Tasks');
    
    const config = {
      workspace: {
        id: this.selectedWorkspace!.id,
        name: this.selectedWorkspace!.name
      },
      space: {
        id: this.agenticSpace!.id,
        name: this.agenticSpace!.name
      },
      structure: {
        folders: this.createdStructure.folders.map(f => ({
          id: f.id,
          name: f.name
        })),
        lists: {
          commits: commitsList ? {
            id: commitsList.id,
            name: commitsList.name,
            statuses: commitsList.statuses || []
          } : null,
          tasks: tasksList ? {
            id: tasksList.id,
            name: tasksList.name,
            statuses: tasksList.statuses || []
          } : null
        }
      },
      initialized: new Date().toISOString()
    };
    
    const configPath = path.join(clickupDir, 'workspace-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(chalk.green(`✓ Configuration saved to: ${path.relative(projectRoot, configPath)}`));
  }

  private displaySummary(): void {
    console.log(chalk.green.bold('\n✅ ClickUp Structure Created Successfully!\n'));
    
    console.log(chalk.cyan('📊 Summary:'));
    console.log(`  • Workspace: ${this.selectedWorkspace!.name}`);
    console.log(`  • Space: ${this.agenticSpace!.name}`);
    
    if (this.createdStructure.folders.length > 0) {
      console.log(chalk.cyan('\n📁 Folders:'));
      this.createdStructure.folders.forEach(f => {
        console.log(`  • ${f.name}`);
      });
    }
    
    if (this.createdStructure.lists.length > 0) {
      console.log(chalk.cyan('\n📋 Lists:'));
      this.createdStructure.lists.forEach(l => {
        console.log(`  • ${l.name} (${l.statuses?.length || 0} statuses)`);
      });
    }
    
    console.log(chalk.yellow('\n🎯 Next Steps:'));
    console.log('1. The structure is now ready in ClickUp');
    console.log('2. TodoWrite will sync to the Tasks list');
    console.log('3. Git commits will be tracked in the Commits list');
    console.log('4. Reports will be created in their respective folders');
    console.log('5. Run "clickmongrel test" to verify the connection');
  }
}

// Export for use in other modules
export default ClickUpInitializer;

// Run if called directly
if (process.argv[1]?.endsWith('clickup-init.ts') || process.argv[1]?.endsWith('clickup-init.js')) {
  const apiKey = process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('Error: CLICKUP_API_KEY environment variable is required'));
    process.exit(1);
  }
  const initializer = new ClickUpInitializer(apiKey);
  initializer.run().catch(console.error);
}