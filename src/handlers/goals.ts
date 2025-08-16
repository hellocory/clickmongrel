import { ClickUpGoal } from '../types/index.js';
import ClickUpAPI from '../utils/clickup-api.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

export class GoalHandler {
  private api: ClickUpAPI;
  private currentGoalId: string | undefined;
  private teamId: string | undefined;

  constructor(apiKey: string) {
    this.api = new ClickUpAPI(apiKey);
    this.currentGoalId = cache.getCurrentGoal();
  }

  async initialize(): Promise<void> {
    try {
      // Get team ID
      const teams = await this.api.getTeams();
      const team = teams.find(t => t.name.includes('Ghost Codes')) || teams[0];
      this.teamId = team?.id;
      
      if (!this.teamId) {
        logger.error('No team found');
        return;
      }

      // Load current goal from cache or config
      if (!this.currentGoalId) {
        const goals = await this.api.getGoals(this.teamId);
        if (goals.length > 0) {
          const firstGoal = goals[0];
          if (firstGoal) {
            this.currentGoalId = firstGoal.id;
            cache.setCurrentGoal(this.currentGoalId);
            logger.info(`Set current goal to: ${firstGoal.name}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to initialize goal handler:', error);
    }
  }

  async getCurrentGoal(): Promise<ClickUpGoal | null> {
    if (!this.currentGoalId) {
      logger.warn('No current goal set');
      return null;
    }

    try {
      return await this.api.getGoal(this.currentGoalId);
    } catch (error) {
      logger.error(`Failed to get current goal ${this.currentGoalId}:`, error);
      return null;
    }
  }

  async switchGoal(goalId: string): Promise<ClickUpGoal> {
    try {
      const goal = await this.api.getGoal(goalId);
      this.currentGoalId = goalId;
      cache.setCurrentGoal(goalId);
      logger.info(`Switched to goal: ${goal.name}`);
      return goal;
    } catch (error) {
      logger.error(`Failed to switch to goal ${goalId}:`, error);
      throw error;
    }
  }

  async updateProgress(percentComplete: number): Promise<ClickUpGoal> {
    if (!this.currentGoalId) {
      throw new Error('No current goal set');
    }

    try {
      const goal = await this.api.updateGoalProgress(this.currentGoalId, percentComplete);
      logger.info(`Updated goal progress to ${percentComplete}%`);
      return goal;
    } catch (error) {
      logger.error(`Failed to update goal progress:`, error);
      throw error;
    }
  }

  async createGoal(name: string, description?: string): Promise<ClickUpGoal> {
    if (!this.teamId) {
      throw new Error('Team ID not initialized');
    }

    try {
      const user = await this.api.getCurrentUser();
      const goal = await this.api.createGoal(this.teamId, {
        name,
        description,
        owner: user
      });
      
      logger.info(`Created new goal: ${goal.name}`);
      return goal;
    } catch (error) {
      logger.error('Failed to create goal:', error);
      throw error;
    }
  }

  async listGoals(): Promise<ClickUpGoal[]> {
    if (!this.teamId) {
      throw new Error('Team ID not initialized');
    }

    try {
      return await this.api.getGoals(this.teamId);
    } catch (error) {
      logger.error('Failed to list goals:', error);
      throw error;
    }
  }

  async calculateProgress(): Promise<number> {
    if (!this.currentGoalId) {
      return 0;
    }

    try {
      const goal = await this.getCurrentGoal();
      if (!goal) return 0;

      // Calculate based on tasks if they're linked
      // This would need to be implemented based on how tasks are linked to goals
      // For now, return the stored progress
      return goal.percent_completed;
    } catch (error) {
      logger.error('Failed to calculate progress:', error);
      return 0;
    }
  }

  getCurrentGoalId(): string | undefined {
    return this.currentGoalId;
  }
}

export default GoalHandler;