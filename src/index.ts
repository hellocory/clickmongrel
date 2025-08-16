#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'url';
import path from 'path';
import configManager from './config/index.js';
import SyncHandler from './handlers/sync.js';
import GoalHandler from './handlers/goals.js';
import TaskHandler from './handlers/tasks.js';
import ReportHandler from './handlers/reports.js';
import CommitHandler from './handlers/commits.js';
import PlanHandler from './handlers/plans.js';
import WorkflowHandler from './handlers/workflow.js';
import logger from './utils/logger.js';
import { TodoItem, ClickUpGoal } from './types/index.js';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get API key from environment or configuration
const API_KEY = process.env.CLICKUP_API_KEY || configManager.getApiKey() || '';

class ClickMongrelServer {
  private server: Server;
  private syncHandler: SyncHandler;
  private goalHandler: GoalHandler;
  private taskHandler: TaskHandler;
  private reportHandler: ReportHandler;
  private commitHandler: CommitHandler;
  private planHandler: PlanHandler;
  private workflowHandler: WorkflowHandler;

  constructor() {
    this.server = new Server(
      {
        name: 'clickmongrel',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize handlers
    this.syncHandler = new SyncHandler(API_KEY);
    this.goalHandler = new GoalHandler(API_KEY);
    this.taskHandler = new TaskHandler(API_KEY);
    this.reportHandler = new ReportHandler(API_KEY);
    this.commitHandler = new CommitHandler(API_KEY);
    this.planHandler = new PlanHandler(API_KEY);
    this.workflowHandler = new WorkflowHandler(API_KEY);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'sync_todos',
          description: 'Sync TodoWrite items with ClickUp tasks',
          inputSchema: {
            type: 'object',
            properties: {
              todos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    content: { type: 'string' },
                    status: { 
                      type: 'string',
                      enum: ['pending', 'in_progress', 'completed']
                    }
                  },
                  required: ['id', 'content', 'status']
                }
              }
            },
            required: ['todos']
          }
        },
        // GOALS API DISABLED - Not using ClickUp Goals for now
        // {
        //   name: 'get_current_goal',
        //   description: 'Get the currently active goal',
        //   inputSchema: {
        //     type: 'object',
        //     properties: {}
        //   }
        // },
        // {
        //   name: 'switch_goal',
        //   description: 'Switch to a different goal',
        //   inputSchema: {
        //     type: 'object',
        //     properties: {
        //       goal_id: { type: 'string' }
        //     },
        //     required: ['goal_id']
        //   }
        // },
        // {
        //   name: 'update_goal_progress',
        //   description: 'Update progress for the current goal',
        //   inputSchema: {
        //     type: 'object',
        //     properties: {
        //       percent: { type: 'number', minimum: 0, maximum: 100 }
        //     },
        //     required: ['percent']
        //   }
        // },
        // {
        //   name: 'list_goals',
        //   description: 'List all available goals',
        //   inputSchema: {
        //     type: 'object',
        //     properties: {}
        //   }
        // },
        // {
        //   name: 'create_goal',
        //   description: 'Create a new goal',
        //   inputSchema: {
        //     type: 'object',
        //     properties: {
        //       name: { type: 'string' },
        //       description: { type: 'string' },
        //       percent_completed: { type: 'number', minimum: 0, maximum: 100 },
        //       color: { type: 'string' }
        //     },
        //     required: ['name']
        //   }
        // },
        {
          name: 'link_commit',
          description: 'Link a git commit to the current task',
          inputSchema: {
            type: 'object',
            properties: {
              hash: { type: 'string' },
              message: { type: 'string' },
              author: { type: 'string' },
              timestamp: { type: 'string' }
            },
            required: ['hash', 'message']
          }
        },
        {
          name: 'generate_report',
          description: 'Generate a daily or weekly report',
          inputSchema: {
            type: 'object',
            properties: {
              type: { 
                type: 'string',
                enum: ['daily', 'weekly']
              }
            },
            required: ['type']
          }
        },
        {
          name: 'get_sync_status',
          description: 'Get the current synchronization status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'validate_statuses',
          description: 'Validate that ClickUp custom statuses are properly configured. Use when user asks to "validate statuses" or "check statuses"',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'force_sync',
          description: 'Force immediate synchronization',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'add_attachment',
          description: 'Add an attachment (screenshot, file, etc.) to a ClickUp task',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string', description: 'ClickUp task ID or todo ID' },
              file_path: { type: 'string', description: 'Path to the file to attach' },
              file_name: { type: 'string', description: 'Optional custom name for the attachment' }
            },
            required: ['task_id', 'file_path']
          }
        },
        {
          name: 'get_task',
          description: 'Get details of a specific task',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string' }
            },
            required: ['task_id']
          }
        },
        {
          name: 'update_task_status',
          description: 'Update the status of a task',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              status: { type: 'string' }
            },
            required: ['task_id', 'status']
          }
        },
        {
          name: 'create_plan',
          description: 'Create a plan with goal and subtasks from TodoWrite items',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              todos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    content: { type: 'string' },
                    status: { type: 'string' }
                  },
                  required: ['id', 'content', 'status']
                }
              }
            },
            required: ['title', 'todos']
          }
        },
        {
          name: 'complete_plan_item',
          description: 'Mark a plan item as complete and create commit',
          inputSchema: {
            type: 'object',
            properties: {
              plan_id: { type: 'string' },
              item_id: { type: 'string' },
              commit_message: { type: 'string' }
            },
            required: ['plan_id', 'item_id']
          }
        },
        {
          name: 'get_plan_status',
          description: 'Get the status of a plan',
          inputSchema: {
            type: 'object',
            properties: {
              plan_id: { type: 'string' }
            },
            required: ['plan_id']
          }
        },
        {
          name: 'workflow_create_tasks',
          description: 'Create tasks with proper parent-subtask structure',
          inputSchema: {
            type: 'object',
            properties: {
              todos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    content: { type: 'string' },
                    status: { type: 'string' },
                    priority: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['id', 'content', 'status']
                }
              },
              parent_title: { type: 'string' }
            },
            required: ['todos']
          }
        },
        {
          name: 'workflow_complete_task',
          description: 'Complete a task with automatic commit and tracking',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              commit_message: { type: 'string' }
            },
            required: ['task_id']
          }
        },
        {
          name: 'initialize_clickup',
          description: 'Initialize ClickUp integration for this project. Use when user says "initialize clickup" or "setup clickup integration"',
          inputSchema: {
            type: 'object',
            properties: {
              workspace_name: { type: 'string', description: 'Name of your ClickUp workspace (e.g., "Ghost Codes Workspace")' },
              space_name: { type: 'string', description: 'Name of space to create or use (default: Project name)' },
              list_name: { type: 'string', description: 'Name of list for tasks (default: Tasks)' },
              enable_commits: { type: 'boolean', description: 'Enable commit tracking (default: true)' },
              enable_goals: { type: 'boolean', description: 'Enable goal tracking (default: true)' }
            },
            required: ['workspace_name']
          }
        },
        {
          name: 'setup',
          description: 'Quick setup - Initialize ClickUp for this project. Examples: "setup clickmongrel with ghost codes workspace" or "setup clickmongrel in ghost codes workspace in the test space"',
          inputSchema: {
            type: 'object',
            properties: {
              workspace: { type: 'string', description: 'Natural language describing workspace and optionally space. E.g., "ghost codes workspace" or "ghost codes workspace in the test space"' }
            },
            required: ['workspace']
          }
        }
      ]
    }));

    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'clickmongrel://goals/current',
          name: 'Current Goal',
          description: 'The currently active goal',
          mimeType: 'application/json'
        },
        {
          uri: 'clickmongrel://sync/status',
          name: 'Sync Status',
          description: 'Current synchronization status',
          mimeType: 'application/json'
        },
        {
          uri: 'clickmongrel://config',
          name: 'Configuration',
          description: 'Current configuration settings',
          mimeType: 'application/json'
        }
      ]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'clickmongrel://goals/current': {
          const goal = await this.goalHandler.getCurrentGoal();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(goal, null, 2)
            }]
          };
        }
        case 'clickmongrel://sync/status': {
          const status = this.syncHandler.getSyncStatus();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(status, null, 2)
            }]
          };
        }
        case 'clickmongrel://config': {
          const config = configManager.getConfig();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(config, null, 2)
            }]
          };
        }
        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
    });

    // Tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'sync_todos': {
            const todos = args?.todos as TodoItem[];
            await this.syncHandler.syncTodos(todos);
            return {
              content: [{
                type: 'text',
                text: `Synced ${todos.length} todos to ClickUp`
              }]
            };
          }

          case 'get_current_goal': {
            const goal = await this.goalHandler.getCurrentGoal();
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(goal, null, 2)
              }]
            };
          }

          case 'switch_goal': {
            const goalId = args?.goal_id as string;
            const goal = await this.goalHandler.switchGoal(goalId);
            return {
              content: [{
                type: 'text',
                text: `Switched to goal: ${goal.name} (${goal.percent_completed}% complete)`
              }]
            };
          }

          case 'update_goal_progress': {
            const percent = args?.percent as number;
            const currentGoalId = this.goalHandler.getCurrentGoalId();
            if (!currentGoalId) {
              throw new Error('No current goal set');
            }
            await this.goalHandler.updateGoalProgress(currentGoalId, percent);
            return {
              content: [{
                type: 'text',
                text: `Updated goal progress to ${percent}%`
              }]
            };
          }

          case 'list_goals': {
            await this.goalHandler.initialize();
            const goals = await this.goalHandler.getGoals();
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(goals, null, 2)
              }]
            };
          }

          case 'create_goal': {
            await this.goalHandler.initialize();
            const goal = await this.goalHandler.createGoal(args as Partial<ClickUpGoal>);
            return {
              content: [{
                type: 'text',
                text: `Created goal: ${goal.name} (ID: ${goal.id})`
              }]
            };
          }

          case 'link_commit': {
            const commit = args as any;
            await this.commitHandler.linkCommit(commit);
            return {
              content: [{
                type: 'text',
                text: `Linked commit ${commit.hash} to current task`
              }]
            };
          }

          case 'generate_report': {
            const type = args?.type as 'daily' | 'weekly';
            const report = await this.reportHandler.generateReport(type);
            return {
              content: [{
                type: 'text',
                text: report
              }]
            };
          }

          case 'get_sync_status': {
            const status = this.syncHandler.getSyncStatus();
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(status, null, 2)
              }]
            };
          }
          case 'validate_statuses': {
            try {
              // Import the status validator
              const { StatusValidator } = await import('./utils/status-validator.js');
              const validator = new StatusValidator(API_KEY);
              
              // Get configured lists
              const config = configManager.getConfig();
              const results: string[] = [];
              
              results.push('🔍 Validating ClickUp Custom Statuses...\n');
              
              // Check Tasks list statuses
              const tasksListId = (config.clickup as any)?.lists?.tasks;
              if (tasksListId) {
                try {
                  await validator.validateListStatuses(tasksListId, 'tasks');
                  results.push('✅ Tasks List: All required statuses configured correctly');
                } catch (error: any) {
                  results.push('❌ Tasks List: ' + error.message);
                }
              } else {
                results.push('⚠️ Tasks List: Not configured');
              }
              
              // Check Commits list statuses  
              const commitsListId = (config.clickup as any)?.lists?.commits;
              if (commitsListId) {
                try {
                  await validator.validateListStatuses(commitsListId, 'commits');
                  results.push('✅ Commits List: All required statuses configured correctly');
                } catch (error: any) {
                  results.push('❌ Commits List: ' + error.message);
                }
              } else {
                results.push('⚠️ Commits List: Not configured');
              }
              
              // Overall status
              const allValid = !results.some(r => r.includes('❌'));
              if (allValid) {
                results.push('\n🎉 All statuses are properly configured! The integration is ready to use.');
              } else {
                results.push('\n⚠️ Some statuses need to be configured. Check the STATUS_SETUP_GUIDE.md for instructions.');
              }
              
              return {
                content: [{
                  type: 'text',
                  text: results.join('\n')
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `❌ Error validating statuses: ${error.message}\n\nMake sure ClickUp is accessible and you have the correct API key.`
                }]
              };
            }
          }

          case 'force_sync': {
            await this.syncHandler.forceSync();
            return {
              content: [{
                type: 'text',
                text: 'Forced synchronization complete'
              }]
            };
          }

          case 'add_attachment': {
            const { task_id, file_path, file_name } = request.params.arguments as any;
            
            // Try to get ClickUp task ID if todo ID was provided
            let clickUpTaskId = task_id;
            const mappedId = this.syncHandler.getClickUpTaskId(task_id);
            if (mappedId) {
              clickUpTaskId = mappedId;
            }
            
            await this.syncHandler.addTaskAttachment(clickUpTaskId, file_path, file_name);
            
            return {
              content: [{
                type: 'text',
                text: `✅ Attachment added to task ${clickUpTaskId}`
              }]
            };
          }

          case 'get_task': {
            const taskId = args?.task_id as string;
            const task = await this.taskHandler.getTask(taskId);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(task, null, 2)
              }]
            };
          }

          case 'update_task_status': {
            const taskId = args?.task_id as string;
            const status = args?.status as string;
            const task = await this.taskHandler.updateTaskStatus(taskId, status);
            return {
              content: [{
                type: 'text',
                text: `Updated task ${task.name} status to ${status}`
              }]
            };
          }

          case 'create_plan': {
            const title = args?.title as string;
            const todos = args?.todos as TodoItem[];
            await this.planHandler.initialize();
            const plan = await this.planHandler.createPlanFromTodos(title, todos);
            return {
              content: [{
                type: 'text',
                text: `Created plan "${plan.title}" with ${plan.items.length} subtasks\nGoal ID: ${plan.goalId}`
              }]
            };
          }

          case 'complete_plan_item': {
            const planId = args?.plan_id as string;
            const itemId = args?.item_id as string;
            const commitMessage = args?.commit_message as string;
            await this.planHandler.completePlanItem(planId, itemId, commitMessage);
            return {
              content: [{
                type: 'text',
                text: `Completed plan item ${itemId}`
              }]
            };
          }

          case 'get_plan_status': {
            const planId = args?.plan_id as string;
            const plan = this.planHandler.getPlanStatus(planId);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(plan, null, 2)
              }]
            };
          }

          case 'workflow_create_tasks': {
            const todos = args?.todos as TodoItem[];
            const parentTitle = args?.parent_title as string;
            await this.workflowHandler.initialize();
            const tasks = await this.workflowHandler.createTasksFromTodos(todos, parentTitle);
            return {
              content: [{
                type: 'text',
                text: `Created ${tasks.length} tasks${tasks[0]?.parentTaskId ? ' with parent task' : ''}`
              }]
            };
          }

          case 'workflow_complete_task': {
            const taskId = args?.task_id as string;
            const commitMessage = args?.commit_message as string;
            await this.workflowHandler.initialize();
            await this.workflowHandler.completeTask(taskId, commitMessage);
            return {
              content: [{
                type: 'text',
                text: `Completed task ${taskId} with commit`
              }]
            };
          }

          case 'initialize_clickup': {
            const workspaceName = args?.workspace_name as string;
            const spaceName = args?.space_name as string || 'Test Project';
            const listName = args?.list_name as string || 'Tasks';
            const enableCommits = args?.enable_commits !== false;
            const enableGoals = args?.enable_goals !== false;
            
            // Initialize the setup handler
            const { execSync } = await import('child_process');
            const cwd = process.cwd();
            
            try {
              // Run the quick-setup script
              const result = execSync(
                `node ${__dirname}/quick-setup.js "${workspaceName}" "${spaceName}" "${listName}" ${enableCommits} ${enableGoals}`,
                { cwd, encoding: 'utf-8' }
              );
              
              return {
                content: [{
                  type: 'text',
                  text: `ClickUp integration initialized successfully!\n\nWorkspace: ${workspaceName}\nSpace: ${spaceName}\nList: ${listName}\nCommit tracking: ${enableCommits ? 'enabled' : 'disabled'}\nGoal tracking: ${enableGoals ? 'enabled' : 'disabled'}\n\n${result}`
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `Failed to initialize ClickUp: ${error.message}`
                }]
              };
            }
          }

          case 'setup': {
            // Parse natural language input to extract workspace and space
            const { NaturalLanguageParser } = await import('./utils/nl-parser.js');
            const parsed = NaturalLanguageParser.parseSetupCommand(args?.workspace as string || '');
            
            const { execSync } = await import('child_process');
            const cwd = process.cwd();
            
            try {
              // Build command with workspace and optional space
              let command = `node ${__dirname}/quick-setup.js`;
              
              if (parsed.workspace) {
                command += ` --workspace "${parsed.workspace}"`;
              }
              
              if (parsed.space) {
                command += ` --space-name "${parsed.space}"`;
              }
              
              logger.info(`Setup command parsed: workspace="${parsed.workspace}", space="${parsed.space}"`);
              logger.debug(`Executing: ${command}`);
              
              const result = execSync(command, { cwd, encoding: 'utf-8' });
              
              // Build response message
              let responseText = `✅ ClickUp integration setup complete!\n\n`;
              
              if (parsed.workspace) {
                responseText += `Workspace: ${parsed.workspace}\n`;
              }
              
              if (parsed.space) {
                responseText += `Space: ${parsed.space}\n`;
              } else {
                responseText += `Space: Agentic Development (default)\n`;
              }
              
              responseText += `Lists: Tasks & Commits\n\n`;
              responseText += `✨ Features ready:\n`;
              responseText += `- TodoWrite sync\n`;
              responseText += `- Commit tracking\n`;
              responseText += `- Goal tracking\n\n`;
              responseText += `⚠️ **IMPORTANT**: Your integration is set up, but you need to configure custom statuses in ClickUp before it will work.\n\n`;
              responseText += `📋 **Next Steps**:\n`;
              responseText += `1. Check the STATUS_SETUP_GUIDE.md file in .claude/clickup/\n`;
              responseText += `2. Configure the custom statuses in ClickUp\n`;
              responseText += `3. Ask me to "validate clickup statuses" to verify everything is working\n\n`;
              responseText += `Once statuses are configured, the integration will work as expected!\n\n`;
              responseText += result;
              
              return {
                content: [{
                  type: 'text',
                  text: responseText
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `Failed to setup ClickUp: ${error.message}`
                }]
              };
            }
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool execution failed: ${name}`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    await this.server.connect(transport);
    logger.info('ClickMongrel MCP Server started');

    // Initialize handlers
    await this.syncHandler.initialize();
    await this.goalHandler.initialize();
    await this.taskHandler.initialize();
  }
}

// Start the server
const server = new ClickMongrelServer();
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});