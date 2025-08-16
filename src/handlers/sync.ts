import { TodoItem, ClickUpTask } from '../types/index.js';
import ClickUpAPI from '../utils/clickup-api.js';
import configManager from '../config/index.js';
import logger from '../utils/logger.js';
import { TaskAnalyzer } from '../utils/task-analyzer.js';

export class SyncHandler {
  private api: ClickUpAPI;
  private syncQueue: Map<string, TodoItem>;
  private syncInProgress: boolean;
  private listId: string | undefined;
  private taskIdMap: Map<string, string>; // Maps todo.id to ClickUp task.id

  constructor(apiKey: string, listId?: string) {
    this.api = new ClickUpAPI(apiKey);
    this.syncQueue = new Map();
    this.syncInProgress = false;
    this.listId = listId;
    this.taskIdMap = new Map();
  }

  async initialize(): Promise<void> {
    try {
      // If listId is already provided, just cache statuses
      if (this.listId) {
        logger.info(`Using provided list ID: ${this.listId}`);
        await this.cacheListStatuses(this.listId);
        return;
      }
      
      // Get default list ID
      const workspaceId = configManager.getConfig().clickup.workspace_id;
      const defaultSpace = configManager.getDefaultSpace();
      const defaultList = configManager.getDefaultList();
      
      if (workspaceId && defaultSpace && defaultList) {
        // Use the configured workspace ID directly
        const spaces = await this.api.getSpaces(workspaceId);
        const space = spaces.find(s => s.name === defaultSpace);
        
        if (space) {
          // Get lists
          const lists = await this.api.getLists(space.id);
          const list = lists.find(l => l.name === defaultList);
          
          if (list) {
            this.listId = list.id;
            logger.info(`Initialized with list: ${list.name} (${list.id})`);
            
            // Cache the statuses for this list
            await this.cacheListStatuses(list.id);
          } else {
            logger.error(`List "${defaultList}" not found in space "${defaultSpace}"`);
          }
        } else {
          logger.error(`Space "${defaultSpace}" not found in workspace`);
        }
      } else {
        logger.warn('Missing workspace configuration - run initialization first');
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

    // Analyze and enhance todos with metadata
    const enhancedTodos = todos.map(todo => {
      const analyzed = TaskAnalyzer.analyzeTodo(todo);
      this.trackTimeChanges(todo, analyzed);
      return analyzed;
    });

    // Add enhanced todos to sync queue
    enhancedTodos.forEach(todo => {
      this.syncQueue.set(todo.id, todo);
    });

    // Process sync queue
    await this.processSyncQueue();
  }

  private trackTimeChanges(original: TodoItem, analyzed: TodoItem): void {
    // Log time tracking events
    if (analyzed.started_at && !original.started_at) {
      logger.info(`⏱️ Task started: ${analyzed.title || analyzed.content} (${analyzed.id})`);
    }
    
    if (analyzed.completed_at && !original.completed_at) {
      const duration = analyzed.actual_time ? TaskAnalyzer.formatDuration(analyzed.actual_time) : 'unknown';
      const estimated = analyzed.estimated_time ? TaskAnalyzer.formatDuration(analyzed.estimated_time) : 'not estimated';
      const efficiency = analyzed.actual_time && analyzed.estimated_time 
        ? TaskAnalyzer.calculateEfficiency(analyzed.estimated_time, analyzed.actual_time)
        : null;
      
      logger.info(`✅ Task completed: ${analyzed.title || analyzed.content} (${analyzed.id})`);
      logger.info(`   Duration: ${duration} | Estimated: ${estimated}${efficiency ? ` | Efficiency: ${efficiency}%` : ''}`);
    }

    // Log metadata detection
    if (analyzed.category && analyzed.category !== 'general') {
      logger.debug(`🏷️ Task categorized as: ${analyzed.category} with tags: ${analyzed.tags?.join(', ')}`);
    }
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

  private buildTaskDescription(todo: TodoItem): string {
    try {
      // Load template based on task type - for now, always use task_creation
      // Future enhancement: detect subtasks vs main tasks vs future tasks
      const template = configManager.loadTemplate('task_creation');
      
      // Prepare template variables
      const templateVars = {
        title: todo.title || todo.content,
        description: todo.content || '',
        category: todo.category || 'general',
        priority: todo.priority || 'normal',
        estimated_time: todo.estimated_time ? TaskAnalyzer.formatDuration(todo.estimated_time) : 'Not specified',
        tags: todo.tags ? todo.tags.join(', ') : 'None',
        created_at: todo.created_at ? new Date(todo.created_at).toLocaleString() : new Date().toLocaleString(),
        todo_id: todo.id
      };
      
      // Simple template substitution (basic implementation)
      let description = template;
      Object.entries(templateVars).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        description = description.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value.toString());
      });
      
      return description;
    } catch (error) {
      logger.error('Error building task description with template:', error);
      // Fallback to original implementation
      return this.buildTaskDescriptionFallback(todo);
    }
  }

  private buildTaskDescriptionFallback(todo: TodoItem): string {
    const sections: string[] = [];
    
    // Header
    sections.push('📝 **Created from Claude TodoWrite**');
    sections.push('');
    
    // Basic info
    if (todo.category && todo.category !== 'general') {
      sections.push(`📂 **Category:** ${todo.category}`);
    }
    
    if (todo.tags && todo.tags.length > 0) {
      sections.push(`🏷️ **Tags:** ${todo.tags.join(', ')}`);
    }
    
    if (todo.priority && todo.priority !== 'normal') {
      const priorityEmoji = { urgent: '🔥', high: '⚡', low: '📋' };
      sections.push(`${priorityEmoji[todo.priority] || '📋'} **Priority:** ${todo.priority}`);
    }
    
    // Time tracking
    if (todo.estimated_time) {
      sections.push(`⏱️ **Estimated Time:** ${TaskAnalyzer.formatDuration(todo.estimated_time)}`);
    }
    
    if (todo.created_at) {
      sections.push(`📅 **Created:** ${new Date(todo.created_at).toLocaleString()}`);
    }
    
    // Add metadata for tracking
    sections.push('');
    sections.push('---');
    sections.push(`🤖 **Source:** Claude TodoWrite`);
    sections.push(`📝 **Session ID:** ${todo.id}`);
    
    return sections.join('\n');
  }

  private async createTaskFromTodo(todo: TodoItem): Promise<void> {
    if (!this.listId) return;

    const status = configManager.getStatusMapping(todo.status);
    
    // Use enhanced title and create rich description
    const title = todo.title || todo.content;
    const description = this.buildTaskDescription(todo);
    
    // Prepare task data
    const taskData: any = {
      name: title,
      description,
      status: { status } as any
    };

    // Add time estimate if available (keep in milliseconds as ClickUp expects)
    if (todo.estimated_time) {
      taskData.time_estimate = todo.estimated_time;
    }

    // Add ALL tags from the todo
    if (todo.tags && todo.tags.length > 0) {
      // ClickUp will create tags that don't exist
      taskData.tags = todo.tags;
    } else {
      // Add default tags based on source
      taskData.tags = ['claude', 'todowrite'];
    }

    // Add priority as number (ClickUp format: 1=Urgent, 2=High, 3=Normal, 4=Low)
    if (todo.priority) {
      const priorityMap: Record<string, number> = { 
        urgent: 1, 
        high: 2, 
        normal: 3, 
        low: 4 
      };
      taskData.priority = priorityMap[todo.priority] || 3;
    } else {
      taskData.priority = 3; // Default to normal
    }

    // Add due date based on priority
    if (todo.priority === 'urgent') {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 4); // 4 hours for urgent
      taskData.due_date = dueDate.getTime();
    } else if (todo.priority === 'high') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1); // 1 day for high priority
      taskData.due_date = dueDate.getTime();
    }
    
    // Add assignee if auto-assignment is enabled
    if (configManager.shouldAutoAssignUser()) {
      let assigneeId = configManager.getAssigneeUserId();
      
      // If no assignee configured, get current user
      if (!assigneeId) {
        try {
          const user = await this.api.getCurrentUser();
          if (user && user.id) {
            assigneeId = user.id;
            // Save for future use
            const config = configManager.getConfig();
            config.clickup.assignee_user_id = user.id;
            configManager.saveConfig(config);
          }
        } catch (error) {
          logger.warn('Could not get current user for assignment', error);
        }
      }
      
      if (assigneeId) {
        taskData.assignees = [assigneeId];
      }
    }

    // No need for custom fields - we'll track the mapping internally
    
    const task = await this.api.createTask(this.listId, taskData);

    // Store the mapping between todo ID and ClickUp task ID
    this.taskIdMap.set(todo.id, task.id);
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

    // Update mapping
    this.taskIdMap.set(todo.id, task.id);
    todo.clickup_task_id = task.id;
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

  getTaskIdForTodo(todoId: string): string | undefined {
    return this.taskIdMap.get(todoId);
  }

  getTodoIdForTask(taskId: string): string | undefined {
    for (const [todoId, tId] of this.taskIdMap.entries()) {
      if (tId === taskId) return todoId;
    }
    return undefined;
  }

  getAllMappings(): Map<string, string> {
    return new Map(this.taskIdMap);
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