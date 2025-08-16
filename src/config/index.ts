import { ProjectConfig, SpaceStatusConfig } from '../types/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export class ConfigManager {
  private config: ProjectConfig;
  private statusConfig: SpaceStatusConfig | undefined;
  private configPath: string;
  private statusConfigPath: string;

  constructor() {
    this.configPath = path.join(__dirname, '../../.claude/clickup/config.json');
    this.statusConfigPath = path.join(__dirname, '../../.claude/clickup/statuses.json');
    
    this.config = this.loadConfig();
    this.statusConfig = this.loadStatusConfig();
  }

  private loadConfig(): ProjectConfig {
    const defaultConfig: ProjectConfig = {
      clickup: {
        workspace_name: process.env.CLICKUP_WORKSPACE_NAME,
        workspace_id: process.env.CLICKUP_WORKSPACE_ID,
        default_space: process.env.CLICKUP_DEFAULT_SPACE || 'Ghost Codes Workspace',
        default_list: process.env.CLICKUP_DEFAULT_LIST || 'Development Tasks',
        auto_assign_user: process.env.CLICKUP_AUTO_ASSIGN === 'true',
        assignee_user_id: process.env.CLICKUP_ASSIGNEE_USER_ID ? parseInt(process.env.CLICKUP_ASSIGNEE_USER_ID) : undefined
      },
      sync: {
        enabled: process.env.ENABLE_TODO_SYNC === 'true',
        interval: 300,
        todo_write_sync: true,
        commit_tracking: true,
        auto_status_update: true
      },
      goals: {
        track_progress: true,
        auto_switch: true,
        clickup_custom_field: 'goal_id'
      },
      reports: {
        daily: {
          enabled: true,
          time: '18:00',
          auto_submit: false
        },
        weekly: {
          enabled: true,
          day: 'friday',
          time: '17:00',
          auto_submit: false
        }
      },
      templates: {
        task_creation: 'task_creation.md',
        subtask_creation: 'subtask_creation.md',
        future_tasks: 'future_tasks.md',
        daily_report: 'daily_report.md',
        weekly_report: 'weekly_report.md'
      },
      hooks: {
        todo_write: true,
        git_commit: true,
        status_change: true
      }
    };

    // Try to load from file if exists
    if (fs.existsSync(this.configPath)) {
      try {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        
        // Convert new format to old format if needed
        if (fileConfig.workspace && !fileConfig.clickup) {
          defaultConfig.clickup.workspace_id = fileConfig.workspace.id || '90131285250'; // ALWAYS Ghost Codes
          defaultConfig.clickup.workspace_name = fileConfig.workspace.name || "Ghost Codes's Workspace";
        }
        if (fileConfig.space) {
          defaultConfig.clickup.default_space = fileConfig.space.name || 'Agentic Development';
        }
        if (fileConfig.lists?.tasks) {
          defaultConfig.clickup.default_list = 'Tasks';
        }
        
        return { ...defaultConfig, ...fileConfig };
      } catch (error) {
        console.error('Error loading config file, using defaults:', error);
      }
    }

    return defaultConfig;
  }

  private loadStatusConfig(): SpaceStatusConfig | undefined {
    if (fs.existsSync(this.statusConfigPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.statusConfigPath, 'utf-8'));
      } catch (error) {
        console.error('Error loading status config:', error);
      }
    }
    return undefined;
  }

  saveConfig(config: Partial<ProjectConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Ensure directory exists
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  saveStatusConfig(config: SpaceStatusConfig): void {
    this.statusConfig = config;
    
    // Ensure directory exists
    const dir = path.dirname(this.statusConfigPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(this.statusConfigPath, JSON.stringify(config, null, 2));
  }

  getConfig(): ProjectConfig {
    return this.config;
  }

  getStatusConfig(): SpaceStatusConfig | undefined {
    return this.statusConfig;
  }

  getApiKey(): string {
    // API key always comes from environment, never from config file
    return process.env.CLICKUP_API_KEY || '';
  }

  getDefaultSpace(): string | undefined {
    return this.config.clickup.default_space;
  }

  getDefaultList(): string | undefined {
    return this.config.clickup.default_list;
  }

  getStatusMapping(todoStatus: 'pending' | 'in_progress' | 'completed'): string {
    if (!this.statusConfig?.status_mappings) {
      // Default mappings
      const defaults: Record<string, string> = {
        pending: 'to do',
        in_progress: 'in progress',
        completed: 'done'
      };
      return defaults[todoStatus] || todoStatus;
    }
    
    return this.statusConfig.status_mappings[todoStatus] || todoStatus;
  }

  isFeatureEnabled(feature: 'todo_sync' | 'commit_tracking' | 'auto_reports' | 'goal_tracking'): boolean {
    switch (feature) {
      case 'todo_sync':
        return this.config.sync.todo_write_sync;
      case 'commit_tracking':
        return this.config.sync.commit_tracking;
      case 'auto_reports':
        return this.config.reports.daily.enabled || this.config.reports.weekly.enabled;
      case 'goal_tracking':
        return this.config.goals.track_progress;
      default:
        return false;
    }
  }

  shouldAutoAssignUser(): boolean {
    return this.config.clickup.auto_assign_user === true;
  }

  getAssigneeUserId(): number | undefined {
    return this.config.clickup.assignee_user_id;
  }

  updateAssigneeConfig(enable: boolean, userId?: number): void {
    this.config.clickup.auto_assign_user = enable;
    if (userId !== undefined) {
      this.config.clickup.assignee_user_id = userId;
    }
    this.saveConfig(this.config);
  }

  getTemplatePath(templateType: 'task_creation' | 'subtask_creation' | 'future_tasks' | 'daily_report' | 'weekly_report'): string {
    const templateName = this.config.templates[templateType];
    return path.join(__dirname, '../../.claude/clickup/templates', templateName);
  }

  loadTemplate(templateType: 'task_creation' | 'subtask_creation' | 'future_tasks' | 'daily_report' | 'weekly_report'): string {
    const templatePath = this.getTemplatePath(templateType);
    try {
      if (fs.existsSync(templatePath)) {
        return fs.readFileSync(templatePath, 'utf-8');
      }
    } catch (error) {
      console.error(`Error loading template ${templateType}:`, error);
    }
    return this.getDefaultTemplate(templateType);
  }

  private getDefaultTemplate(templateType: 'task_creation' | 'subtask_creation' | 'future_tasks' | 'daily_report' | 'weekly_report'): string {
    switch (templateType) {
      case 'task_creation':
        return `# {{title}}

{{description}}

## Details
- **Category**: {{category}}
- **Priority**: {{priority}}
- **Estimated Time**: {{estimated_time}}
- **Tags**: {{tags}}
- **Created**: {{created_at}}

## Todo ID
\`{{todo_id}}\`
`;
      case 'subtask_creation':
        return `# {{title}}

{{description}}

## Parent Task
- **Parent ID**: {{parent_id}}
- **Goal**: {{goal_title}}

## Details
- **Category**: {{category}}
- **Estimated Time**: {{estimated_time}}
- **Created**: {{created_at}}

## Todo ID
\`{{todo_id}}\`
`;
      case 'future_tasks':
        return `# {{title}}

{{description}}

## Planning
- **Estimated Start**: {{planned_start}}
- **Estimated Duration**: {{estimated_time}}
- **Priority**: {{priority}}
- **Dependencies**: {{dependencies}}

## Category & Tags
- **Category**: {{category}}
- **Tags**: {{tags}}

## Notes
{{notes}}

## Todo ID
\`{{todo_id}}\`
`;
      case 'daily_report':
        return `# Daily Report - {{date}}

## Goal: {{goal_title}}
**Progress**: {{goal_progress}}%

## Completed Today
{{#completed_tasks}}
- [ ] **{{title}}** ({{time_tracked}})
  {{#commits}}
  - Commit: {{.}}
  {{/commits}}
{{/completed_tasks}}

## In Progress
{{#in_progress_tasks}}
- [ ] **{{title}}**
  {{#blockers}}
  - Blocker: {{.}}
  {{/blockers}}
{{/in_progress_tasks}}

## Tomorrow's Focus
{{#tomorrow_tasks}}
- [ ] {{title}}
{{/tomorrow_tasks}}

## Notes
{{notes}}
`;
      case 'weekly_report':
        return `# Weekly Report - Week of {{week_start}}

## Goal Progress
- **Current Goal**: {{goal_title}}
- **Overall Progress**: {{goal_progress}}%
- **This Week's Progress**: {{week_progress}}%

## Key Accomplishments
{{#completed_tasks}}
- {{title}} ({{time_tracked}})
{{/completed_tasks}}

## Active Development
{{#in_progress_tasks}}
- {{title}} - {{progress}}%
{{/in_progress_tasks}}

## Commits This Week
{{#commits}}
- {{message}} ({{hash}})
{{/commits}}

## Next Week's Priorities
{{#next_week_tasks}}
- {{title}}
{{/next_week_tasks}}

## Challenges & Blockers
{{#blockers}}
- {{.}}
{{/blockers}}

## Notes
{{notes}}
`;
      default:
        return '';
    }
  }
}

export default new ConfigManager();