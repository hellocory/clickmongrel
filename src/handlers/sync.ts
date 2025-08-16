import { TodoItem, ClickUpTask } from '../types/index.js';
import ClickUpAPI from '../utils/clickup-api.js';
import configManager from '../config/index.js';
import logger from '../utils/logger.js';

export class SyncHandler {
  private api: ClickUpAPI;
  private syncQueue: Map<string, TodoItem>;
  private syncInProgress: boolean;
  private listId: string | undefined;
  private todoIdFieldId: string | undefined;

  constructor(apiKey: string, listId?: string) {
    this.api = new ClickUpAPI(apiKey);
    this.syncQueue = new Map();
    this.syncInProgress = false;
    this.listId = listId;
  }

  async initialize(): Promise<void> {
    try {
      // If listId is already provided, just cache statuses
      if (this.listId) {
        logger.info(`Using provided list ID: ${this.listId}`);
        await this.cacheListStatuses(this.listId);
        await this.detectCustomFields(this.listId);
        return;
      }
      
      // Get default list ID
      const defaultSpace = configManager.getDefaultSpace();
      const defaultList = configManager.getDefaultList();
      
      if (defaultSpace && defaultList) {
        // Get the workspace/team ID first
        const teams = await this.api.getTeams();
        const team = teams.find(t => t.name.includes('Ghost Codes')) || teams[0];
        
        if (team) {
          // Get spaces
          const spaces = await this.api.getSpaces(team.id);
          const space = spaces.find(s => s.name === defaultSpace) || spaces[0];
          
          if (space) {
            // Get lists
            const lists = await this.api.getLists(space.id);
            const list = lists.find(l => l.name === defaultList) || lists[0];
            
            if (list) {
              this.listId = list.id;
              logger.info(`Initialized with list: ${list.name} (${list.id})`);
              
              // Cache the statuses for this list
              await this.cacheListStatuses(list.id);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to initialize sync handler:', error);
      throw error;
    }
  }

  private async cacheListStatuses(listId: string): Promise<void> {
    try {
      const statuses = await this.api.getListStatuses(listId);
      
      if (!statuses || statuses.length === 0) {
        logger.warn('No statuses found for list');
        return;
      }
      
      // Build status configuration
      const statusConfig = {
        spaces: {
          [configManager.getDefaultSpace() || 'default']: {
            lists: {
              [configManager.getDefaultList() || 'default']: {
                statuses: statuses,
                default_status: statuses.find(s => s.status.toLowerCase().includes('to do'))?.status || statuses[0]?.status || 'to do',
                complete_status: statuses.find(s => s.status.toLowerCase().includes('done') || s.status.toLowerCase().includes('complete'))?.status || 'done'
              }
            }
          }
        },
        status_mappings: {
          pending: statuses.find(s => s.status.toLowerCase().includes('to do'))?.status || 'to do',
          in_progress: statuses.find(s => s.status.toLowerCase().includes('progress'))?.status || 'in progress',
          completed: statuses.find(s => s.status.toLowerCase().includes('done') || s.status.toLowerCase().includes('complete'))?.status || 'done'
        }
      };
      
      configManager.saveStatusConfig(statusConfig);
      logger.info('Cached list statuses');
    } catch (error) {
      logger.error('Failed to cache list statuses:', error);
    }
  }

  private async detectCustomFields(listId: string): Promise<void> {
    try {
      const customFields = await this.api.getCustomFields(listId) as any[];
      
      // Look for existing "Todo ID" or "Claude Todo ID" field
      const todoField = customFields.find((field: any) => 
        field.name?.toLowerCase().includes('todo') && 
        field.name?.toLowerCase().includes('id')
      );
      
      if (todoField) {
        this.todoIdFieldId = todoField.id;
        logger.info(`✓ Found Todo ID custom field: ${todoField.name} (${todoField.id})`);
        logger.info('Claude can now perfectly track TodoWrite items with this custom field!');
      } else {
        logger.info('ℹ️  No Todo ID custom field detected.');
        logger.info('📋 To improve Claude\'s relation capabilities:');
        logger.info('   1. Go to your ClickUp list settings');
        logger.info('   2. Create a custom field named "Claude Todo ID" (type: Text)');
        logger.info('   3. Restart ClickMongrel to auto-detect it');
        logger.info('');
        logger.info('🔄 Fallback: Using task description to track TodoWrite IDs');
      }
    } catch (error) {
      logger.warn('Failed to detect custom fields, using description fallback:', error);
    }
  }

  async syncTodos(todos: TodoItem[]): Promise<void> {
    if (!configManager.isFeatureEnabled('todo_sync')) {
      logger.debug('Todo sync is disabled');
      return;
    }

    if (!this.listId) {
      await this.initialize();
      if (!this.listId) {
        logger.error('Cannot sync todos - no list ID available');
        return;
      }
    }

    // Add todos to sync queue
    todos.forEach(todo => {
      this.syncQueue.set(todo.id, todo);
    });

    // Process sync queue
    await this.processSyncQueue();
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.size === 0) {
      return;
    }

    this.syncInProgress = true;
    const todos = Array.from(this.syncQueue.values());
    this.syncQueue.clear();

    try {
      // Get existing tasks from ClickUp
      const existingTasks = await this.api.getTasks(this.listId!);
      const taskMap = new Map(existingTasks.map(t => [t.custom_fields?.find(f => f.name === 'todo_id')?.value as string, t]));

      for (const todo of todos) {
        try {
          const existingTask = taskMap.get(todo.id) || 
                              existingTasks.find(t => t.name === todo.content);

          if (existingTask) {
            // Update existing task
            await this.updateTaskFromTodo(existingTask, todo);
          } else if (todo.status !== 'completed') {
            // Create new task (don't create tasks for completed todos that don't exist)
            await this.createTaskFromTodo(todo);
          }
        } catch (error) {
          logger.error(`Failed to sync todo ${todo.id}:`, error);
          // Re-add to queue for retry
          this.syncQueue.set(todo.id, todo);
        }
      }
    } catch (error) {
      logger.error('Sync queue processing failed:', error);
      // Re-add all todos to queue for retry
      todos.forEach(todo => this.syncQueue.set(todo.id, todo));
    } finally {
      this.syncInProgress = false;
    }

    // If there are still items in queue, schedule retry
    if (this.syncQueue.size > 0) {
      setTimeout(() => this.processSyncQueue(), 5000); // Retry after 5 seconds
    }
  }

  private async createTaskFromTodo(todo: TodoItem): Promise<void> {
    if (!this.listId) return;

    const status = configManager.getStatusMapping(todo.status);
    
    // Prepare task data
    const taskData: any = {
      name: todo.content,
      description: this.todoIdFieldId 
        ? `Created from Claude TodoWrite\nTodo ID: ${todo.id}`
        : `Created from Claude TodoWrite\n\n🔗 TodoWrite ID: ${todo.id}\n\nNote: Create a "Claude Todo ID" custom field in ClickUp for better tracking!`,
      status: { status } as any
    };
    
    // Add custom field if available (preferred method)
    if (this.todoIdFieldId) {
      taskData.custom_fields = [
        {
          id: this.todoIdFieldId,
          value: todo.id
        }
      ];
    }
    
    const task = await this.api.createTask(this.listId, taskData);

    // Update todo with ClickUp task ID
    todo.clickup_task_id = task.id;
    logger.info(`Created ClickUp task ${task.id} for todo ${todo.id}`);
  }

  private async updateTaskFromTodo(task: ClickUpTask, todo: TodoItem): Promise<void> {
    const currentStatus = task.status.status;
    const newStatus = configManager.getStatusMapping(todo.status);

    if (currentStatus !== newStatus) {
      await this.api.updateTaskStatus(task.id, newStatus);
      logger.info(`Updated task ${task.id} status from ${currentStatus} to ${newStatus}`);
    }

    // Update todo with ClickUp task ID if not set
    if (!todo.clickup_task_id) {
      todo.clickup_task_id = task.id;
    }
  }

  async syncTaskToTodo(taskId: string): Promise<TodoItem | null> {
    try {
      const task = await this.api.getTask(taskId);
      
      // Map ClickUp status to todo status
      const statusMap: Record<string, TodoItem['status']> = {
        'to do': 'pending',
        'in progress': 'in_progress',
        'done': 'completed',
        'complete': 'completed',
        'closed': 'completed'
      };

      const todoStatus = statusMap[task.status.status.toLowerCase()] || 'pending';

      return {
        id: task.custom_fields?.find(f => f.name === 'todo_id')?.value as string || task.id,
        content: task.name,
        status: todoStatus,
        clickup_task_id: task.id,
        clickup_status_id: task.status.id
      };
    } catch (error) {
      logger.error(`Failed to sync task ${taskId} to todo:`, error);
      return null;
    }
  }

  async forceSync(): Promise<void> {
    logger.info('Forcing sync of all cached todos');
    await this.processSyncQueue();
  }

  getSyncStatus(): { queueSize: number; inProgress: boolean; listId: string | undefined } {
    return {
      queueSize: this.syncQueue.size,
      inProgress: this.syncInProgress,
      listId: this.listId
    };
  }
}

export default SyncHandler;