import ClickUpAPI from './clickup-api.js';
import logger from './logger.js';
import chalk from 'chalk';

export class StatusValidator {
  private api: ClickUpAPI;
  
  // Required statuses for Tasks list
  private static readonly REQUIRED_TASK_STATUSES = [
    'to do',
    'in progress', 
    'completed'
  ];
  
  // Optional but recommended statuses for Tasks list
  private static readonly RECOMMENDED_TASK_STATUSES = [
    'future',
    'fixing'
  ];
  
  // Required statuses for Commits list
  private static readonly REQUIRED_COMMIT_STATUSES = [
    'development update',
    'development push',
    'merged'
  ];
  
  // Optional but recommended statuses for Commits list
  private static readonly RECOMMENDED_COMMIT_STATUSES = [
    'upstream merge',
    'production/testing',
    'production/staging', 
    'production/final'
  ];

  constructor(apiKey: string) {
    this.api = new ClickUpAPI(apiKey);
  }

  /**
   * Validate that required statuses are configured
   * @throws Error if required statuses are missing
   */
  async validateListStatuses(listId: string, listType: 'tasks' | 'commits'): Promise<{
    valid: boolean;
    missing: string[];
    missingOptional: string[];
    configured: string[];
  }> {
    try {
      const statuses = await this.api.getListStatuses(listId);
      const statusNames = statuses.map(s => s.status.toLowerCase());
      
      const required = listType === 'tasks' 
        ? StatusValidator.REQUIRED_TASK_STATUSES
        : StatusValidator.REQUIRED_COMMIT_STATUSES;
        
      const recommended = listType === 'tasks'
        ? StatusValidator.RECOMMENDED_TASK_STATUSES
        : StatusValidator.RECOMMENDED_COMMIT_STATUSES;
      
      // Check required statuses
      const missing = required.filter(req => 
        !statusNames.includes(req.toLowerCase())
      );
      
      // Check recommended statuses
      const missingOptional = recommended.filter(rec =>
        !statusNames.includes(rec.toLowerCase())
      );
      
      const result = {
        valid: missing.length === 0,
        missing,
        missingOptional,
        configured: statusNames
      };
      
      if (!result.valid) {
        const errorMsg = `
╔════════════════════════════════════════════════════════════════╗
║                    ⚠️  STATUS CONFIGURATION ERROR              ║
╚════════════════════════════════════════════════════════════════╝

The ${listType} list is missing REQUIRED statuses!

Missing Required Statuses:
${missing.map(s => `  ❌ "${s}"`).join('\n')}

${missingOptional.length > 0 ? `Missing Optional Statuses:
${missingOptional.map(s => `  ⚠️  "${s}"`).join('\n')}
` : ''}
Currently Configured:
${statusNames.map(s => `  • ${s}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO FIX:
1. Open ClickUp and navigate to your ${listType === 'tasks' ? 'Tasks' : 'Commits'} list
2. Click the three dots (⋮) menu → "Edit statuses"
3. Select "Use custom statuses" (NOT "Inherit from Space")
4. Add these EXACT status names (case-sensitive):
   ${required.map(s => `• ${s}`).join('\n   ')}
5. Click "Apply changes"
6. Run setup again

For detailed instructions, see: .claude/clickup/STATUS_SETUP_GUIDE.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        
        logger.error(errorMsg);
        
        // Also log to console for visibility
        console.error(chalk.red.bold(errorMsg));
        
        throw new Error(`Cannot sync: ${listType} list is missing required statuses: ${missing.join(', ')}`);
      }
      
      if (missingOptional.length > 0) {
        logger.warn(`Optional statuses missing for ${listType}: ${missingOptional.join(', ')}`);
      }
      
      return result;
      
    } catch (error: any) {
      if (error.message?.includes('Cannot sync')) {
        throw error; // Re-throw our validation error
      }
      logger.error(`Failed to validate statuses for list ${listId}:`, error);
      throw new Error(`Failed to validate list statuses: ${error.message}`);
    }
  }
  
  /**
   * Validate both lists
   */
  async validateAllLists(tasksListId: string, commitsListId: string): Promise<{
    tasksValid: boolean;
    commitsValid: boolean;
    canProceed: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let tasksValid = false;
    let commitsValid = false;
    
    // Validate Tasks list
    try {
      const tasksResult = await this.validateListStatuses(tasksListId, 'tasks');
      tasksValid = tasksResult.valid;
      if (!tasksValid) {
        errors.push(`Tasks list missing: ${tasksResult.missing.join(', ')}`);
      }
    } catch (error: any) {
      errors.push(`Tasks list validation failed: ${error.message}`);
    }
    
    // Validate Commits list
    try {
      const commitsResult = await this.validateListStatuses(commitsListId, 'commits');
      commitsValid = commitsResult.valid;
      if (!commitsValid) {
        errors.push(`Commits list missing: ${commitsResult.missing.join(', ')}`);
      }
    } catch (error: any) {
      errors.push(`Commits list validation failed: ${error.message}`);
    }
    
    return {
      tasksValid,
      commitsValid,
      canProceed: tasksValid && commitsValid,
      errors
    };
  }
  
  /**
   * Get status configuration instructions
   */
  static getInstructions(): string {
    return `
╔════════════════════════════════════════════════════════════════╗
║              📋 CLICKUP STATUS CONFIGURATION REQUIRED          ║
╚════════════════════════════════════════════════════════════════╝

Before using ClickMongrel, you MUST configure custom statuses in ClickUp.

TASKS LIST - Required Statuses:
${StatusValidator.REQUIRED_TASK_STATUSES.map(s => `  • ${s}`).join('\n')}

TASKS LIST - Optional Statuses:
${StatusValidator.RECOMMENDED_TASK_STATUSES.map(s => `  • ${s}`).join('\n')}

COMMITS LIST - Required Statuses:
${StatusValidator.REQUIRED_COMMIT_STATUSES.map(s => `  • ${s}`).join('\n')}

COMMITS LIST - Optional Statuses:
${StatusValidator.RECOMMENDED_COMMIT_STATUSES.map(s => `  • ${s}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For detailed setup instructions, see:
.claude/clickup/STATUS_SETUP_GUIDE.md
`;
  }
}

export default StatusValidator;