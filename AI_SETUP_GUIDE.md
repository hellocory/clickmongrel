# ClickMongrel AI Setup Guide

## 🤖 Quick Setup for AI (Claude)

When a user asks you to set up ClickUp integration for their project, follow these steps:

### 1. Initial Setup Command

```bash
# Navigate to project
cd /path/to/project

# Run quick setup with API key
clickmongrel quick-setup --api-key <THEIR_API_KEY>

# Or with specific space (if they have one)
clickmongrel quick-setup --api-key <THEIR_API_KEY> --space <SPACE_ID>
```

### 2. What Gets Created

The setup will automatically:
- ✅ Create `.claude/clickup/` folder structure in the project
- ✅ Connect to their ClickUp workspace
- ✅ Find or create "Agentic Development" space
- ✅ Create folders: Weekly Reports, Daily Reports, Docs
- ✅ Create lists: Commits, Tasks

### 3. Manual Configuration Required

**IMPORTANT**: The user must manually configure list statuses in ClickUp:

```markdown
## Manual Setup Required

Please configure the custom statuses in ClickUp:

### For "Commits" list:
1. Open ClickUp → Agentic Development → Commits list
2. Click ... → List Settings → Statuses
3. Add these statuses:
   - COMMITTED (gray #87909e)
   - DEVELOPING (yellow #ffab00)
   - PROTOTYPING (purple #d33b74)
   - REJECTED (orange #ff8c00)
   - PRODUCTION/TESTING (blue #4194f6)
   - PRODUCTION/FINAL (green #02c852)

### For "Tasks" list:
1. Open ClickUp → Agentic Development → Tasks list
2. Click ... → List Settings → Statuses
3. Add these statuses:
   - to do (gray #87909e)
   - future (blue #4194f6)
   - in progress (yellow #ffab00)
   - fixing (orange #ff8c00)
   - completed (green #02c852)
```

## 📝 Using the Integration

### TodoWrite Sync
When you use TodoWrite in Claude, tasks automatically sync to ClickUp:

```typescript
// Your TodoWrite creates a task in ClickUp's Tasks list
TodoWrite([
  { content: "Implement authentication", status: "in_progress" }
])
// → Creates/updates task in ClickUp with matching status
```

### Commit Tracking
Git commits are automatically tracked through their lifecycle:

```bash
# Track a commit (automatically gets current branch status)
clickmongrel commit track

# Update commit status after push
clickmongrel commit status --hash <HASH> --status push

# Track merge to staging
clickmongrel commit status --hash <HASH> --status merge --branch staging
```

### Git Hooks (Optional)
To automate commit tracking, add these hooks:

```bash
# Add to .git/hooks/post-commit
#!/bin/bash
clickmongrel commit track 2>/dev/null || true

# Add to .git/hooks/pre-push
#!/bin/bash
# Updates commits to DEVELOPING status
```

## 🔄 Status Lifecycle

### Commits Flow
```
COMMITTED → DEVELOPING → PROTOTYPING → PRODUCTION/TESTING → PRODUCTION/FINAL
                ↓              ↓                ↓
            REJECTED       REJECTED         REJECTED
```

### Tasks Flow
```
to do → in progress → completed
   ↓         ↓
future    fixing
```

## 🎯 Common AI Commands

### Setup New Project
```bash
# Basic setup
clickmongrel quick-setup --api-key pk_xxxxx

# With specific space
clickmongrel quick-setup --api-key pk_xxxxx --space 90139254308
```

### Switch Spaces
```bash
# List available spaces
clickmongrel status

# Switch to different space
clickmongrel quick-setup --space <NEW_SPACE_ID>
```

### Test Connection
```bash
clickmongrel test
```

### Track Work
```bash
# Track current git commit
clickmongrel commit track

# Sync todos to ClickUp
# (automatic when using TodoWrite)

# Generate daily report
clickmongrel report daily
```

## 🚨 Troubleshooting

### "No commits list configured"
- Run `clickmongrel quick-setup` to configure lists
- Check `.claude/clickup/config.json` exists

### "Status not found"
- User needs to manually add statuses in ClickUp UI
- Share the manual configuration steps above

### "API key not configured"
```bash
export CLICKUP_API_KEY=pk_xxxxx
# Or pass directly
clickmongrel quick-setup --api-key pk_xxxxx
```

## 📁 Project Structure Created

```
.claude/
└── clickup/
    ├── config.json        # Main configuration
    ├── mcp-env.json      # MCP environment vars
    ├── cache/            # Temporary cache
    │   └── commit-tasks.json
    ├── logs/             # Sync logs
    └── reports/          # Generated reports
        ├── daily/
        └── weekly/
```

## 🔑 Key Files

- **config.json**: Contains space IDs, list IDs, API key
- **mcp-env.json**: Environment variables for MCP server
- **commit-tasks.json**: Maps git commits to ClickUp tasks

## 📊 For AI Context

When working on a project with ClickMongrel:
1. Check if `.claude/clickup/config.json` exists
2. If not, run quick-setup
3. TodoWrite automatically syncs if configured
4. Commits can be tracked with CLI commands
5. Reports generate markdown summaries

## 🎨 Custom Configuration

Users can customize by editing `.claude/clickup/config.json`:

```json
{
  "apiKey": "pk_xxxxx",
  "space": {
    "id": "90139254308",
    "name": "Agentic Development"
  },
  "lists": {
    "commits": "901317936118",
    "tasks": "901317936119"
  }
}
```

## 💡 Best Practices

1. **Always run quick-setup first** for new projects
2. **Remind users about manual status configuration**
3. **Use TodoWrite normally** - it auto-syncs if configured
4. **Track commits** for important changes
5. **Generate reports** at end of sessions

## 🔗 Integration Points

- **TodoWrite** → Tasks list (automatic)
- **Git commits** → Commits list (via CLI)
- **Reports** → Weekly/Daily Reports folders
- **Goals** → Tracked in Tasks list

This tool bridges Claude's work with ClickUp for complete project tracking!