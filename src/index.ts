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
import configManager from './config/index.js';
import SyncHandler from './handlers/sync.js';
import GoalHandler from './handlers/goals.js';
import TaskHandler from './handlers/tasks.js';
import ReportHandler from './handlers/reports.js';
import CommitHandler from './handlers/commits.js';
import logger from './utils/logger.js';
import { TodoItem, ClickUpGoal } from './types/index.js';

// Get API key from environment or configuration
const API_KEY = process.env.CLICKUP_API_KEY || configManager.getApiKey() || '';

class ClickMongrelServer {
  private server: Server;
  private syncHandler: SyncHandler;
  private goalHandler: GoalHandler;
  private taskHandler: TaskHandler;
  private reportHandler: ReportHandler;
  private commitHandler: CommitHandler;

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
        {
          name: 'get_current_goal',
          description: 'Get the currently active goal',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'switch_goal',
          description: 'Switch to a different goal',
          inputSchema: {
            type: 'object',
            properties: {
              goal_id: { type: 'string' }
            },
            required: ['goal_id']
          }
        },
        {
          name: 'update_goal_progress',
          description: 'Update progress for the current goal',
          inputSchema: {
            type: 'object',
            properties: {
              percent: { type: 'number', minimum: 0, maximum: 100 }
            },
            required: ['percent']
          }
        },
        {
          name: 'list_goals',
          description: 'List all available goals',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'create_goal',
          description: 'Create a new goal',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              percent_completed: { type: 'number', minimum: 0, maximum: 100 },
              color: { type: 'string' }
            },
            required: ['name']
          }
        },
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
          name: 'force_sync',
          description: 'Force immediate synchronization',
          inputSchema: {
            type: 'object',
            properties: {}
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

          case 'force_sync': {
            await this.syncHandler.forceSync();
            return {
              content: [{
                type: 'text',
                text: 'Forced synchronization complete'
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