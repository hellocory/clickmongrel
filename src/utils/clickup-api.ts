import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  ClickUpTask, 
  ClickUpSpace, 
  ClickUpList, 
  ClickUpGoal, 
  ClickUpStatus,
  ClickUpUser,
  ClickUpTeam,
  CommitInfo 
} from '../types/index.js';
import cache from './cache.js';
import logger from './logger.js';

export class ClickUpAPI {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      this.handleError
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      logger.error(`ClickUp API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      
      switch (error.response.status) {
        case 401:
          throw new Error('Invalid ClickUp API key');
        case 403:
          throw new Error('Access forbidden - check permissions');
        case 404:
          throw new Error('Resource not found');
        case 429:
          throw new Error('Rate limit exceeded - please wait');
        default:
          throw new Error(`ClickUp API error: ${error.response.status}`);
      }
    } else if (error.request) {
      logger.error('No response from ClickUp API');
      throw new Error('No response from ClickUp API - check connection');
    } else {
      logger.error(`Request error: ${error.message}`);
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  // Generic request method for direct API calls
  async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<any> {
    const response = await this.client.request({
      url: endpoint,
      method,
      data
    });
    return response.data;
  }

  // User methods
  async getCurrentUser(): Promise<ClickUpUser> {
    const response = await this.client.get('/user');
    return response.data.user;
  }

  // Team methods
  async getTeams(): Promise<ClickUpTeam[]> {
    const response = await this.client.get('/team');
    return response.data.teams;
  }

  // Space methods
  async getSpaces(teamId: string): Promise<ClickUpSpace[]> {
    const cachedSpaces = cache.getSpaces();
    if (cachedSpaces.length > 0) {
      return cachedSpaces;
    }

    const response = await this.client.get(`/team/${teamId}/space`);
    const spaces = response.data.spaces;
    cache.setSpaces(spaces);
    return spaces;
  }

  async getSpace(spaceId: string): Promise<ClickUpSpace> {
    const cached = cache.getSpace(spaceId);
    if (cached) return cached;

    const response = await this.client.get(`/space/${spaceId}`);
    const space = response.data;
    cache.setSpace(space);
    return space;
  }

  // List methods
  async getLists(spaceId: string): Promise<ClickUpList[]> {
    const response = await this.client.get(`/space/${spaceId}/list`);
    const lists = response.data.lists;
    lists.forEach((list: ClickUpList) => cache.setList(list));
    return lists;
  }

  async getList(listId: string): Promise<ClickUpList> {
    const cached = cache.getList(listId);
    if (cached) return cached;

    const response = await this.client.get(`/list/${listId}`);
    const list = response.data;
    cache.setList(list);
    return list;
  }

  // Task methods
  async getTasks(listId: string, includeSubtasks = false): Promise<ClickUpTask[]> {
    const response = await this.client.get(`/list/${listId}/task`, {
      params: {
        include_subtasks: includeSubtasks,
        include_closed: false,
        include_tags: true
      }
    });
    const tasks = response.data.tasks;
    cache.setTasks(tasks);
    return tasks;
  }

  async getTask(taskId: string): Promise<ClickUpTask> {
    const cached = cache.getTask(taskId);
    if (cached) return cached;

    const response = await this.client.get(`/task/${taskId}?include_tags=true`);
    const task = response.data;
    cache.setTask(task);
    return task;
  }

  async createTask(listId: string, task: Partial<ClickUpTask>): Promise<ClickUpTask> {
    const response = await this.client.post(`/list/${listId}/task`, {
      name: task.name,
      description: task.description,
      status: task.status?.status,
      priority: task.priority?.id || task.priority,
      due_date: task.due_date,
      start_date: task.start_date,
      time_estimate: task.time_estimate,
      assignees: task.assignees, // Already an array of IDs from sync handler
      tags: task.tags, // Added tags!
      custom_fields: task.custom_fields
    });
    
    const newTask = response.data;
    cache.setTask(newTask);
    logger.info(`Created task: ${newTask.id} - ${newTask.name}`);
    return newTask;
  }

  async updateTask(taskId: string, updates: Partial<ClickUpTask>): Promise<ClickUpTask> {
    const response = await this.client.put(`/task/${taskId}`, {
      name: updates.name,
      description: updates.description,
      status: updates.status?.status,
      priority: updates.priority?.id,
      due_date: updates.due_date,
      start_date: updates.start_date,
      time_estimate: updates.time_estimate,
      assignees: {
        add: updates.assignees?.map(a => a.id),
        rem: []
      },
      custom_fields: updates.custom_fields
    });
    
    const updatedTask = response.data;
    cache.setTask(updatedTask);
    logger.info(`Updated task: ${taskId}`);
    return updatedTask;
  }

  async updateTaskStatus(taskId: string, status: string): Promise<ClickUpTask> {
    const response = await this.client.put(`/task/${taskId}`, { status });
    const updatedTask = response.data;
    cache.setTask(updatedTask);
    logger.info(`Updated task ${taskId} status to: ${status}`);
    return updatedTask;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.client.delete(`/task/${taskId}`);
    cache.del(`task:${taskId}`);
    logger.info(`Deleted task: ${taskId}`);
  }

  // Comment methods for tasks
  async addTaskComment(taskId: string, comment: string): Promise<void> {
    await this.client.post(`/task/${taskId}/comment`, {
      comment_text: comment,
      notify_all: false
    });
    logger.info(`Added comment to task: ${taskId}`);
  }

  async linkCommitToTask(taskId: string, commit: CommitInfo): Promise<void> {
    const comment = `🔗 **Git Commit**\n\n` +
      `**Hash:** \`${commit.hash}\`\n` +
      `**Message:** ${commit.message}\n` +
      `**Author:** ${commit.author}\n` +
      `**Time:** ${commit.timestamp}`;
    
    await this.addTaskComment(taskId, comment);
    logger.info(`Linked commit ${commit.hash} to task ${taskId}`);
  }

  // Goal methods
  async getGoals(teamId: string): Promise<ClickUpGoal[]> {
    const response = await this.client.get(`/team/${teamId}/goal`);
    return response.data.goals;
  }

  async getGoal(goalId: string): Promise<ClickUpGoal> {
    const cached = cache.getGoal(goalId);
    if (cached) return cached;

    const response = await this.client.get(`/goal/${goalId}`);
    const goal = response.data;
    cache.setGoal(goal);
    return goal;
  }

  async createGoal(teamId: string, goal: Partial<ClickUpGoal>): Promise<ClickUpGoal> {
    const response = await this.client.post(`/team/${teamId}/goal`, {
      name: goal.name,
      description: goal.description,
      due_date: goal.due_date,
      start_date: goal.start_date,
      owner: goal.owner?.id
    });
    
    const newGoal = response.data.goal || response.data;
    cache.setGoal(newGoal);
    logger.info(`Created goal: ${newGoal.id} - ${newGoal.name}`);
    return newGoal;
  }

  async updateGoalProgress(goalId: string, percentComplete: number): Promise<ClickUpGoal> {
    const response = await this.client.put(`/goal/${goalId}`, {
      percent_completed: percentComplete
    });
    
    const updatedGoal = response.data.goal || response.data;
    cache.setGoal(updatedGoal);
    logger.info(`Updated goal ${goalId} progress to: ${percentComplete}%`);
    return updatedGoal;
  }

  // Status methods
  async getListStatuses(listId: string): Promise<ClickUpStatus[]> {
    const list = await this.getList(listId);
    return list.statuses;
  }

  async getSpaceStatuses(spaceId: string): Promise<ClickUpStatus[]> {
    const space = await this.getSpace(spaceId);
    return space.statuses;
  }


  // Custom field methods
  async getCustomFields(listId: string): Promise<unknown[]> {
    const response = await this.client.get(`/list/${listId}/field`);
    return response.data.fields;
  }

  async createCustomField(listId: string, field: {
    name: string;
    type: string;
    description?: string;
    required?: boolean;
  }): Promise<any> {
    const response = await this.client.post(`/list/${listId}/field`, field);
    logger.info(`Created custom field "${field.name}" in list ${listId}`);
    return response.data;
  }

  async updateCustomField(taskId: string, fieldId: string, value: string | number | boolean): Promise<void> {
    await this.client.post(`/task/${taskId}/field/${fieldId}`, { value });
    logger.info(`Updated custom field ${fieldId} for task ${taskId}`);
  }

  // Batch operations
  async batchUpdateTaskStatuses(updates: Array<{ taskId: string; status: string }>): Promise<void> {
    const promises = updates.map(({ taskId, status }) => 
      this.updateTaskStatus(taskId, status).catch(err => {
        logger.error(`Failed to update task ${taskId}: ${err.message}`);
        return null;
      })
    );
    
    const results = await Promise.all(promises);
    const successful = results.filter(Boolean).length;
    logger.info(`Batch updated ${successful}/${updates.length} task statuses`);
  }

  // Search methods
  async searchTasks(teamId: string, query: string): Promise<ClickUpTask[]> {
    const response = await this.client.get(`/team/${teamId}/task`, {
      params: {
        query,
        include_closed: false
      }
    });
    return response.data.tasks;
  }
}

export default ClickUpAPI;