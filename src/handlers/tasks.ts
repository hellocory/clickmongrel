import { ClickUpTask } from '../types/index.js';
import ClickUpAPI from '../utils/clickup-api.js';
import configManager from '../config/index.js';
import logger from '../utils/logger.js';

export class TaskHandler {
  private api: ClickUpAPI;
  private currentTaskId: string | undefined;
  private listId: string | undefined;

  constructor(apiKey: string) {
    this.api = new ClickUpAPI(apiKey);
  }

  async initialize(): Promise<void> {
    try {
      // Get default list
      const defaultSpace = configManager.getDefaultSpace();
      const defaultList = configManager.getDefaultList();
      
      if (defaultSpace && defaultList) {
        const teams = await this.api.getTeams();
        const team = teams.find(t => t.name.includes('Ghost Codes')) || teams[0];
        
        if (team) {
          const spaces = await this.api.getSpaces(team.id);
          const space = spaces.find(s => s.name === defaultSpace) || spaces[0];
          
          if (space) {
            const lists = await this.api.getLists(space.id);
            const list = lists.find(l => l.name === defaultList) || lists[0];
            
            if (list) {
              this.listId = list.id;
              logger.info(`TaskHandler initialized with list: ${list.name}`);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to initialize task handler:', error);
    }
  }

  async getTask(taskId: string): Promise<ClickUpTask> {
    try {
      const task = await this.api.getTask(taskId);
      this.currentTaskId = taskId;
      return task;
    } catch (error) {
      logger.error(`Failed to get task ${taskId}:`, error);
      throw error;
    }
  }

  async createTask(name: string, description?: string): Promise<ClickUpTask> {
    if (!this.listId) {
      throw new Error('List ID not initialized');
    }

    try {
      const task = await this.api.createTask(this.listId, {
        name,
        description
      });
      
      this.currentTaskId = task.id;
      logger.info(`Created task: ${task.name}`);
      return task;
    } catch (error) {
      logger.error('Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(taskId: string, updates: Partial<ClickUpTask>): Promise<ClickUpTask> {
    try {
      const task = await this.api.updateTask(taskId, updates);
      logger.info(`Updated task: ${task.name}`);
      return task;
    } catch (error) {
      logger.error(`Failed to update task ${taskId}:`, error);
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, status: string): Promise<ClickUpTask> {
    try {
      const task = await this.api.updateTaskStatus(taskId, status);
      logger.info(`Updated task ${taskId} status to ${status}`);
      return task;
    } catch (error) {
      logger.error(`Failed to update task status:`, error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.api.deleteTask(taskId);
      if (this.currentTaskId === taskId) {
        this.currentTaskId = undefined;
      }
      logger.info(`Deleted task: ${taskId}`);
    } catch (error) {
      logger.error(`Failed to delete task ${taskId}:`, error);
      throw error;
    }
  }

  async getTasks(): Promise<ClickUpTask[]> {
    if (!this.listId) {
      throw new Error('List ID not initialized');
    }

    try {
      return await this.api.getTasks(this.listId);
    } catch (error) {
      logger.error('Failed to get tasks:', error);
      throw error;
    }
  }

  async searchTasks(query: string): Promise<ClickUpTask[]> {
    try {
      const teams = await this.api.getTeams();
      const team = teams.find(t => t.name.includes('Ghost Codes')) || teams[0];
      
      if (!team) {
        throw new Error('No team found');
      }

      return await this.api.searchTasks(team.id, query);
    } catch (error) {
      logger.error(`Failed to search tasks with query "${query}":`, error);
      throw error;
    }
  }

  getCurrentTaskId(): string | undefined {
    return this.currentTaskId;
  }

  setCurrentTaskId(taskId: string): void {
    this.currentTaskId = taskId;
    logger.info(`Set current task to: ${taskId}`);
  }

  async addComment(taskId: string, comment: string): Promise<void> {
    try {
      await this.api.addTaskComment(taskId, comment);
      logger.info(`Added comment to task ${taskId}`);
    } catch (error) {
      logger.error(`Failed to add comment to task ${taskId}:`, error);
      throw error;
    }
  }

  async updateCustomField(taskId: string, fieldId: string, value: string | number | boolean): Promise<void> {
    try {
      await this.api.updateCustomField(taskId, fieldId, value);
      logger.info(`Updated custom field ${fieldId} for task ${taskId}`);
    } catch (error) {
      logger.error(`Failed to update custom field:`, error);
      throw error;
    }
  }
}

export default TaskHandler;