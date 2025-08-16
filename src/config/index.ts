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
    this.configPath = path.join(__dirname, '../../config/default.json');
    this.statusConfigPath = path.join(__dirname, '../../config/statuses.json');
    
    this.config = this.loadConfig();
    this.statusConfig = this.loadStatusConfig();
  }

  private loadConfig(): ProjectConfig {
    const defaultConfig: ProjectConfig = {
      clickup: {
        api_key: process.env.CLICKUP_API_KEY || '',
        workspace_id: process.env.CLICKUP_WORKSPACE_ID,
        default_space: process.env.CLICKUP_DEFAULT_SPACE || 'Ghost Codes Workspace',
        default_list: process.env.CLICKUP_DEFAULT_LIST || 'Development Tasks'
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
    return this.config.clickup.api_key;
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
}

export default new ConfigManager();