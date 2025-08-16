import { CommitInfo } from '../types/index.js';
import ClickUpAPI from '../utils/clickup-api.js';
import TaskHandler from './tasks.js';
import GoalHandler from './goals.js';
import logger from '../utils/logger.js';
import { StatusValidator } from '../utils/status-validator.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CommitTemplate {
  title: string;
  body: string;
}

interface CommitTemplates {
  templates: Record<string, CommitTemplate>;
  typeMapping: Record<string, string>;
  defaultTemplate: string;
  parsePattern: string;
}

export class CommitHandler {
  private api: ClickUpAPI;
  private taskHandler: TaskHandler;
  private goalHandler: GoalHandler;
  private commitsListId: string | null = null;
  private statusValidator: StatusValidator;
  private statusesValidated: boolean = false;
  private templates!: CommitTemplates;
  
  // Status lifecycle mapping - MUST match ClickUp statuses exactly (lowercase)
  private statusLifecycle = {
    'comitted': { order: 1, branch: ['local'] },
    'developing': { order: 2, branch: ['feature/', 'dev', 'develop'] },
    'prototyping': { order: 3, branch: ['staging', 'test', 'qa'] },
    'rejected': { order: 4, branch: ['hotfix/', 'revert-'] },
    'production/testing': { order: 5, branch: ['canary', 'prod-test'] },
    'production/final': { order: 6, branch: ['main', 'master', 'production'] }
  };

  constructor(apiKey: string) {
    this.api = new ClickUpAPI(apiKey);
    this.taskHandler = new TaskHandler(apiKey);
    this.goalHandler = new GoalHandler(apiKey);
    this.statusValidator = new StatusValidator(apiKey);
    this.loadCommitsListId();
    this.loadTemplates();
  }
  
  async initialize(): Promise<void> {
    // Validate statuses if commits list is configured
    if (this.commitsListId && !this.statusesValidated) {
      try {
        await this.statusValidator.validateListStatuses(this.commitsListId, 'commits');
        this.statusesValidated = true;
        logger.info('Commit handler initialized with validated statuses');
      } catch (error: any) {
        logger.error('Commit handler initialization failed - status validation error');
        throw error;
      }
    }
  }
  
  private loadTemplates(): void {
    try {
      // Try project-specific templates first
      const projectTemplatePath = path.join(process.cwd(), '.claude/clickup/templates/commit-templates.json');
      if (fs.existsSync(projectTemplatePath)) {
        this.templates = JSON.parse(fs.readFileSync(projectTemplatePath, 'utf-8'));
        logger.info('Loaded project commit templates');
        return;
      }
      
      // Fallback to default templates in MCP installation
      const defaultTemplatePath = path.join(__dirname, '../../.claude/clickup/templates/commit-templates.json');
      if (fs.existsSync(defaultTemplatePath)) {
        this.templates = JSON.parse(fs.readFileSync(defaultTemplatePath, 'utf-8'));
        logger.info('Loaded default commit templates');
      } else {
        // Default templates if file doesn't exist
        this.templates = {
          templates: {
            default: {
              title: '[COMMIT] {type}: {description}',
              body: '## Commit Details\n\n**Hash:** `{hash}`\n**Author:** {author}\n**Timestamp:** {timestamp}\n\n{raw_message}'
            }
          },
          typeMapping: {
            feat: '✨ Feature',
            fix: '🐛 Fix',
            docs: '📚 Documentation',
            test: '✅ Test',
            chore: '🔧 Chore'
          },
          defaultTemplate: 'default',
          parsePattern: '^(?<type>\\w+)(?:\\((?<scope>[^)]+)\\))?:\\s+(?<description>.+)$'
        };
      }
    } catch (error) {
      logger.warn('Could not load commit templates, using defaults');
    }
  }
  
  private loadCommitsListId(): void {
    try {
      // Try to load from project config
      const configPath = path.join(process.cwd(), '.claude', 'clickup', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.commitsListId = config.lists?.commits || null;
      }
      
      // Fallback to known Commits list ID
      if (!this.commitsListId) {
        this.commitsListId = '901317936118'; // Known Commits list in Ghost Codes workspace
        logger.info('Using default Commits list ID: 901317936118');
      }
    } catch (error) {
      logger.warn('Could not load commits list ID from config, using default');
      this.commitsListId = '901317936118';
    }
  }

  async linkCommit(commit: CommitInfo): Promise<void> {
    try {
      // Validate statuses before allowing any commit tracking
      if (this.commitsListId && !this.statusesValidated) {
        try {
          await this.statusValidator.validateListStatuses(this.commitsListId, 'commits');
          this.statusesValidated = true;
          logger.info('Commit status validation passed - proceeding with tracking');
        } catch (error: any) {
          // Status validation failed - cannot proceed
          logger.error('Commit status validation failed - cannot track commits');
          throw error;
        }
      }
      
      // Create a task in the Commits list for tracking
      if (this.commitsListId) {
        await this.trackCommitAsTask(commit);
      }
      
      // Also try to link to existing task if found
      let taskId = commit.task_id;

      if (!taskId) {
        // Try to get from current task
        taskId = this.taskHandler.getCurrentTaskId();
      }

      if (!taskId) {
        // Try to extract from commit message (e.g., [TASK-123] or #123)
        const taskMatch = commit.message.match(/\[TASK-(\w+)\]|#(\w+)/);
        if (taskMatch) {
          taskId = taskMatch[1] || taskMatch[2];
        }
      }

      if (taskId) {
        // Link the commit to the task
        await this.api.linkCommitToTask(taskId, commit);
        logger.info(`Linked commit ${commit.hash} to task ${taskId}`);
      }

      // Add to goal tracking if applicable
      await this.trackCommitForGoal(commit);
    } catch (error) {
      logger.error('Failed to link commit:', error);
      throw error;
    }
  }
  
  /**
   * Track commit as a task in the Commits list with lifecycle status
   */
  async trackCommitAsTask(commit: CommitInfo): Promise<void> {
    if (!this.commitsListId) {
      logger.warn('No commits list configured');
      return;
    }
    
    // Ensure statuses are validated
    if (!this.statusesValidated) {
      try {
        await this.statusValidator.validateListStatuses(this.commitsListId, 'commits');
        this.statusesValidated = true;
      } catch (error: any) {
        logger.error('Cannot track commit - status validation failed');
        throw error;
      }
    }
    
    try {
      // Get current branch
      const branch = this.getCurrentBranch();
      const status = this.getStatusForBranch(branch);
      
      // Parse commit message (now handled by formatWithTemplate)
      
      // Format using template
      const { title, body } = this.formatWithTemplate(commit, branch);
      const taskName = title;
      const taskDescription = body;
      
      // Add branch tag to description since tags aren't supported in createTask
      const fullDescription = `${taskDescription}\n\n**Branch Tag:** ${this.formatBranchTag(branch)}`;
      
      const task = await this.api.createTask(this.commitsListId, {
        name: taskName,
        description: fullDescription,
        status
      } as any);
      
      logger.info(`Created commit task: ${taskName} (${task.id}) with status: ${status}`);
      
      // Store task ID for future reference
      this.storeCommitTaskMapping(commit.hash, task.id);
    } catch (error) {
      logger.error(`Failed to track commit as task: ${error}`);
    }
  }
  
  /**
   * Update commit task status based on git events
   */
  async updateCommitStatus(commitHash: string, event: 'push' | 'merge' | 'revert' | 'deploy', data?: any): Promise<void> {
    try {
      const taskId = await this.getCommitTaskId(commitHash);
      if (!taskId) {
        logger.warn(`No task found for commit ${commitHash}`);
        return;
      }
      
      let newStatus: string;
      
      switch (event) {
        case 'push':
          newStatus = 'developing';
          break;
        case 'merge':
          newStatus = this.getStatusForBranch(data?.targetBranch || 'unknown');
          break;
        case 'revert':
          newStatus = 'rejected';
          break;
        case 'deploy':
          newStatus = data?.environment === 'production' ? 'production/testing' : 'prototyping';
          break;
        default:
          return;
      }
      
      await this.api.updateTask(taskId, { 
        status: { status: newStatus, color: '#87909e', orderindex: 0, type: 'custom', id: newStatus } as any
      } as any);
      logger.info(`Updated commit ${commitHash} to status: ${newStatus}`);
    } catch (error) {
      logger.error(`Failed to update commit status: ${error}`);
    }
  }
  
  private getCurrentBranch(): string {
    try {
      return execSync('git branch --show-current', { encoding: 'utf-8' }).trim() || 'local';
    } catch {
      return 'local';
    }
  }
  
  private getStatusForBranch(branch: string): string {
    for (const [status, config] of Object.entries(this.statusLifecycle)) {
      for (const pattern of config.branch) {
        if (branch === pattern || branch.startsWith(pattern)) {
          return status;
        }
      }
    }
    return 'comitted'; // Note: ClickUp has typo in their status name
  }
  
  // Replaced by parseCommitMessageDetailed
  // private parseCommitMessage(message: string): { type: string; description: string } {
  //   const match = message.match(/^(\w+)(?:\([^)]+\))?:\s*(.+)/);
  //   if (match) {
  //     return { type: match[1] || 'commit', description: match[2] || message };
  //   }
  //   const desc = message.substring(0, 50);
  //   return { type: 'commit', description: desc };
  // }
  
  private formatBranchTag(branch: string): string {
    if (branch === 'main' || branch === 'master' || branch === 'production') {
      return `prod:${branch}`;
    }
    if (branch.includes('staging') || branch.includes('test')) {
      return `staging:${branch}`;
    }
    if (branch.startsWith('hotfix/') || branch.startsWith('revert-')) {
      return `fix:${branch}`;
    }
    return `dev:${branch}`;
  }
  
  private formatWithTemplate(commit: CommitInfo, branch?: string): { title: string; body: string } {
    const templateName = this.templates?.defaultTemplate || 'default';
    const template = this.templates?.templates?.[templateName] || this.templates?.templates?.default || {
      title: '[COMMIT] {type}: {description}',
      body: '## Commit Details\n\n**Hash:** `{hash}`\n**Author:** {author}\n**Timestamp:** {timestamp}\n\n{raw_message}'
    };
    
    const { type, description, scope } = this.parseCommitMessageDetailed(commit.message);
    const shortHash = commit.hash.substring(0, 7);
    const currentBranch = branch || this.getCurrentBranch();
    
    // Get mapped type with emoji if available
    const mappedType = this.templates.typeMapping[type] || type;
    
    // Replace variables in template
    const replacements: Record<string, string> = {
      type: mappedType,
      description,
      scope: scope || 'general',
      hash: commit.hash,
      hash_short: shortHash,
      author: commit.author || 'Unknown',
      timestamp: commit.timestamp || new Date().toISOString(),
      branch: currentBranch,
      raw_message: commit.message,
      changes: commit.changes || 'No changes tracked',
      files: commit.files?.join('\n') || 'No files tracked'
    };
    
    const title = this.replaceTemplateVars(template.title, replacements);
    const body = this.replaceTemplateVars(template.body, replacements);
    
    return { title, body };
  }
  
  private parseCommitMessageDetailed(message: string): { type: string; scope?: string; description: string } {
    const pattern = new RegExp(this.templates.parsePattern);
    const match = message.match(pattern);
    
    if (match && match.groups) {
      return {
        type: match.groups.type || 'commit',
        scope: match.groups.scope,
        description: match.groups.description || message
      };
    }
    
    // Fallback to simple parsing
    const simpleMatch = message.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)/);
    if (simpleMatch) {
      return {
        type: simpleMatch[1] || 'commit',
        scope: simpleMatch[2],
        description: simpleMatch[3] || message
      };
    }
    
    return { type: 'commit', description: message };
  }
  
  private replaceTemplateVars(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key] || match;
    });
  }
  
  // Legacy format method - kept for reference but replaced by formatWithTemplate
  /*
  private formatCommitDescription(commit: CommitInfo, branch: string): string {
    return `## Commit Details
**Hash:** \`${commit.hash}\`
**Branch:** \`${branch}\`
**Author:** ${commit.author || 'Unknown'}
**Timestamp:** ${commit.timestamp || new Date().toISOString()}

## Message
${commit.message}

## Lifecycle Status
Tracking this commit through:
1. COMMITTED → Local commit
2. DEVELOPING → Pushed to development
3. PROTOTYPING → Merged to staging
4. PRODUCTION/TESTING → Deployed to production
5. PRODUCTION/FINAL → Stable in production

---
*Tracked by ClickMongrel*`;
  }
  */
  
  private storeCommitTaskMapping(commitHash: string, taskId: string): void {
    // Store in a local cache file for now
    try {
      const cacheFile = path.join(process.cwd(), '.claude', 'clickup', 'cache', 'commit-tasks.json');
      let mappings: Record<string, string> = {};
      
      if (fs.existsSync(cacheFile)) {
        mappings = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      }
      
      mappings[commitHash] = taskId;
      
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(mappings, null, 2));
    } catch (error) {
      logger.warn(`Could not store commit-task mapping: ${error}`);
    }
  }
  
  private async getCommitTaskId(commitHash: string): Promise<string | null> {
    try {
      const cacheFile = path.join(process.cwd(), '.claude', 'clickup', 'cache', 'commit-tasks.json');
      if (fs.existsSync(cacheFile)) {
        const mappings = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        return mappings[commitHash] || null;
      }
    } catch (error) {
      logger.warn(`Could not retrieve commit-task mapping: ${error}`);
    }
    return null;
  }

  private async trackCommitForGoal(_commit: CommitInfo): Promise<void> {
    try {
      const currentGoal = await this.goalHandler.getCurrentGoal();
      if (!currentGoal) return;

      // Add commit info as a comment on the goal
      // This could be enhanced to update custom fields or metrics
      // Note: ClickUp API doesn't have direct goal comments, 
      // so we'd need to track this in a related task or custom field
      logger.info(`Tracked commit for goal: ${currentGoal.name}`);
    } catch (error) {
      logger.error('Failed to track commit for goal:', error);
    }
  }

  async getCommitHistory(taskId: string): Promise<CommitInfo[]> {
    // This would typically query a database or cache
    // For now, return empty array
    logger.info(`Getting commit history for task ${taskId}`);
    return [];
  }

  async createCommitReport(startDate: Date, endDate: Date): Promise<string> {
    try {
      // Generate a report of commits within date range
      const report = `# Commit Report\n\n` +
        `**Period:** ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n\n` +
        `## Summary\n` +
        `- Total Commits: 0\n` +
        `- Tasks Updated: 0\n` +
        `- Goals Impacted: 0\n\n` +
        `## Details\n` +
        `No commits found in this period.\n`;

      return report;
    } catch (error) {
      logger.error('Failed to create commit report:', error);
      throw error;
    }
  }

  async extractTaskFromMessage(message: string): Promise<string | undefined> {
    // Extract task ID from commit message patterns
    const patterns = [
      /\[TASK-(\w+)\]/,
      /#(\w+)/,
      /task[:\s]+(\w+)/i,
      /fixes[:\s]+(\w+)/i,
      /closes[:\s]+(\w+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }
}

export default CommitHandler;