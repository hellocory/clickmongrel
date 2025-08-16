import { TodoItem } from '../types/index.js';

export class TaskAnalyzer {
  private static categoryKeywords = {
    'development': ['code', 'implement', 'build', 'develop', 'create', 'add', 'fix', 'debug', 'refactor', 'optimize'],
    'testing': ['test', 'verify', 'check', 'validate', 'ensure', 'confirm', 'debug'],
    'documentation': ['document', 'write', 'docs', 'readme', 'guide', 'explain', 'notes'],
    'planning': ['plan', 'design', 'architecture', 'strategy', 'outline', 'research'],
    'deployment': ['deploy', 'release', 'publish', 'launch', 'ship', 'build'],
    'maintenance': ['update', 'upgrade', 'maintain', 'clean', 'organize', 'refactor'],
    'research': ['investigate', 'analyze', 'explore', 'study', 'examine', 'review'],
    'setup': ['setup', 'configure', 'install', 'initialize', 'prepare'],
    'bug': ['bug', 'error', 'issue', 'problem', 'broken', 'fail'],
    'feature': ['feature', 'enhancement', 'improvement', 'new', 'add']
  };

  private static priorityKeywords = {
    'urgent': ['urgent', 'critical', 'asap', 'emergency', 'blocker', 'hotfix'],
    'high': ['important', 'high', 'priority', 'soon', 'deadline'],
    'low': ['minor', 'later', 'nice-to-have', 'optional', 'low']
  };

  private static timeEstimates = {
    'quick': 15 * 60 * 1000, // 15 minutes
    'short': 30 * 60 * 1000, // 30 minutes
    'medium': 2 * 60 * 60 * 1000, // 2 hours
    'long': 4 * 60 * 60 * 1000, // 4 hours
    'complex': 8 * 60 * 60 * 1000 // 8 hours
  };

  static analyzeTodo(todo: TodoItem): TodoItem {
    const content = todo.content.toLowerCase();
    const originalContent = todo.content;

    // Extract title (first meaningful part)
    const title = this.extractTitle(originalContent);

    // Detect category
    const category = this.detectCategory(content);

    // Generate tags
    const tags = this.generateTags(originalContent, category);

    // Detect priority
    const priority = this.detectPriority(content);

    // Estimate time
    const estimated_time = this.estimateTime(content, category);

    // Add timestamps if missing
    const created_at = todo.created_at || new Date().toISOString();
    const started_at = todo.status === 'in_progress' && !todo.started_at 
      ? new Date().toISOString() 
      : todo.started_at;
    const completed_at = todo.status === 'completed' && !todo.completed_at 
      ? new Date().toISOString() 
      : todo.completed_at;

    // Calculate actual time if completed
    let actual_time = todo.actual_time;
    if (completed_at && started_at && !actual_time) {
      actual_time = new Date(completed_at).getTime() - new Date(started_at).getTime();
    }

    return {
      ...todo,
      title,
      category,
      tags,
      priority,
      estimated_time,
      actual_time,
      created_at,
      started_at,
      completed_at
    };
  }

  private static extractTitle(content: string): string {
    // Remove common prefixes and clean up
    let title = content
      .replace(/^(TODO|TASK|FIX|ADD|UPDATE|CREATE|IMPLEMENT|BUILD|TEST|VERIFY):\s*/i, '')
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .trim();

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Limit length
    if (title.length > 80) {
      title = title.substring(0, 77) + '...';
    }

    return title;
  }

  private static detectCategory(content: string): string {
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return category;
      }
    }
    return 'general';
  }

  private static generateTags(content: string, category: string): string[] {
    const tags: string[] = [category];
    const lowerContent = content.toLowerCase();

    // Technology tags
    const techKeywords = {
      'typescript': ['typescript', 'ts'],
      'javascript': ['javascript', 'js', 'node'],
      'react': ['react', 'jsx', 'component'],
      'api': ['api', 'endpoint', 'rest', 'graphql'],
      'database': ['database', 'db', 'sql', 'mongo'],
      'frontend': ['frontend', 'ui', 'interface', 'css'],
      'backend': ['backend', 'server', 'service'],
      'mcp': ['mcp', 'clickmongrel'],
      'clickup': ['clickup', 'task', 'project'],
      'sync': ['sync', 'synchronize', 'integration'],
      'config': ['config', 'configuration', 'setup', 'settings']
    };

    for (const [tag, keywords] of Object.entries(techKeywords)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        tags.push(tag);
      }
    }

    // Action-based tags
    if (lowerContent.includes('fix') || lowerContent.includes('bug')) {
      tags.push('bugfix');
    }
    if (lowerContent.includes('new') || lowerContent.includes('add')) {
      tags.push('feature');
    }
    if (lowerContent.includes('improve') || lowerContent.includes('enhance')) {
      tags.push('enhancement');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private static detectPriority(content: string): 'low' | 'normal' | 'high' | 'urgent' {
    for (const [priority, keywords] of Object.entries(this.priorityKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return priority as 'low' | 'normal' | 'high' | 'urgent';
      }
    }
    return 'normal';
  }

  private static estimateTime(content: string, category: string): number {
    // Quick tasks
    if (content.includes('quick') || content.includes('simple') || content.includes('minor')) {
      return this.timeEstimates.quick;
    }

    // Complex tasks
    if (content.includes('complex') || content.includes('architecture') || content.includes('system')) {
      return this.timeEstimates.complex;
    }

    // Category-based estimates
    switch (category) {
      case 'setup':
      case 'configuration':
        return this.timeEstimates.short;
      
      case 'testing':
      case 'documentation':
        return this.timeEstimates.short;
      
      case 'development':
      case 'feature':
        return this.timeEstimates.medium;
      
      case 'research':
      case 'planning':
        return this.timeEstimates.long;
      
      default:
        return this.timeEstimates.medium;
    }
  }

  static formatDuration(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }

  static calculateEfficiency(estimated: number, actual: number): number {
    if (!estimated || !actual) return 0;
    return Math.round((estimated / actual) * 100);
  }
}