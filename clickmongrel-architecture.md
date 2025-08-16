# ClickMongrel - ClickUp Integration MCP Server Architecture

## Overview
ClickMongrel is a custom MCP (Model Context Protocol) server that provides seamless bidirectional synchronization between Claude's task management system and ClickUp, ensuring all development activities are properly tracked, documented, and aligned with project goals.

## Core Objectives
1. **Unified Task Management**: Sync Claude's TodoWrite with ClickUp tasks in real-time
2. **Goal Tracking**: Maintain current and future goals with progress tracking
3. **Automated Documentation**: Generate daily/weekly reports automatically
4. **Commit Linking**: Link every git commit to corresponding ClickUp tasks
5. **Status Management**: Ensure Claude always knows available statuses for proper task updates
6. **Relationship Management**: Track relationships between tasks, docs, and users

## Architecture Components

### 1. MCP Server Core (`clickmongrel/`)
```
clickmongrel/
├── server.js                 # Main MCP server implementation
├── config/
│   ├── default.json          # Default configuration
│   ├── spaces.json           # Space-specific configurations
│   └── statuses.json         # Status mappings per space/list
├── handlers/
│   ├── goals.js              # Goal management handlers
│   ├── tasks.js              # Task CRUD operations
│   ├── documents.js          # Document management
│   ├── reports.js            # Daily/weekly report generation
│   ├── commits.js            # Git commit tracking
│   └── sync.js               # TodoWrite sync handler
├── hooks/
│   ├── todo-write.js         # Hook for TodoWrite changes
│   ├── commit.js             # Git commit hook
│   └── status-change.js      # Task status change hook
├── templates/
│   ├── daily-report.md       # Daily report template
│   ├── weekly-report.md      # Weekly report template
│   ├── goal-template.md      # Goal documentation template
│   └── task-template.json    # Task creation template
└── utils/
    ├── clickup-api.js        # ClickUp API wrapper
    ├── cache.js              # Local caching mechanism
    └── logger.js             # Logging utilities
```

### 2. Project Integration Structure (`.claude/clickmongrel/`)
```
.claude/
└── clickmongrel/
    ├── config.json           # Project-specific configuration
    ├── current-goal.md       # Active goal documentation
    ├── goals/
    │   ├── active/           # Currently active goals
    │   ├── future/           # Planned future goals
    │   └── completed/        # Archived completed goals
    ├── cache/
    │   ├── spaces.json       # Cached space structure
    │   ├── statuses.json     # Cached status configurations
    │   └── tasks.json        # Local task cache
    ├── reports/
    │   ├── daily/            # Generated daily reports
    │   └── weekly/           # Generated weekly reports
    └── logs/
        └── sync.log          # Synchronization logs
```

### 3. Configuration Schema

#### `config.json` (Project Configuration)
```json
{
  "clickup": {
    "api_key": "${CLICKUP_API_KEY}",
    "workspace_id": "auto-detect",
    "default_space": "Agentic Development",
    "default_list": "Development Tasks"
  },
  "sync": {
    "enabled": true,
    "interval": 300,
    "todo_write_sync": true,
    "commit_tracking": true,
    "auto_status_update": true
  },
  "goals": {
    "track_progress": true,
    "auto_switch": true,
    "clickup_custom_field": "goal_id"
  },
  "reports": {
    "daily": {
      "enabled": true,
      "time": "18:00",
      "auto_submit": false
    },
    "weekly": {
      "enabled": true,
      "day": "friday",
      "time": "17:00",
      "auto_submit": false
    }
  },
  "hooks": {
    "todo_write": true,
    "git_commit": true,
    "status_change": true
  }
}
```

#### `statuses.json` (Status Configuration per Space/List)
```json
{
  "spaces": {
    "Agentic Development": {
      "lists": {
        "Development Tasks": {
          "statuses": [
            {"name": "to do", "id": "sc901317882454_x8Cq9fDf", "color": "#87909e"},
            {"name": "in progress", "id": "sc901317882454_y9Dq0gEg", "color": "#5b9fd6"},
            {"name": "review", "id": "sc901317882454_z0Er1hFh", "color": "#f9d900"},
            {"name": "done", "id": "sc901317882454_a1Fs2iGi", "color": "#6bc950"},
            {"name": "archived", "id": "sc901317882454_b2Gt3jHj", "color": "#c7c7c7"}
          ],
          "default_status": "to do",
          "complete_status": "done"
        }
      }
    }
  },
  "status_mappings": {
    "pending": "to do",
    "in_progress": "in progress",
    "completed": "done"
  }
}
```

### 4. Initialization Flow

#### First-Time Setup (`clickmongrel init`)
1. **Environment Check**
   - Verify ClickUp API key exists
   - Check MCP server availability
   - Validate git repository

2. **Space Discovery**
   - Fetch all available ClickUp spaces
   - Prompt user to select default space
   - Cache space structure locally

3. **Status Configuration**
   - Fetch all statuses for selected space/lists
   - Create status mappings
   - Store in `statuses.json`

4. **Goal Setup**
   - Prompt for current active goal
   - Create goal in ClickUp if needed
   - Link to local goal tracking

5. **Hook Installation**
   - Install git hooks for commit tracking
   - Setup TodoWrite observer
   - Configure status change listeners

6. **Template Generation**
   - Copy report templates to project
   - Customize with project information
   - Setup scheduled report generation

### 5. Core Features

#### Goal Tracking System
```javascript
// Goal structure in ClickUp custom fields
{
  "goal_id": "86ab15338",
  "goal_title": "Implement user authentication",
  "goal_progress": 75,
  "subtasks": [
    {"id": "sub1", "title": "Setup Clerk", "status": "done"},
    {"id": "sub2", "title": "Create login page", "status": "in progress"}
  ]
}
```

**Goal Commands:**
- `clickmongrel goal current` - Show active goal
- `clickmongrel goal switch <id>` - Switch to different goal
- `clickmongrel goal progress <percentage>` - Update progress
- `clickmongrel goal complete` - Mark goal as complete

#### TodoWrite Synchronization

**Hook Implementation:**
```javascript
// Intercept TodoWrite tool calls
onTodoWrite(todos) {
  // Map todos to ClickUp tasks
  todos.forEach(todo => {
    if (todo.status === 'in_progress') {
      clickup.updateTask(todo.id, {
        status: statusMap['in_progress'],
        assignee: currentUser
      });
    }
  });
  
  // Update local cache
  cache.updateTodos(todos);
  
  // Trigger goal progress calculation
  goals.recalculateProgress();
}
```

#### Commit-Task Linking

**Git Hook (`post-commit`):**
```bash
#!/bin/bash
# Extract task ID from current goal or todo
TASK_ID=$(clickmongrel task current)
COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_HASH=$(git rev-parse HEAD)

# Create ClickUp comment with commit info
clickmongrel commit link \
  --task "$TASK_ID" \
  --message "$COMMIT_MSG" \
  --hash "$COMMIT_HASH"
```

#### Daily/Weekly Reports

**Daily Report Template:**
```markdown
# Daily Development Report - {{date}}

## Goal Progress
**Current Goal:** {{goal_title}} ({{goal_id}})
**Progress:** {{goal_progress}}%

## Tasks Completed Today
{{#each completed_tasks}}
- ✅ {{title}} ({{id}})
  - Commits: {{commits}}
  - Time: {{time_tracked}}
{{/each}}

## Tasks In Progress
{{#each in_progress_tasks}}
- 🔄 {{title}} ({{id}})
  - Progress: {{progress}}%
  - Blockers: {{blockers}}
{{/each}}

## Tomorrow's Focus
{{#each tomorrow_tasks}}
- 📋 {{title}}
{{/each}}

## Notes
{{notes}}
```

### 6. Claude Integration Instructions

#### CLAUDE.md Addition
```markdown
## ClickMongrel Integration

### Available Commands
- `clickmongrel status` - Check sync status
- `clickmongrel sync` - Force synchronization
- `clickmongrel goal` - Manage goals
- `clickmongrel task <id>` - Work on specific task
- `clickmongrel report` - Generate report

### Automatic Behaviors
1. **TodoWrite Sync**: Your todos automatically sync to ClickUp
2. **Status Updates**: Task statuses update based on your progress
3. **Commit Linking**: All commits link to active task
4. **Goal Tracking**: Progress updates automatically

### Best Practices
1. Always check current goal at session start: `clickmongrel goal current`
2. Update task status through TodoWrite (it syncs automatically)
3. Include task ID in commit messages for better tracking
4. Generate daily report before ending session

### Status Mappings
- `pending` → "to do"
- `in_progress` → "in progress" 
- `completed` → "done"
```

### 7. Implementation Priorities

1. **Phase 1: Core Sync**
   - TodoWrite ↔ ClickUp task sync
   - Status management
   - Basic goal tracking

2. **Phase 2: Automation**
   - Git commit linking
   - Automatic status updates
   - Progress calculation

3. **Phase 3: Reporting**
   - Daily/weekly report generation
   - Goal progress visualization
   - Time tracking integration

4. **Phase 4: Advanced Features**
   - Multi-project support
   - Team collaboration features
   - AI-powered insights

### 8. Error Handling & Recovery

#### Sync Failures
- Maintain local queue of pending updates
- Retry with exponential backoff
- Fallback to manual sync command

#### Status Mismatches
- Cache valid statuses per list
- Validate before API calls
- Provide clear error messages

#### Goal Conflicts
- Maintain goal stack for context switching
- Preserve work-in-progress state
- Allow manual override

### 9. Testing Strategy

1. **Unit Tests**
   - API wrapper functions
   - Status mapping logic
   - Cache operations

2. **Integration Tests**
   - TodoWrite hook integration
   - ClickUp API interactions
   - Git hook execution

3. **End-to-End Tests**
   - Complete sync cycle
   - Report generation
   - Goal switching workflow

### 10. Future Enhancements

- **AI-Powered Features**
  - Automatic task estimation
  - Smart goal suggestions
  - Anomaly detection in progress

- **Team Features**
  - Shared goals
  - Collaborative reports
  - Cross-project dependencies

- **Analytics**
  - Productivity metrics
  - Goal completion trends
  - Time tracking analysis

## Implementation Notes for Next AI Session

1. Start by creating the MCP server structure in `/clickmongrel` directory
2. Implement core sync mechanism with TodoWrite hook
3. Setup status configuration system with auto-detection
4. Create initialization script for first-time setup
5. Test with actual ClickUp API using existing tasks
6. Ensure all statuses are properly mapped and cached
7. Implement commit linking with git hooks
8. Create report generation system with templates
9. Add comprehensive error handling and logging
10. Write detailed usage documentation for Claude

**Critical Requirements:**
- Must sync TodoWrite changes in real-time
- Must properly update task statuses (not just tags)
- Must link every commit to active task
- Must maintain goal context across sessions
- Must generate reports on schedule
- Must handle all ClickUp API edge cases