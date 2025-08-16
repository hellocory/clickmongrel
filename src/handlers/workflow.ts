import { TodoItem, ClickUpTask, CommitInfo } from '../types/index.js';
import ClickUpAPI from '../utils/clickup-api.js';
import SyncHandler from './sync.js';
import CommitHandler from './commits.js';
import configManager from '../config/index.js';
import logger from '../utils/logger.js';
import { execSync } from 'child_process';

export interface WorkflowTask {
  id: string;
  name: string;
  taskId?: string;
  parentTaskId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  commit?: {
    hash: string;
    message: string;
    timestamp: string;
  };
}

export class WorkflowHandler {
  private api: ClickUpAPI;
  private syncHandler: SyncHandler;
  private commitHandler: CommitHandler;
  private listId: string | undefined;
  private activeTasks: Map<string, WorkflowTask[]>;

  constructor(apiKey: string) {
    this.api = new ClickUpAPI(apiKey);
    this.syncHandler = new SyncHandler(apiKey);
    this.commitHandler = new CommitHandler(apiKey);
    this.activeTasks = new Map();
  }

  async initialize(): Promise<void> {
    await this.syncHandler.initialize();
    this.listId = this.syncHandler.getSyncStatus().listId;
    logger.info('WorkflowHandler initialized');
  }

  /**
   * Create tasks from TodoWrite items
   * If multiple items, create parent task with subtasks
   * If single item, create standalone task
   */
  async createTasksFromTodos(todos: TodoItem[], parentTitle?: string): Promise<WorkflowTask[]> {
    const tasks: WorkflowTask[] = [];
    
    try {
      if (todos.length === 1 && todos[0]) {
        // Single task - create standalone
        const task = await this.createStandaloneTask(todos[0]);
        tasks.push(task);
      } else if (todos.length > 1) {
        // Multiple tasks - create parent with subtasks
        const parentTask = await this.createParentTask(parentTitle || 'Task Group');
        tasks.push(parentTask);
        
        for (const todo of todos) {
          const subtask = await this.createSubtask(todo, parentTask.taskId!);
          tasks.push(subtask);
        }
      }
      
      // Store for tracking
      const groupId = `group-${Date.now()}`;
      this.activeTasks.set(groupId, tasks);
      
      logger.info(`Created ${tasks.length} tasks from todos`);
      return tasks;
    } catch (error) {
      logger.error('Failed to create tasks:', error);
      throw error;
    }
  }

  /**
   * Complete a task with automatic commit and tracking
   */
  async completeTask(taskId: string, commitMessage?: string): Promise<void> {
    try {
      // 1. Get the task details
      const task = await this.api.getTask(taskId);
      
      // 2. Create and track commit (if in git repo)
      if (this.isGitRepo()) {
        const commit = await this.createAndCommit(task.name, commitMessage);
        if (commit) {
          // IMPORTANT: Create task in Commits list
          const commitInfo: CommitInfo = {
            hash: commit.hash,
            message: commit.message,
            author: 'Claude AI',
            timestamp: commit.timestamp,
            task_id: taskId
          };
          
          // This creates the commit task in the Commits list!
          await this.commitHandler.linkCommit(commitInfo);
          logger.info(`Created commit task in Commits list for ${commit.hash}`);
          
          // Also add commit info as comment on the task
          const commitComment = `### 🔗 Commit Linked\n\n` +
            `**Hash:** \`${commit.hash.substring(0, 8)}\`\n` +
            `**Message:** ${commit.message}\n` +
            `**Time:** ${new Date(commit.timestamp).toLocaleString()}\n\n` +
            `\`\`\`bash\ngit show ${commit.hash.substring(0, 8)}\n\`\`\``;
          
          await this.api.addTaskComment(taskId, commitComment);
          logger.info(`Tracked commit ${commit.hash} on task ${taskId}`);
        }
      }
      
      // 3. Mark task as completed
      await this.api.updateTaskStatus(taskId, 'completed');
      logger.info(`Completed task: ${task.name}`);
      
      // 4. Check if this was a subtask and update parent if needed
      if ((task as any).parent) {
        await this.checkAndCompleteParent((task as any).parent);
      }
      
    } catch (error) {
      logger.error(`Failed to complete task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Complete multiple tasks in sequence
   */
  // TODO: Fix TypeScript issue with optional parameters
  /*
  async completeTasks(taskIds: string[], commitMessages?: string[]): Promise<void> {
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const message = commitMessages?.[i];
      await this.completeTask(taskId, message);
      
      // Small delay between completions
      if (i < taskIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  */

  /**
   * Check if all subtasks are complete and complete parent if so
   */
  private async checkAndCompleteParent(parentTaskId: string): Promise<void> {
    try {
      // Get parent task
      const parentTask = await this.api.getTask(parentTaskId);
      
      // Get all subtasks
      const subtasks = await this.getSubtasks(parentTaskId);
      
      // Check if all subtasks are completed
      const allComplete = subtasks.every(st => 
        st.status?.status === 'completed' || 
        st.status?.status === 'done' ||
        st.status?.type === 'closed'
      );
      
      if (allComplete && parentTask.status?.status !== 'completed') {
        logger.info(`All subtasks complete, completing parent task ${parentTaskId}`);
        
        // Create final commit for parent
        if (this.isGitRepo()) {
          const commit = await this.createAndCommit(
            parentTask.name,
            `✅ Complete: ${parentTask.name}\n\nAll ${subtasks.length} subtasks completed successfully!`
          );
          
          if (commit) {
            const commitComment = `### 🎉 All Subtasks Completed!\n\n` +
              `**Final Commit:** \`${commit.hash.substring(0, 8)}\`\n` +
              `**Completed:** ${subtasks.length} subtasks\n` +
              `**Time:** ${new Date().toLocaleString()}`;
            
            await this.api.addTaskComment(parentTaskId, commitComment);
          }
        }
        
        // Mark parent as completed
        await this.api.updateTaskStatus(parentTaskId, 'completed');
        logger.info(`Completed parent task: ${parentTask.name}`);
      }
    } catch (error) {
      logger.warn(`Failed to check/complete parent ${parentTaskId}:`, error);
    }
  }

  /**
   * Get subtasks of a parent task
   */
  private async getSubtasks(parentTaskId: string): Promise<ClickUpTask[]> {
    if (!this.listId) return [];
    
    // Get all tasks in the list
    const allTasks = await this.api.getTasks(this.listId);
    
    // Filter for subtasks of this parent
    return allTasks.filter(task => (task as any).parent === parentTaskId);
  }

  /**
   * Create a standalone task
   */
  private async createStandaloneTask(todo: TodoItem): Promise<WorkflowTask> {
    if (!this.listId) {
      throw new Error('List ID not initialized');
    }

    const taskData: any = {
      name: todo.content,
      description: this.buildTaskDescription(todo),
      status: this.mapTodoStatus(todo.status),
      priority: this.mapPriority(todo.priority),
      tags: todo.tags || ['todowrite'],
      assignees: this.getAssignees()
    };

    if (todo.estimated_time) {
      taskData.time_estimate = todo.estimated_time;
    }

    const task = await this.api.createTask(this.listId, taskData);
    logger.info(`Created standalone task: ${task.id} - ${task.name}`);

    return {
      id: todo.id,
      name: task.name,
      taskId: task.id,
      status: todo.status as any
    };
  }

  /**
   * Create a parent task for grouping
   */
  private async createParentTask(title: string): Promise<WorkflowTask> {
    if (!this.listId) {
      throw new Error('List ID not initialized');
    }

    const taskData: any = {
      name: `📋 ${title}`,
      description: `Parent task for grouped items\n\nCreated: ${new Date().toLocaleString()}`,
      status: 'to do',
      priority: 2, // High priority for parent tasks
      tags: ['parent', 'todowrite'],
      assignees: this.getAssignees()
    };

    const task = await this.api.createTask(this.listId, taskData);
    logger.info(`Created parent task: ${task.id} - ${task.name}`);

    return {
      id: `parent-${Date.now()}`,
      name: task.name,
      taskId: task.id,
      status: 'pending'
    };
  }

  /**
   * Create a subtask linked to parent
   */
  private async createSubtask(todo: TodoItem, parentTaskId: string): Promise<WorkflowTask> {
    if (!this.listId) {
      throw new Error('List ID not initialized');
    }

    const taskData: any = {
      name: todo.content,
      description: `Subtask of parent: ${parentTaskId}\n\n${this.buildTaskDescription(todo)}`,
      status: this.mapTodoStatus(todo.status),
      priority: this.mapPriority(todo.priority),
      parent: parentTaskId,
      tags: todo.tags || ['subtask', 'todowrite'],
      assignees: this.getAssignees()
    };

    if (todo.estimated_time) {
      taskData.time_estimate = todo.estimated_time;
    }

    const task = await this.api.createTask(this.listId, taskData);
    logger.info(`Created subtask: ${task.id} - ${task.name}`);

    return {
      id: todo.id,
      name: task.name,
      taskId: task.id,
      parentTaskId,
      status: todo.status as any
    };
  }

  /**
   * Create and execute a git commit
   */
  private async createAndCommit(taskName: string, customMessage?: string): Promise<any> {
    try {
      const message = customMessage || `✅ Complete: ${taskName}\n\n🤖 Auto-committed by ClickMongrel`;

      // Stage all changes
      execSync('git add -A', { encoding: 'utf-8' });
      
      // Create commit
      execSync(`git commit -m "${message}"`, { encoding: 'utf-8' });
      
      // Get commit hash
      const hash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      
      logger.info(`Created commit: ${hash.substring(0, 8)} - ${message.split('\n')[0]}`);
      
      return {
        hash,
        message,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn('Failed to create git commit:', error);
      return null;
    }
  }

  /**
   * Build task description from todo
   */
  private buildTaskDescription(todo: TodoItem): string {
    const sections: string[] = [];
    
    sections.push(`**Source:** Claude TodoWrite`);
    sections.push(`**Created:** ${new Date().toLocaleString()}`);
    
    if (todo.category) {
      sections.push(`**Category:** ${todo.category}`);
    }
    
    if (todo.tags && todo.tags.length > 0) {
      sections.push(`**Tags:** ${todo.tags.join(', ')}`);
    }
    
    return sections.join('\n');
  }

  /**
   * Map todo status to ClickUp status
   */
  private mapTodoStatus(status?: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'to do',
      'in_progress': 'in progress',
      'completed': 'completed'
    };
    return statusMap[status || 'pending'] || 'to do';
  }

  /**
   * Map priority to ClickUp priority number
   */
  private mapPriority(priority?: string): number {
    const priorityMap: Record<string, number> = {
      'urgent': 1,
      'high': 2,
      'normal': 3,
      'low': 4
    };
    return priorityMap[priority || 'normal'] || 3;
  }

  /**
   * Get assignees array
   */
  private getAssignees(): number[] {
    if (configManager.shouldAutoAssignUser()) {
      const assigneeId = configManager.getAssigneeUserId();
      if (assigneeId) {
        return [assigneeId];
      }
    }
    return [];
  }

  /**
   * Check if we're in a git repository
   */
  private isGitRepo(): boolean {
    try {
      execSync('git rev-parse --git-dir', { encoding: 'utf-8' });
      return true;
    } catch {
      return false;
    }
  }
}

export default WorkflowHandler;