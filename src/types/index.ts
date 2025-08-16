export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: ClickUpStatus;
  assignees: ClickUpUser[];
  priority?: ClickUpPriority;
  due_date?: string;
  start_date?: string;
  time_estimate?: number;
  tags?: ClickUpTag[];
  custom_fields?: ClickUpCustomField[];
  list: {
    id: string;
    name: string;
  };
  folder?: {
    id: string;
    name: string;
  };
  space: {
    id: string;
    name: string;
  };
}

export interface ClickUpStatus {
  id: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}

export interface ClickUpTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
  creator?: number;
}

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color?: string;
  profilePicture?: string;
}

export interface ClickUpPriority {
  id: string;
  priority: string;
  color: string;
  orderindex: number;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  value: string | number | boolean | object;
}

export interface ClickUpTeam {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
  members?: ClickUpUser[];
}

export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses: ClickUpStatus[];
  multiple_assignees: boolean;
  features: {
    [key: string]: {
      enabled: boolean;
    };
  };
}

export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  hidden: boolean;
  space: {
    id: string;
    name: string;
  };
  task_count: number;
  lists: ClickUpList[];
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  status?: ClickUpStatus;
  priority?: ClickUpPriority;
  assignee?: ClickUpUser;
  task_count?: number;
  due_date?: string;
  start_date?: string;
  folder: {
    id: string;
    name: string;
  };
  space: {
    id: string;
    name: string;
  };
  statuses: ClickUpStatus[];
  custom_fields?: Array<{
    id: string;
    name: string;
    type: string;
    type_config?: any;
    date_created?: string;
    hide_from_guests?: boolean;
    required?: boolean;
  }>;
}

export interface ClickUpGoal {
  id: string;
  name: string;
  description?: string;
  owner: ClickUpUser;
  percent_completed: number;
  due_date?: string;
  start_date?: string;
  targets?: ClickUpGoalTarget[];
  key_results?: ClickUpKeyResult[];
}

export interface ClickUpGoalTarget {
  id: string;
  name: string;
  type: string;
  unit: string;
  current: number;
  target: number;
}

export interface ClickUpKeyResult {
  id: string;
  name: string;
  type: string;
  unit: string;
  current: number;
  target: number;
  percent_completed: number;
}

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  clickup_task_id?: string;
  clickup_status_id?: string;
  // Time tracking
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  estimated_time?: number; // in milliseconds
  actual_time?: number; // in milliseconds
  // Enhanced metadata
  title?: string; // Parsed from content
  category?: string; // Auto-detected category
  tags?: string[]; // Auto-generated tags
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface SyncConfig {
  enabled: boolean;
  interval: number;
  todo_write_sync: boolean;
  commit_tracking: boolean;
  auto_status_update: boolean;
}

export interface GoalConfig {
  track_progress: boolean;
  auto_switch: boolean;
  clickup_custom_field: string;
}

export interface ReportConfig {
  daily: {
    enabled: boolean;
    time: string;
    auto_submit: boolean;
  };
  weekly: {
    enabled: boolean;
    day: string;
    time: string;
    auto_submit: boolean;
  };
}

export interface ProjectConfig {
  clickup: {
    workspace_name?: string;
    workspace_id?: string;
    default_space?: string;
    default_list?: string;
    auto_assign_user?: boolean;
    assignee_user_id?: number;
  };
  sync: SyncConfig;
  goals: GoalConfig;
  reports: ReportConfig;
  templates: {
    task_creation: string;
    subtask_creation: string;
    future_tasks: string;
    daily_report: string;
    weekly_report: string;
  };
  hooks: {
    todo_write: boolean;
    git_commit: boolean;
    status_change: boolean;
  };
}

export interface StatusMapping {
  pending: string;
  in_progress: string;
  completed: string;
  [key: string]: string;
}

export interface SpaceStatusConfig {
  spaces: {
    [spaceName: string]: {
      lists: {
        [listName: string]: {
          statuses: ClickUpStatus[];
          default_status: string;
          complete_status: string;
        };
      };
    };
  };
  status_mappings: StatusMapping;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  task_id?: string;
}

export interface DailyReport {
  date: string;
  goal_title: string;
  goal_id: string;
  goal_progress: number;
  completed_tasks: ReportTask[];
  in_progress_tasks: ReportTask[];
  tomorrow_tasks: ReportTask[];
  notes?: string;
}

export interface ReportTask {
  id: string;
  title: string;
  commits?: string[];
  time_tracked?: number;
  progress?: number;
  blockers?: string[];
}