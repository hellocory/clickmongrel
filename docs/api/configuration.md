---
layout: default
title: Configuration Reference
---

# Configuration Reference

ClickMongrel can be configured through environment variables, configuration files, and runtime settings.

## Environment Variables

### Required

#### CLICKUP_API_KEY
Your ClickUp personal API token.

```bash
export CLICKUP_API_KEY="pk_..."
```

### Optional

#### CLICKMONGREL_WORKSPACE_ID
Default workspace ID to use.

```bash
export CLICKMONGREL_WORKSPACE_ID="90131285250"
```

#### CLICKMONGREL_LIST_ID
Default list ID for new tasks.

```bash
export CLICKMONGREL_LIST_ID="901303447495"
```

#### CLICKMONGREL_LOG_LEVEL
Logging level (debug, info, warn, error).

```bash
export CLICKMONGREL_LOG_LEVEL="info"
```

#### CLICKMONGREL_SYNC_INTERVAL
Auto-sync interval in seconds (0 to disable).

```bash
export CLICKMONGREL_SYNC_INTERVAL="300"
```

## Configuration Files

### config/default.json

Main configuration file:

```json
{
  "clickup": {
    "workspace_id": null,
    "workspace_name": null,
    "default_list_id": null,
    "default_space_id": null
  },
  "sync": {
    "enabled": true,
    "interval": 300,
    "batch_size": 10,
    "retry_attempts": 3,
    "retry_delay": 1000
  },
  "features": {
    "goals": true,
    "time_tracking": true,
    "commit_linking": true,
    "custom_fields": true,
    "subtasks": true
  },
  "logging": {
    "level": "info",
    "file": null,
    "console": true
  }
}
```

### config/statuses.json

Status mapping configuration:

```json
{
  "todo_to_clickup": {
    "pending": "to do",
    "in_progress": "in progress", 
    "completed": "done"
  },
  "clickup_to_todo": {
    "to do": "pending",
    "in progress": "in_progress",
    "done": "completed",
    "review": "in_progress",
    "blocked": "pending"
  },
  "default_status": "to do"
}
```

### .env

Local environment configuration:

```bash
# ClickUp Configuration
CLICKUP_API_KEY=pk_your_api_key_here
CLICKMONGREL_WORKSPACE_ID=90131285250
CLICKMONGREL_LIST_ID=901303447495

# Sync Settings
CLICKMONGREL_SYNC_ENABLED=true
CLICKMONGREL_SYNC_INTERVAL=300

# Features
CLICKMONGREL_ENABLE_GOALS=true
CLICKMONGREL_ENABLE_TIME_TRACKING=true
CLICKMONGREL_ENABLE_COMMITS=true

# Logging
CLICKMONGREL_LOG_LEVEL=info
```

## Claude MCP Configuration

### Adding to Claude

Add ClickMongrel to Claude's MCP configuration:

```bash
claude mcp add clickmongrel \
  --env CLICKUP_API_KEY=pk_your_api_key \
  -- node /path/to/clickmongrel/dist/index.js
```

### Claude Settings

`.claude/settings.json`:

```json
{
  "mcpServers": {
    "clickmongrel": {
      "command": "node",
      "args": ["/path/to/clickmongrel/dist/index.js"],
      "env": {
        "CLICKUP_API_KEY": "pk_your_api_key"
      }
    }
  },
  "hooks": {
    "todo-write": {
      "command": "clickmongrel",
      "args": ["hook", "todo-sync"]
    }
  }
}
```

## Status Mappings

### Default Mappings

| Claude Status | ClickUp Status |
|--------------|---------------|
| pending | to do |
| in_progress | in progress |
| completed | done |

### Custom Mappings

Create custom status mappings:

```javascript
// config/custom-statuses.js
export default {
  "todo_to_clickup": {
    "pending": "backlog",
    "in_progress": "working",
    "completed": "shipped",
    "blocked": "on hold"
  }
}
```

## Workspace Configuration

### Single Workspace

```json
{
  "clickup": {
    "workspace_id": "90131285250",
    "workspace_name": "My Workspace"
  }
}
```

### Multiple Workspaces

```json
{
  "workspaces": [
    {
      "id": "90131285250",
      "name": "Development",
      "default": true
    },
    {
      "id": "90131285251", 
      "name": "Marketing",
      "default": false
    }
  ]
}
```

## Advanced Settings

### Cache Configuration

```json
{
  "cache": {
    "enabled": true,
    "ttl": 300,
    "max_size": 100,
    "strategy": "lru"
  }
}
```

### Rate Limiting

```json
{
  "rate_limit": {
    "requests_per_second": 10,
    "burst": 20,
    "retry_after": 60
  }
}
```

### Custom Fields

```json
{
  "custom_fields": {
    "todo_source": {
      "id": "custom_field_123",
      "type": "text",
      "default": "Claude AI"
    },
    "ai_generated": {
      "id": "custom_field_456",
      "type": "boolean",
      "default": true
    }
  }
}
```

## Troubleshooting Configuration

### Debug Mode

Enable debug logging:

```bash
export CLICKMONGREL_LOG_LEVEL=debug
export CLICKMONGREL_DEBUG=true
```

### Dry Run Mode

Test without making changes:

```bash
export CLICKMONGREL_DRY_RUN=true
```

### Configuration Validation

Validate configuration:

```bash
clickmongrel config validate
```

### Reset Configuration

Reset to defaults:

```bash
clickmongrel config reset
```