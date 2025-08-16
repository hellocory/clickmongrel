import NodeCache from 'node-cache';
import { ClickUpTask, ClickUpSpace, ClickUpList, ClickUpGoal, SpaceStatusConfig } from '../types/index.js';
import logger from './logger.js';

class CacheManager {
  private cache: NodeCache;
  private taskCache: NodeCache;
  private spaceCache: NodeCache;
  private statusCache: NodeCache;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes default
    this.taskCache = new NodeCache({ stdTTL: 60 }); // 1 minute for tasks
    this.spaceCache = new NodeCache({ stdTTL: 3600 }); // 1 hour for spaces
    this.statusCache = new NodeCache({ stdTTL: 3600 }); // 1 hour for statuses
  }

  // Task caching
  setTask(task: ClickUpTask): void {
    this.taskCache.set(task.id, task);
    logger.debug(`Cached task: ${task.id}`);
  }

  getTask(taskId: string): ClickUpTask | undefined {
    return this.taskCache.get<ClickUpTask>(taskId);
  }

  setTasks(tasks: ClickUpTask[], listId?: string): void {
    tasks.forEach(task => this.setTask(task));
    // Also cache the list of tasks for this list
    if (listId) {
      this.taskCache.set(`list:${listId}`, tasks);
    }
  }

  getTasks(listId?: string): ClickUpTask[] {
    if (listId) {
      // Try to get the cached list of tasks for this specific list
      const listTasks = this.taskCache.get<ClickUpTask[]>(`list:${listId}`);
      if (listTasks) return listTasks;
    }
    // Fallback to getting all cached tasks
    const keys = this.taskCache.keys().filter(k => !k.startsWith('list:'));
    return keys.map(key => this.taskCache.get<ClickUpTask>(key)).filter(Boolean) as ClickUpTask[];
  }

  // Space caching
  setSpace(space: ClickUpSpace): void {
    this.spaceCache.set(space.id, space);
    logger.debug(`Cached space: ${space.id}`);
  }

  getSpace(spaceId: string): ClickUpSpace | undefined {
    return this.spaceCache.get<ClickUpSpace>(spaceId);
  }

  setSpaces(spaces: ClickUpSpace[]): void {
    spaces.forEach(space => this.setSpace(space));
  }

  getSpaces(): ClickUpSpace[] {
    const keys = this.spaceCache.keys();
    return keys.map(key => this.spaceCache.get<ClickUpSpace>(key)).filter(Boolean) as ClickUpSpace[];
  }

  clearSpaces(): void {
    this.spaceCache.flushAll();
    logger.debug('Cleared space cache');
  }

  // List caching
  setList(list: ClickUpList): void {
    this.cache.set(`list:${list.id}`, list, 1800); // 30 minutes
    logger.debug(`Cached list: ${list.id}`);
  }

  getList(listId: string): ClickUpList | undefined {
    return this.cache.get<ClickUpList>(`list:${listId}`);
  }

  // Goal caching
  setGoal(goal: ClickUpGoal): void {
    this.cache.set(`goal:${goal.id}`, goal, 600); // 10 minutes
    logger.debug(`Cached goal: ${goal.id}`);
  }

  getGoal(goalId: string): ClickUpGoal | undefined {
    return this.cache.get<ClickUpGoal>(`goal:${goalId}`);
  }

  setCurrentGoal(goalId: string): void {
    this.cache.set('current_goal', goalId, 0); // No expiry
  }

  getCurrentGoal(): string | undefined {
    return this.cache.get<string>('current_goal');
  }

  // Status configuration caching
  setStatusConfig(config: SpaceStatusConfig): void {
    this.statusCache.set('status_config', config);
    logger.debug('Cached status configuration');
  }

  getStatusConfig(): SpaceStatusConfig | undefined {
    return this.statusCache.get<SpaceStatusConfig>('status_config');
  }

  // Generic caching methods
  set(key: string, value: unknown, ttl?: number): void {
    if (ttl) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  del(key: string): void {
    this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
    this.taskCache.flushAll();
    this.spaceCache.flushAll();
    this.statusCache.flushAll();
    logger.info('All caches flushed');
  }

  // Statistics
  getStats() {
    return {
      general: this.cache.getStats(),
      tasks: this.taskCache.getStats(),
      spaces: this.spaceCache.getStats(),
      statuses: this.statusCache.getStats()
    };
  }
}

export default new CacheManager();