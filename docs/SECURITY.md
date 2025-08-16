# MCP Environment Variables - Critical Security Guide

## ⚠️ CRITICAL: NEVER Store API Keys in Project Files

API keys, tokens, and secrets must NEVER be stored in:
- `.json` config files
- `.env` files in the project
- Any file that gets committed to git
- Any file in the project directory

## How MCP Environment Variables Work

### 1. When Adding MCP Server to Claude Code

Environment variables are passed via the `--env` flag when adding the MCP server:

```bash
# CORRECT - API key passed as environment variable
claude mcp add clickmongrel --env CLICKUP_API_KEY=pk_xxxxx -- node /path/to/clickmongrel/dist/index.js

# WRONG - Never hardcode in files
# DO NOT put API keys in config.json, mcp-env.json, or any project file
```

### 2. How MCP Servers Access Environment Variables

When Claude Code runs an MCP server, it:
1. Spawns the server process with the specified environment variables
2. The server accesses them via `process.env.VARIABLE_NAME`
3. Variables are isolated to that server process only

```typescript
// In MCP server code
const apiKey = process.env.CLICKUP_API_KEY; // Securely passed from Claude Code
```

### 3. Multiple Environment Variables

You can pass multiple environment variables:

```bash
claude mcp add myserver \
  --env API_KEY=xxx \
  --env DATABASE_URL=yyy \
  --env SECRET_TOKEN=zzz \
  -- node server.js
```

### 4. Scope and Security

#### User Scope (Default)
- Stored in user's Claude Code settings (encrypted)
- Private to the user
- Never exposed in project files
- Survives across sessions

#### Project Scope (Shared)
- Stored in `.mcp.json` (WITHOUT secrets)
- Only server configuration, NOT credentials
- Safe to commit to git

```json
// .mcp.json - CORRECT (no secrets)
{
  "clickmongrel": {
    "command": "node",
    "args": ["dist/index.js"]
    // NO env vars here!
  }
}
```

#### Local Scope
- User-specific overrides
- Still no secrets in files
- Environment variables always via Claude Code CLI

### 5. Configuration Hierarchy

```
1. Runtime environment (--env flag) ← API KEYS GO HERE
2. System environment variables
3. Config files (settings only, NO SECRETS)
```

### 6. For ClickMongrel Specifically

#### CORRECT Setup:
```bash
# 1. Add MCP with API key as env var
claude mcp add clickmongrel \
  --env CLICKUP_API_KEY=pk_your_actual_key \
  -- node /home/cory-ubuntu/coding/mcps/clickmongrel/dist/index.js

# 2. Server reads from environment
const apiKey = process.env.CLICKUP_API_KEY;
```

#### Files Should Only Store:
- Workspace IDs
- Space IDs  
- List IDs
- User preferences
- NON-SENSITIVE configuration

```json
// .claude/clickup/config.json - CORRECT
{
  "workspace": {
    "id": "90131285250",
    "name": "Ghost Codes Workspace"
  },
  "lists": {
    "tasks": "901317943757"
  }
  // NO apiKey field!
}
```

### 7. Testing with Environment Variables

When testing outside Claude Code:

```bash
# Set for current session only
export CLICKUP_API_KEY="pk_xxxxx"
node dist/cli.js test

# Or inline
CLICKUP_API_KEY="pk_xxxxx" node dist/cli.js test
```

### 8. Hook Environment Variables

Hooks receive environment variables from Claude Code:

```json
// .claude/settings.json
{
  "hooks": {
    "TodoWrite": {
      "command": "node /path/to/hook.js"
      // Env vars passed by Claude Code at runtime
    }
  }
}
```

The hook accesses them:
```javascript
// In hook script
const apiKey = process.env.CLICKUP_API_KEY; // From MCP server env
```

## Security Checklist

✅ **DO:**
- Use `--env` flag when adding MCP servers
- Store only IDs and non-sensitive config in files
- Let Claude Code manage credential storage
- Use environment variables for all secrets

❌ **DON'T:**
- Put API keys in ANY project file
- Hardcode secrets in source code
- Commit credentials to git
- Store tokens in config.json

## Quick Reference

| Data Type | Where to Store | Example |
|-----------|---------------|---------|
| API Keys | `--env` flag only | `--env CLICKUP_API_KEY=pk_xxx` |
| Workspace ID | config.json | `"workspace_id": "90131285250"` |
| List IDs | config.json | `"tasks": "901317943757"` |
| User Preferences | config.json | `"autoAssign": true` |
| Secrets/Tokens | `--env` flag only | `--env SECRET_TOKEN=xxx` |

## Remember

**The MCP server should ALWAYS read sensitive data from environment variables, NEVER from files.**

When in doubt: IDs in files, secrets in env vars.