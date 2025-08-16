---
layout: default
title: MCP Tools Reference
---

# MCP Tools Reference

ClickMongrel provides a comprehensive set of MCP tools for managing ClickUp tasks directly from Claude.

## Core Tools

### sync_todos
Synchronize Claude's TodoWrite tasks with ClickUp.

**Parameters:**
- `todos`: Array of todo items from Claude
- `force`: Boolean to force sync even if no changes

**Returns:**
- Sync status and created/updated task IDs

**Example:**
```javascript
{
  "tool": "sync_todos",
  "arguments": {
    "todos": [
      {"id": "1", "content": "Fix login bug", "status": "in_progress"},
      {"id": "2", "content": "Update documentation", "status": "pending"}
    ]
  }
}
```

### get_current_goal
Retrieve the current active goal from ClickUp.

**Parameters:** None

**Returns:**
- Goal details including title, description, and progress

### create_task
Create a new task in ClickUp.

**Parameters:**
- `name`: Task name (required)
- `description`: Task description
- `list_id`: Target list ID
- `assignees`: Array of assignee IDs
- `tags`: Array of tags
- `priority`: Task priority (1-4)
- `due_date`: Due date timestamp

**Returns:**
- Created task details with ID

### update_task
Update an existing ClickUp task.

**Parameters:**
- `task_id`: Task ID to update (required)
- `name`: New task name
- `description`: New description
- `status`: New status
- `assignees`: New assignees
- `tags`: New tags
- `priority`: New priority

**Returns:**
- Updated task details

### track_time
Track time spent on a task.

**Parameters:**
- `task_id`: Task ID (required)
- `duration`: Duration in minutes (required)
- `description`: Time entry description
- `start`: Start timestamp
- `end`: End timestamp

**Returns:**
- Time entry details

### list_tasks
List tasks from a specific list or space.

**Parameters:**
- `list_id`: List ID to fetch tasks from
- `space_id`: Space ID (if no list_id)
- `include_closed`: Include completed tasks
- `assignees`: Filter by assignees
- `tags`: Filter by tags

**Returns:**
- Array of task objects

### create_goal
Create a new goal in ClickUp.

**Parameters:**
- `name`: Goal name (required)
- `description`: Goal description
- `due_date`: Target completion date
- `color`: Goal color hex code

**Returns:**
- Created goal details

### update_goal
Update an existing goal.

**Parameters:**
- `goal_id`: Goal ID (required)
- `name`: New name
- `description`: New description
- `percent_completed`: Progress percentage

**Returns:**
- Updated goal details

### link_commit
Link a git commit to a ClickUp task.

**Parameters:**
- `task_id`: Task ID (required)
- `commit_hash`: Git commit hash (required)
- `commit_message`: Commit message
- `branch`: Git branch name
- `repository`: Repository URL

**Returns:**
- Link confirmation

### generate_report
Generate a progress report.

**Parameters:**
- `type`: Report type ("daily", "weekly", "sprint")
- `start_date`: Report start date
- `end_date`: Report end date
- `include_commits`: Include git commits
- `include_time`: Include time tracking

**Returns:**
- Formatted report content

## Resources

### goals/current
Get the current active goal.

**URI:** `clickmongrel://goals/current`

**Returns:**
```json
{
  "id": "goal_123",
  "name": "Sprint 1 Goals",
  "progress": 75,
  "tasks_completed": 6,
  "tasks_total": 8
}
```

### sync/status
Get the current sync status.

**URI:** `clickmongrel://sync/status`

**Returns:**
```json
{
  "last_sync": "2024-01-15T10:30:00Z",
  "pending_items": 2,
  "synced_items": 45,
  "errors": []
}
```

### config
Get current configuration.

**URI:** `clickmongrel://config`

**Returns:**
```json
{
  "workspace_id": "12345",
  "default_list_id": "67890",
  "sync_enabled": true,
  "status_mappings": {
    "pending": "to do",
    "in_progress": "in progress",
    "completed": "done"
  }
}
```

## Error Handling

All tools return consistent error responses:

```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `AUTH_ERROR`: Authentication failed
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT`: API rate limit exceeded
- `VALIDATION_ERROR`: Invalid parameters
- `SYNC_ERROR`: Synchronization failed