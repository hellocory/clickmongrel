import { TodoItem, ClickUpTask } from '../types/index.js';
import ClickUpAPI from '../utils/clickup-api.js';
import configManager from '../config/index.js';
import logger from '../utils/logger.js';
import { TaskAnalyzer } from '../utils/task-analyzer.js';
import { StatusValidator } from '../utils/status-validator.js';
import * as fs from 'fs';
import * as path from 'path';

export class SyncHandler {
  private api: ClickUpAPI;
  private syncQueue: Map<string, TodoItem>;
  private syncInProgress: boolean;
  private listId: string | undefined;
  private taskIdMap: Map<string, string>;
  private taskStartTimes: Map<string, number>;
  private lastCommitForTask: Map<string, string>; // Maps todo.id to ClickUp task.id

  constructor(apiKey: string, listId?: string) {
    this.api = new ClickUpAPI(apiKey);
    this.syncQueue = new Map();
    this.syncInProgress = false;
    this.listId = listId;
    this.taskIdMap = new Map();
    this.statusValidator = new StatusValidator(apiKey);
    this.statusesValidated = false;
    this.taskStartTimes = new Map(); // Track when tasks start
    this.lastCommitForTask = new Map(); // Track last commit ID for each task
  }
  
  private statusValidator: StatusValidator;
  private statusesValidated: boolean;

  async initialize(): Promise<void> {
    try {
      // If listId is already provided, just cache statuses
      if (this.listId) {
        logger.info(`Using provided list ID: ${this.listId}`);
        await this.cacheListStatuses(this.listId);
        return;
      }
      
      // Try to get from environment variables first
      const envListId = process.env.CLICKUP_TASKS_LIST_ID;
      if (envListId) {
        this.listId = envListId;
        logger.info(`Using list ID from environment: ${this.listId}`);
        await this.cacheListStatuses(this.listId);
        return;
      }
      
      // Try to load from .claude/clickup/config.json
      const configPath = path.join(process.cwd(), '.claude/clickup/config.json');
      if (fs.existsSync(configPath)) {
        try {
          const configContent = fs.readFileSync(configPath, 'utf-8');
          const config = JSON.parse(configContent);
          
          // Set auto-assign from config - FIXED to use correct user ID
          if (config.autoAssign && config.userId) {
            configManager.updateAssigneeConfig(true, config.userId);
            logger.info(`Auto-assign enabled for user ID: ${config.userId}`);
          }
          
          if (config.lists?.tasks) {
            this.listId = config.lists.tasks;
            logger.info(`Using list ID from config: ${this.listId}`);
            if (this.listId) {
              await this.cacheListStatuses(this.listId);
            }
            return;
          }
        } catch (e) {
          logger.warn('Could not load config.json');
        }
      }
      
      // Fall back to workspace/space/list discovery
      const workspaceId = process.env.CLICKUP_WORKSPACE_ID || configManager.getConfig().clickup.workspace_id;
      const defaultSpace = process.env.CLICKUP_DEFAULT_SPACE || configManager.getDefaultSpace();
      const defaultList = process.env.CLICKUP_DEFAULT_LIST || configManager.getDefaultList() || 'Tasks';
      
      if (workspaceId && defaultSpace) {
        const spaces = await this.api.getSpaces(workspaceId);
        const space = spaces.find(s => s.name === defaultSpace);
        
        if (space) {
          const lists = await this.api.getLists(space.id);
          const list = lists.find(l => l.name === defaultList);
          
          if (list) {
            this.listId = list.id;
            logger.info(`Initialized with list: ${list.name} (${list.id})`);
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
          pending: statuses.find(s => s.status.toLowerCase() === 'to do')?.status || 'to do',
          in_progress: statuses.find(s => s.status.toLowerCase() === 'in progress')?.status || 'in progress',
          completed: statuses.find(s => s.status.toLowerCase() === 'completed')?.status || 'completed'
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
    
    // Validate statuses before allowing any sync
    if (!this.statusesValidated && this.listId) {
      try {
        await this.statusValidator.validateListStatuses(this.listId, 'tasks');
        this.statusesValidated = true;
        logger.info('Status validation passed - proceeding with sync');
      } catch (error: any) {
        // Status validation failed - cannot proceed
        logger.error('Status validation failed - cannot sync tasks');
        throw error;
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
      // Store start time for duration calculation
      this.taskStartTimes.set(analyzed.id, Date.now());
    }
    
    if (analyzed.completed_at && !original.completed_at) {
      // Calculate actual time spent
      // const startTime = this.taskStartTimes.get(analyzed.id);
      // const actualTimeMs = startTime ? Date.now() - startTime : 0;
      
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
          // First check if we already have this todo mapped to a ClickUp task
          const mappedTaskId = this.taskIdMap.get(todo.id);
          let existingTask = null;
          
          if (mappedTaskId) {
            // We have a mapping, try to find the task
            existingTask = existingTasks.find(t => t.id === mappedTaskId);
            if (!existingTask) {
              // Mapping exists but task not found, clear the mapping
              this.taskIdMap.delete(todo.id);
            }
          }
          
          // If no mapped task, look for it by other means
          if (!existingTask) {
            existingTask = taskMap.get(todo.id) || 
                          existingTasks.find(t => t.name === todo.content);
          }

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
    
    // If this todo has a parent, find the parent task ID
    if (todo.parent_id) {
      // First check our internal mapping
      const parentClickUpId = this.taskIdMap.get(todo.parent_id);
      
      if (parentClickUpId) {
        taskData.parent = parentClickUpId;
        logger.info(`Setting parent task ${parentClickUpId} for subtask ${todo.content} using cached mapping`);
        
        // If subtask is starting as in_progress, update parent too
        if (todo.status === 'in_progress') {
          await this.setParentTaskInProgress(parentClickUpId);
        }
      } else {
        // Fallback: Get existing tasks to find the parent
        const existingTasks = await this.api.getTasks(this.listId!, true); // Include subtasks
        
        // Look for a task whose name matches the parent todo's content
        // We need to find the parent todo first
        const parentTodo = Array.from(this.syncQueue.values()).find(t => t.id === todo.parent_id);
        const parentContent = parentTodo?.content || todo.parent_id;
        
        const parentTask = existingTasks.find(t => 
          t.name === parentContent ||
          t.name.includes(parentContent)
        );
        
        if (parentTask) {
          taskData.parent = parentTask.id;
          this.taskIdMap.set(todo.parent_id, parentTask.id); // Cache for future use
          logger.info(`Setting parent task ${parentTask.id} for subtask ${todo.content}`);
          
          // If subtask is starting as in_progress, update parent too
          if (todo.status === 'in_progress') {
            await this.setParentTaskInProgress(parentTask.id);
          }
        } else {
          logger.warn(`Could not find parent task for ${todo.content} with parent_id ${todo.parent_id}`);
        }
      }
    }

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
      
      // Handle task completion enhancements
      if (todo.status === 'completed') {
        await this.handleTaskCompletion(task.id, todo.id);
      }
    }
    
    // Always check parent status after updating a subtask
    if (task.parent) {
      if (todo.status === 'in_progress') {
        // When a subtask starts, set parent to in_progress too
        await this.setParentTaskInProgress(task.parent);
      } else if (todo.status === 'completed') {
        // When a subtask completes, check if all siblings are done
        // Add a small delay to ensure the status update is reflected
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.checkAndCompleteParentTask(task.parent);
      }
    }

    // Update mapping
    this.taskIdMap.set(todo.id, task.id);
    todo.clickup_task_id = task.id;
  }
  
  private async checkAndCompleteParentTask(parentTaskId: string): Promise<void> {
    try {
      logger.debug(`Checking parent task ${parentTaskId} for auto-completion...`);
      
      // Force fresh fetch - bypass cache to get current status
      const parentTask = await this.api.getTask(parentTaskId, true); // force refresh
      logger.debug(`Parent task: ${parentTask.name}, current status: ${parentTask.status.status}`);
      
      // Get fresh list of all tasks including subtasks - IMPORTANT: force refresh
      const allTasks = await this.api.getTasks(this.listId!, true, true); // Include subtasks, force refresh
      
      // Find all subtasks of this parent
      const subtasks = allTasks.filter(t => t.parent === parentTaskId);
      
      if (subtasks.length === 0) {
        logger.warn(`No subtasks found for parent task ${parentTaskId} - this shouldn't happen`);
        return;
      }
      
      logger.info(`Found ${subtasks.length} subtasks for parent ${parentTaskId}`);
      
      // Check each subtask status
      const completedStatuses = ['completed', 'done', 'complete', 'closed'];
      let completedCount = 0;
      
      subtasks.forEach(st => {
        const isCompleted = completedStatuses.includes(st.status.status.toLowerCase());
        logger.debug(`  - Subtask: ${st.name} (${st.id}), status: ${st.status.status}, completed: ${isCompleted}`);
        if (isCompleted) completedCount++;
      });
      
      const allSubtasksCompleted = completedCount === subtasks.length;
      logger.info(`Subtask completion: ${completedCount}/${subtasks.length} completed`);
      
      const parentCompleted = completedStatuses.includes(parentTask.status.status.toLowerCase());
      
      if (allSubtasksCompleted && !parentCompleted) {
        // All subtasks are done - complete the parent task
        const completedStatus = configManager.getStatusMapping('completed');
        logger.info(`🎯 All subtasks completed! Setting parent task ${parentTaskId} to status: ${completedStatus}`);
        
        await this.api.updateTaskStatus(parentTaskId, completedStatus);
        
        logger.info(`✅ Auto-completed parent task ${parentTaskId} (${parentTask.name}) - all ${subtasks.length} subtasks done!`);
      } else if (!allSubtasksCompleted && !parentCompleted) {
        // Some subtasks still pending - ensure parent is in progress
        const inProgressStatuses = ['in progress', 'fixing', 'in_progress'];
        const hasActiveSubtask = subtasks.some(t => 
          inProgressStatuses.includes(t.status.status.toLowerCase())
        );
        
        if (hasActiveSubtask) {
          const parentInProgress = inProgressStatuses.includes(parentTask.status.status.toLowerCase());
          if (!parentInProgress) {
            const inProgressStatus = configManager.getStatusMapping('in_progress');
            await this.api.updateTaskStatus(parentTaskId, inProgressStatus);
            logger.info(`⏳ Parent task ${parentTaskId} (${parentTask.name}) set to in progress - has active subtasks`);
          }
        }
      } else {
        logger.debug(`No action needed - parent completed: ${parentCompleted}, all subtasks completed: ${allSubtasksCompleted}`);
      }
    } catch (error) {
      logger.error(`Failed to check/complete parent task ${parentTaskId}:`, error);
    }
  }

  private async setParentTaskInProgress(parentTaskId: string): Promise<void> {
    try {
      const parentTask = await this.api.getTask(parentTaskId);
      
      // Only update if parent is not already in progress or completed
      const inProgressStatuses = ['in progress', 'fixing', 'in_progress'];
      const completedStatuses = ['completed', 'done', 'complete', 'closed'];
      
      const parentStatus = parentTask.status.status.toLowerCase();
      const isInProgress = inProgressStatuses.includes(parentStatus);
      const isCompleted = completedStatuses.includes(parentStatus);
      
      if (!isInProgress && !isCompleted) {
        const inProgressStatus = configManager.getStatusMapping('in_progress');
        await this.api.updateTaskStatus(parentTaskId, inProgressStatus);
        logger.info(`⏳ Parent task ${parentTaskId} (${parentTask.name}) set to in progress - subtask started`);
      }
    } catch (error) {
      logger.error(`Failed to set parent task ${parentTaskId} to in progress:`, error);
    }
  }

  async syncTaskToTodo(taskId: string): Promise<TodoItem | null> {
    try {
      const task = await this.api.getTask(taskId);
      
      // Map ClickUp status to todo status
      const statusMap: Record<string, TodoItem['status']> = {
        'to do': 'pending',
        'future': 'pending',
        'in progress': 'in_progress',
        'fixing': 'in_progress',
        'completed': 'completed',
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

  getClickUpTaskId(todoId: string): string | undefined {
    return this.taskIdMap.get(todoId);
  }

  getSyncStatus(): { queueSize: number; inProgress: boolean; listId: string | undefined } {
    return {
      queueSize: this.syncQueue.size,
      inProgress: this.syncInProgress,
      listId: this.listId
    };
  }

  // Enhanced features for attachments and time tracking
  async handleTaskCompletion(clickUpTaskId: string, todoId: string): Promise<void> {
    try {
      // Update time tracked if we have start time
      const startTime = this.taskStartTimes.get(todoId);
      if (startTime) {
        const timeSpentMs = Date.now() - startTime;
        await this.api.updateTimeTracked(clickUpTaskId, timeSpentMs);
        logger.info(`Updated time tracked for task ${clickUpTaskId}: ${Math.round(timeSpentMs / 1000 / 60)} minutes`);
        this.taskStartTimes.delete(todoId);
      }

      // Link to last commit if available
      const lastCommitId = this.lastCommitForTask.get(todoId);
      if (lastCommitId) {
        await this.api.linkTaskToCommit(clickUpTaskId, lastCommitId);
        logger.info(`Linked task ${clickUpTaskId} to commit ${lastCommitId}`);
      }
    } catch (error) {
      logger.error(`Failed to handle task completion for ${clickUpTaskId}:`, error);
    }
  }

  async promptForAttachment(todoContent: string): Promise<void> {
    // This would be called by Claude to ask user about attachments
    logger.info(`Would you like to add an attachment for "${todoContent}"? (screenshot, demo, etc.)`);
    // In practice, this would trigger a user interaction through the MCP protocol
  }

  async addTaskAttachment(clickUpTaskId: string, filePath: string, fileName?: string): Promise<void> {
    try {
      await this.api.addAttachment(clickUpTaskId, filePath, fileName);
      logger.info(`Added attachment to task ${clickUpTaskId}: ${fileName || filePath}`);
    } catch (error) {
      logger.error(`Failed to add attachment to task ${clickUpTaskId}:`, error);
    }
  }

  setLastCommitForTask(todoId: string, commitTaskId: string): void {
    this.lastCommitForTask.set(todoId, commitTaskId);
  }
}

export default SyncHandler;