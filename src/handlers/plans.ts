import { TodoItem, ClickUpTask } from '../types/index.js';
import ClickUpAPI from '../utils/clickup-api.js';
import SyncHandler from './sync.js';
import GoalHandler from './goals.js';
import configManager from '../config/index.js';
import logger from '../utils/logger.js';
import { execSync } from 'child_process';

export interface Plan {
  id: string;
  title: string;
  description?: string;
  items: PlanItem[];
  goalId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

export interface PlanItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  taskId?: string;
  parentTaskId?: string;
  commit?: {
    hash: string;
    message: string;
    timestamp: string;
  };
}

export class PlanHandler {
  private api: ClickUpAPI;
  private syncHandler: SyncHandler;
  private goalHandler: GoalHandler;
  private activePlans: Map<string, Plan>;
  private listId: string | undefined;

  constructor(apiKey: string) {
    this.api = new ClickUpAPI(apiKey);
    this.syncHandler = new SyncHandler(apiKey);
    this.goalHandler = new GoalHandler(apiKey);
    this.activePlans = new Map();
  }

  async initialize(): Promise<void> {
    await this.syncHandler.initialize();
    await this.goalHandler.initialize();
    this.listId = this.syncHandler.getSyncStatus().listId;
    logger.info('PlanHandler initialized');
  }

  /**
   * Create a new plan which becomes a Goal/Parent task in ClickUp
   */
  async createPlan(plan: Plan): Promise<Plan> {
    try {
      // 1. Create the main task (acts as the goal)
      const goalTask = await this.createGoalTask(plan);
      plan.goalId = goalTask.id;
      
      // 2. Create subtasks for each plan item
      for (const item of plan.items) {
        const subtask = await this.createSubtask(item, goalTask.id);
        item.taskId = subtask.id;
        item.parentTaskId = goalTask.id;
      }
      
      // 3. Store the plan
      this.activePlans.set(plan.id, plan);
      
      logger.info(`Created plan "${plan.title}" with ${plan.items.length} subtasks`);
      return plan;
    } catch (error) {
      logger.error('Failed to create plan:', error);
      throw error;
    }
  }

  /**
   * Create the main goal task in ClickUp
   */
  private async createGoalTask(plan: Plan): Promise<ClickUpTask> {
    if (!this.listId) {
      throw new Error('List ID not initialized');
    }

    const taskData: any = {
      name: `🎯 ${plan.title}`,
      description: this.buildGoalDescription(plan),
      status: 'to do',
      priority: 2, // High priority for goals
      tags: ['goal', 'plan', 'claude'],
      time_estimate: plan.items.length * 3600000, // 1 hour per subtask estimate
      assignees: []
    };

    // Add assignee if configured
    if (configManager.shouldAutoAssignUser()) {
      const assigneeId = configManager.getAssigneeUserId();
      if (assigneeId) {
        taskData.assignees = [assigneeId];
      }
    }

    const task = await this.api.createTask(this.listId, taskData);
    logger.info(`Created goal task: ${task.id} - ${task.name}`);
    return task;
  }

  /**
   * Build a rich description for the goal task
   */
  private buildGoalDescription(plan: Plan): string {
    const sections: string[] = [];
    
    sections.push(`# ${plan.title}`);
    sections.push('');
    
    if (plan.description) {
      sections.push(plan.description);
      sections.push('');
    }
    
    sections.push('## 📋 Plan Items');
    sections.push('');
    
    plan.items.forEach((item, index) => {
      const status = item.status === 'completed' ? '✅' : '⏳';
      sections.push(`${index + 1}. ${status} ${item.content}`);
    });
    
    sections.push('');
    sections.push('---');
    sections.push('🤖 **Source:** Claude AI Planning');
    sections.push(`📅 **Created:** ${new Date(plan.created_at).toLocaleString()}`);
    sections.push(`🆔 **Plan ID:** ${plan.id}`);
    
    return sections.join('\n');
  }

  /**
   * Create a subtask linked to the parent goal task
   */
  private async createSubtask(item: PlanItem, parentTaskId: string): Promise<ClickUpTask> {
    if (!this.listId) {
      throw new Error('List ID not initialized');
    }

    const taskData: any = {
      name: item.content,
      description: `Subtask of goal: ${parentTaskId}\n\nPlan Item ID: ${item.id}`,
      status: 'to do',
      priority: 3, // Normal priority for subtasks
      parent: parentTaskId,
      tags: ['subtask', 'claude'],
      assignees: []
    };

    // Add assignee if configured
    if (configManager.shouldAutoAssignUser()) {
      const assigneeId = configManager.getAssigneeUserId();
      if (assigneeId) {
        taskData.assignees = [assigneeId];
      }
    }

    const task = await this.api.createTask(this.listId, taskData);
    logger.info(`Created subtask: ${task.id} - ${task.name}`);
    return task;
  }

  /**
   * Mark a plan item as completed, create a commit, and link it
   */
  async completePlanItem(planId: string, itemId: string, commitMessage?: string): Promise<void> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const item = plan.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Plan item ${itemId} not found`);
    }

    if (!item.taskId) {
      throw new Error(`Plan item ${itemId} has no associated task`);
    }

    try {
      // 1. Update the subtask status to completed
      await this.api.updateTaskStatus(item.taskId, 'completed');
      item.status = 'completed';
      
      // 2. Create a git commit (if in a git repo)
      if (this.isGitRepo()) {
        const commit = await this.createCommit(item, commitMessage);
        item.commit = commit;
        
        // 3. Link the commit to the task
        await this.linkCommitToTask(item.taskId, commit);
      }
      
      // 4. Update goal progress
      await this.updateGoalProgress(plan);
      
      // 5. Check if all items are completed
      const allCompleted = plan.items.every(i => i.status === 'completed');
      if (allCompleted) {
        await this.completePlan(plan);
      }
      
      logger.info(`Completed plan item: ${item.content}`);
    } catch (error) {
      logger.error(`Failed to complete plan item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Create a git commit for the completed item
   */
  private async createCommit(item: PlanItem, customMessage?: string): Promise<any> {
    try {
      const message = customMessage || `✅ Complete: ${item.content}

Plan Item ID: ${item.id}
Task ID: ${item.taskId}

🤖 Auto-committed by ClickMongrel`;

      // Stage all changes
      execSync('git add -A', { encoding: 'utf-8' });
      
      // Create commit
      execSync(`git commit -m "${message}"`, { encoding: 'utf-8' });
      
      // Get commit hash
      const hash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      
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
   * Link a commit to a ClickUp task via comment
   */
  private async linkCommitToTask(taskId: string, commit: any): Promise<void> {
    if (!commit) return;
    
    try {
      const comment = `🔗 **Commit:** \`${commit.hash.substring(0, 8)}\`\n\n${commit.message}`;
      await this.api.addTaskComment(taskId, comment);
      logger.info(`Linked commit ${commit.hash} to task ${taskId}`);
    } catch (error) {
      logger.warn('Failed to link commit to task:', error);
    }
  }

  /**
   * Update the goal task progress based on completed subtasks
   */
  private async updateGoalProgress(plan: Plan): Promise<void> {
    if (!plan.goalId) return;
    
    const completedCount = plan.items.filter(i => i.status === 'completed').length;
    const totalCount = plan.items.length;
    const percentComplete = Math.round((completedCount / totalCount) * 100);
    
    try {
      // Update the goal task description with progress
      const updatedDescription = this.buildGoalDescription(plan);
      await this.api.updateTask(plan.goalId, {
        description: updatedDescription
      });
      
      // Add a comment about progress
      const progressComment = `📊 **Progress Update:** ${completedCount}/${totalCount} items completed (${percentComplete}%)`;
      await this.api.addTaskComment(plan.goalId, progressComment);
      
      logger.info(`Updated goal progress: ${percentComplete}%`);
    } catch (error) {
      logger.warn('Failed to update goal progress:', error);
    }
  }

  /**
   * Mark the entire plan/goal as completed
   */
  private async completePlan(plan: Plan): Promise<void> {
    if (!plan.goalId) return;
    
    try {
      // Update goal task status
      await this.api.updateTaskStatus(plan.goalId, 'completed');
      plan.status = 'completed';
      
      // Create final commit
      if (this.isGitRepo()) {
        const finalCommit = await this.createCommit(
          { id: plan.id, content: plan.title } as PlanItem,
          `🎉 Complete plan: ${plan.title}\n\nAll ${plan.items.length} subtasks completed successfully!`
        );
        
        if (finalCommit) {
          await this.linkCommitToTask(plan.goalId, finalCommit);
        }
      }
      
      // Add completion comment
      const completionComment = `🎉 **Plan Completed!**\n\nAll ${plan.items.length} subtasks have been successfully completed.\n\n${new Date().toLocaleString()}`;
      await this.api.addTaskComment(plan.goalId, completionComment);
      
      logger.info(`Completed plan: ${plan.title}`);
    } catch (error) {
      logger.error('Failed to complete plan:', error);
    }
  }

  /**
   * Get the status of a plan
   */
  getPlanStatus(planId: string): Plan | undefined {
    return this.activePlans.get(planId);
  }

  /**
   * Get all active plans
   */
  getActivePlans(): Plan[] {
    return Array.from(this.activePlans.values());
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

  /**
   * Create a plan from TodoWrite items
   */
  async createPlanFromTodos(title: string, todos: TodoItem[]): Promise<Plan> {
    const plan: Plan = {
      id: `plan-${Date.now()}`,
      title,
      description: `Plan created from ${todos.length} TodoWrite items`,
      items: todos.map(todo => ({
        id: todo.id,
        content: todo.content,
        status: todo.status as any
      })),
      status: 'in_progress',
      created_at: new Date().toISOString()
    };
    
    return await this.createPlan(plan);
  }
}

export default PlanHandler;