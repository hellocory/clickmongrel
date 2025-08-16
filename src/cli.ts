#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import init from './init.js';
import configManager from './config/index.js';
import ClickUpAPI from './utils/clickup-api.js';
import SyncHandler from './handlers/sync.js';
import GoalHandler from './handlers/goals.js';
import ReportHandler from './handlers/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

// Load package.json for version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
);

program
  .name('clickmongrel')
  .description('ClickUp Integration MCP Server - CLI Tool')
  .version(packageJson.version);

// Init command
program
  .command('init')
  .description('Initialize ClickMongrel configuration')
  .action(async () => {
    await init();
  });

// Setup workspace command
program
  .command('setup')
  .description('Setup project with workspace selection and folder structure')
  .action(async () => {
    const { default: ProjectSetup } = await import('./project-setup.js');
    const setup = new ProjectSetup();
    await setup.run();
  });

// Initialize ClickUp structure command
program
  .command('init-clickup')
  .description('Initialize complete Agentic Development structure in ClickUp')
  .action(async () => {
    const { default: ClickUpInitializer } = await import('./clickup-init.js');
    const apiKey = configManager.getApiKey() || process.env.CLICKUP_API_KEY;
    if (!apiKey) {
      console.log(chalk.red('Error: API key required'));
      console.log('Use: --api-key <key> or set CLICKUP_API_KEY environment variable');
      process.exit(1);
    }
    const initializer = new ClickUpInitializer(apiKey);
    await initializer.run();
  });

// Quick setup command (AI-friendly)
program
  .command('quick-setup')
  .description('Quick AI-friendly setup with optional space/folder')
  .option('--api-key <key>', 'ClickUp API key')
  .option('--space <id>', 'Space ID to use')
  .option('--folder <id>', 'Folder ID to use as primary')
  .action(async (options) => {
    const { default: QuickSetup } = await import('./quick-setup.js');
    const apiKey = options.apiKey || configManager.getApiKey() || process.env.CLICKUP_API_KEY;
    
    if (!apiKey) {
      console.log(chalk.red('Error: API key required'));
      console.log('Use: --api-key <key> or set CLICKUP_API_KEY environment variable');
      process.exit(1);
    }
    
    const setup = new QuickSetup(apiKey, options.space, options.folder);
    await setup.setup();
  });

// AI setup command - the simplest interface
program
  .command('setup-clickup')
  .description('Setup ClickUp integration (AI-optimized)')
  .option('--api-key <key>', 'ClickUp API key')
  .option('--workspace-name <name>', 'Workspace name or ID')
  .option('--space-name <name>', 'Create new space with this name')
  .option('--space-id <id>', 'Use existing space ID')
  .action(async (options) => {
    const { default: AISetup } = await import('./ai-setup.js');
    
    try {
      const setup = new AISetup(options.apiKey);
      await setup.setup({
        workspaceName: options.workspaceName,
        spaceName: options.spaceName,
        spaceId: options.spaceId
      });
    } catch (error: any) {
      console.error(chalk.red('Setup failed:'), error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check sync status and configuration')
  .action(async () => {
    try {
      const config = configManager.getConfig();
      const apiKey = config.clickup.api_key;
      
      if (!apiKey) {
        console.log(chalk.red('Not configured. Run: clickmongrel init'));
        process.exit(1);
      }

      const syncHandler = new SyncHandler(apiKey);
      const status = syncHandler.getSyncStatus();

      console.log(chalk.cyan.bold('\n📊 ClickMongrel Status\n'));
      console.log(`Workspace: ${chalk.green(config.clickup.default_space || 'Not set')}`);
      console.log(`List: ${chalk.green(config.clickup.default_list || 'Not set')}`);
      console.log(`Sync Queue: ${chalk.yellow(status.queueSize)} items`);
      console.log(`Sync Active: ${status.inProgress ? chalk.green('Yes') : chalk.gray('No')}`);
      console.log(`Features:`);
      console.log(`  - Todo Sync: ${config.sync.todo_write_sync ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`  - Commit Tracking: ${config.sync.commit_tracking ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`  - Goal Tracking: ${config.goals.track_progress ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`  - Reports: ${config.reports.daily.enabled ? chalk.green('✓') : chalk.red('✗')}`);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Goal commands
program
  .command('goal')
  .description('Manage goals')
  .option('-c, --current', 'Show current goal')
  .option('-s, --switch <id>', 'Switch to different goal')
  .option('-p, --progress <percent>', 'Update goal progress')
  .option('-l, --list', 'List all goals')
  .action(async (options) => {
    try {
      const apiKey = configManager.getApiKey();
      if (!apiKey) {
        console.log(chalk.red('Not configured. Run: clickmongrel init'));
        process.exit(1);
      }

      const goalHandler = new GoalHandler(apiKey);
      await goalHandler.initialize();

      if (options.current) {
        const goal = await goalHandler.getCurrentGoal();
        if (goal) {
          console.log(chalk.cyan.bold('\n🎯 Current Goal\n'));
          console.log(`Name: ${chalk.green(goal.name)}`);
          console.log(`ID: ${chalk.gray(goal.id)}`);
          console.log(`Progress: ${chalk.yellow(goal.percent_completed + '%')}`);
          if (goal.description) {
            console.log(`Description: ${goal.description}`);
          }
        } else {
          console.log(chalk.yellow('No current goal set'));
        }
      } else if (options.switch) {
        const goal = await goalHandler.switchGoal(options.switch);
        console.log(chalk.green(`✓ Switched to goal: ${goal.name}`));
      } else if (options.progress) {
        const percent = parseInt(options.progress);
        if (isNaN(percent) || percent < 0 || percent > 100) {
          console.log(chalk.red('Progress must be between 0 and 100'));
          process.exit(1);
        }
        await goalHandler.updateProgress(percent);
        console.log(chalk.green(`✓ Updated progress to ${percent}%`));
      } else if (options.list) {
        const goals = await goalHandler.listGoals();
        console.log(chalk.cyan.bold('\n📋 All Goals\n'));
        goals.forEach(goal => {
          console.log(`• ${goal.name} (${goal.percent_completed}%) - ${chalk.gray(goal.id)}`);
        });
      } else {
        program.help();
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Report command
program
  .command('report <type>')
  .description('Generate a report (daily or weekly)')
  .action(async (type) => {
    try {
      if (type !== 'daily' && type !== 'weekly') {
        console.log(chalk.red('Type must be "daily" or "weekly"'));
        process.exit(1);
      }

      const apiKey = configManager.getApiKey();
      if (!apiKey) {
        console.log(chalk.red('Not configured. Run: clickmongrel init'));
        process.exit(1);
      }

      const reportHandler = new ReportHandler(apiKey);
      console.log(chalk.yellow(`Generating ${type} report...`));
      
      const report = await reportHandler.generateReport(type as 'daily' | 'weekly');
      console.log(chalk.green(`\n✓ Report generated:\n`));
      console.log(report);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Force synchronization with ClickUp')
  .action(async () => {
    try {
      const apiKey = configManager.getApiKey();
      if (!apiKey) {
        console.log(chalk.red('Not configured. Run: clickmongrel init'));
        process.exit(1);
      }

      const syncHandler = new SyncHandler(apiKey);
      await syncHandler.initialize();
      
      console.log(chalk.yellow('Forcing synchronization...'));
      await syncHandler.forceSync();
      console.log(chalk.green('✓ Synchronization complete'));
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Show current configuration')
  .option('-p, --path', 'Show configuration file paths')
  .action((options) => {
    if (options.path) {
      console.log(chalk.cyan.bold('\n📁 Configuration Paths\n'));
      console.log(`Main Config: ${chalk.gray(path.join(__dirname, '../config/default.json'))}`);
      console.log(`Status Config: ${chalk.gray(path.join(__dirname, '../config/statuses.json'))}`);
      console.log(`Hooks Config: ${chalk.gray(path.join(__dirname, '../.claude/settings.json'))}`);
    } else {
      const config = configManager.getConfig();
      console.log(chalk.cyan.bold('\n⚙️  Configuration\n'));
      console.log(JSON.stringify(config, null, 2));
    }
  });

// Commit tracking commands
program
  .command('commit <action>')
  .description('Track git commits in ClickUp')
  .option('--hash <hash>', 'Commit hash')
  .option('--branch <branch>', 'Branch name')
  .option('--status <status>', 'New status')
  .option('--message <message>', 'Commit message')
  .action(async (action, options) => {
    try {
      const apiKey = configManager.getApiKey();
      if (!apiKey) {
        console.log(chalk.red('Not configured. Run: clickmongrel init'));
        process.exit(1);
      }

      const { default: CommitHandler } = await import('./handlers/commits.js');
      const commitHandler = new CommitHandler(apiKey);

      switch (action) {
        case 'track':
          if (!options.hash) {
            // Get latest commit hash
            const { execSync } = await import('child_process');
            options.hash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
          }
          
          const { execSync: exec } = await import('child_process');
          const commit = {
            hash: options.hash,
            message: options.message || exec(`git log -1 --pretty=%B ${options.hash}`, { encoding: 'utf-8' }).trim(),
            author: exec(`git log -1 --pretty="%an <%ae>" ${options.hash}`, { encoding: 'utf-8' }).trim(),
            timestamp: new Date().toISOString()
          };
          
          await commitHandler.linkCommit(commit);
          console.log(chalk.green(`✓ Tracked commit ${options.hash.substring(0, 7)}`));
          break;
          
        case 'status':
          if (!options.hash) {
            console.log(chalk.red('Commit hash required: --hash <hash>'));
            process.exit(1);
          }
          
          const event = options.status === 'push' ? 'push' : 
                        options.status === 'merge' ? 'merge' :
                        options.status === 'revert' ? 'revert' :
                        options.status === 'deploy' ? 'deploy' : null;
                        
          if (!event) {
            console.log(chalk.red('Invalid status. Use: push, merge, revert, or deploy'));
            process.exit(1);
          }
          
          await commitHandler.updateCommitStatus(options.hash, event, { branch: options.branch });
          console.log(chalk.green(`✓ Updated commit status to ${options.status}`));
          break;
          
        default:
          console.log(chalk.red(`Unknown action: ${action}`));
          console.log('Use: track or status');
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Test ClickUp connection')
  .action(async () => {
    try {
      const apiKey = configManager.getApiKey();
      if (!apiKey) {
        console.log(chalk.red('Not configured. Run: clickmongrel init'));
        process.exit(1);
      }

      console.log(chalk.yellow('Testing ClickUp connection...'));
      const api = new ClickUpAPI(apiKey);
      const user = await api.getCurrentUser();
      
      console.log(chalk.green('✓ Connection successful!'));
      console.log(`Connected as: ${user.username} (${user.email})`);
      
      const teams = await api.getTeams();
      console.log(`Workspaces: ${teams.map(t => t.name).join(', ')}`);
    } catch (error) {
      console.error(chalk.red('✗ Connection failed:'), error);
      process.exit(1);
    }
  });

program.parse();