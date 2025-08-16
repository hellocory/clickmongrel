# ClickMongrel - ClickUp MCP Server for Claude

[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://hellocory.github.io/clickmongrel/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple)](https://modelcontextprotocol.io)

A Model Context Protocol (MCP) server that seamlessly integrates Claude's TodoWrite with ClickUp, providing automatic task synchronization, commit tracking, time management, and comprehensive project tracking.

📚 **[View Full Documentation](https://hellocory.github.io/clickmongrel/)**

## 🚀 Features

### Core Functionality
- 🔄 **Automatic TodoWrite Sync** - Tasks created in Claude automatically sync to ClickUp
- 👨‍👩‍👧‍👦 **Parent-Child Task Relationships** - Subtasks with automatic parent status management
- ⏱️ **Time Tracking** - Automatic time tracking when tasks complete
- 📝 **Commit Linking** - Links completed tasks to their commits
- 📎 **Attachment Support** - Upload screenshots, demos, and files to tasks
- 👤 **Auto-Assignment** - Tasks automatically assigned to configured user
- 📊 **Status Lifecycle** - Tracks tasks through custom ClickUp statuses
- 🎯 **Goal Management** - Track project goals and progress
- 📈 **Report Generation** - Daily and weekly development reports

### Enhanced Features (NEW)
- **Smart Time Tracking** - Automatically tracks time from task start to completion
- **Task-Commit Relationships** - Links tasks to the commits that complete them
- **Attachment Uploads** - Add screenshots and demos to showcase functionality
- **Parent Task Auto-Completion** - Parent tasks auto-complete when all subtasks finish

## 📋 Prerequisites

1. **ClickUp Account** with API access
2. **Claude Code** with MCP support
3. **Node.js** 18+ and pnpm
4. **ClickUp API Key** - Get from ClickUp Settings → Apps → API Token

## 🛠️ Installation

### Option 1: From GitHub (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/clickmongrel.git
cd clickmongrel

# Install dependencies
pnpm install

# Build the project
pnpm run build

# Test connection
CLICKUP_API_KEY="your_api_key" node dist/cli.js test
```

### Option 2: NPM Global Install (Coming Soon)

```bash
npm install -g @clickmongrel/mcp-server
```

## ⚙️ Setup

### Quick Setup (AI-Friendly)

When using Claude with ClickMongrel, just say:
- "setup clickmongrel with [Your Workspace Name]"
- "setup clickmongrel in [workspace] in [space name]"

### Manual Setup

```bash
# Basic setup - uses default "Agentic Development" space
node dist/quick-setup.js --workspace "Your Workspace Name"

# Setup with specific space
node dist/quick-setup.js --workspace "Your Workspace" --space-name "Custom Space"

# Setup with space ID (faster)
node dist/quick-setup.js --workspace "Your Workspace" --space-id "90139256288"
```

## 🔌 MCP Integration

### Adding to Claude Code

```bash
# Add the MCP server (NEVER put API key in config files!)
claude mcp add clickmongrel \
  --env CLICKUP_API_KEY="your_api_key_here" \
  -- node /absolute/path/to/clickmongrel/dist/index.js

# Verify it's connected
claude mcp list

# In Claude Code, check status
/mcp
```

### Available MCP Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `sync_todos` | Sync TodoWrite items to ClickUp | Automatic when using TodoWrite |
| `add_attachment` | Upload files to tasks | "Add screenshot to this task" |
| `create_goal` | Create project goals | "Create goal for authentication feature" |
| `link_commit` | Link commits to tasks | Automatic on commit |
| `generate_report` | Create status reports | "Generate weekly report" |
| `validate_statuses` | Check ClickUp configuration | "Validate clickup statuses" |

## 📁 Project Structure

```
your-project/
└── .claude/
    └── clickup/
        ├── config.json           # Workspace & list IDs (NO API KEYS!)
        ├── STATUS_SETUP_GUIDE.md # Instructions for ClickUp setup
        ├── templates/            # Commit message templates
        ├── reports/              # Generated reports
        └── cache/                # Temporary cache
```

## ⚠️ CRITICAL: ClickUp Status Configuration

**The system will NOT work until you configure custom statuses in ClickUp!**

### Required Task Statuses
1. Go to ClickUp → Your Space → Tasks list
2. Click ⋮ menu → "Edit statuses"
3. Choose "Custom statuses" 
4. Add these EXACT statuses:
   - `to do`
   - `future`
   - `in progress`
   - `fixing`
   - `completed`

### Required Commit Statuses
1. Go to ClickUp → Your Space → Commits list
2. Click ⋮ menu → "Edit statuses"
3. Add these EXACT statuses:
   - `comitted`
   - `developing`
   - `prototyping`
   - `rejected`
   - `production/testing`
   - `production/final`

## 🎯 Usage Examples

### Basic Task Management

```javascript
// Claude TodoWrite automatically syncs
TodoWrite([
  { id: "task-1", content: "Setup database", status: "pending" },
  { id: "task-2", content: "Create API", status: "in_progress" }
])
```

### Parent-Child Tasks

```javascript
// Create tasks with subtasks
TodoWrite([
  { id: "feature", content: "User Authentication", status: "pending" },
  { id: "sub-1", content: "Login form", status: "pending", parent_id: "feature" },
  { id: "sub-2", content: "JWT tokens", status: "pending", parent_id: "feature" }
])
// Parent auto-updates to "in_progress" when subtask starts
// Parent auto-completes when all subtasks complete
```

### Enhanced Features

```javascript
// Time tracking (automatic)
// When task goes from in_progress → completed, time is tracked

// Add attachments
mcp.add_attachment({
  task_id: "task-1",
  file_path: "/path/to/screenshot.png",
  file_name: "Dashboard Screenshot"
})

// Tasks automatically link to commits that complete them
```

## 🔧 Configuration

### Environment Variables

```bash
CLICKUP_API_KEY=pk_xxx          # Your ClickUp API key (REQUIRED)
CLICKUP_WORKSPACE_ID=xxx         # Optional: Default workspace
CLICKUP_SPACE_ID=xxx            # Optional: Default space
LOG_LEVEL=info                  # Logging level (debug|info|warn|error)
```

### Security Best Practices

⚠️ **NEVER store API keys in:**
- Config files (`.json`, `.env`)
- Git repositories
- Project directories

✅ **ALWAYS pass API keys via:**
- `--env` flag when adding MCP
- Environment variables at runtime
- Claude Code's secure storage

## 📊 Features in Detail

### Time Tracking
- Automatically starts when task status → `in_progress`
- Stops and records time when status → `completed`
- Updates ClickUp with actual time spent

### Commit Linking
- Each commit creates a task in Commits list
- Completed tasks link to their final commit
- Full development traceability

### Attachment Support
- Upload screenshots, documents, or any file
- Claude can prompt: "Would you like to add a screenshot?"
- Files attached directly to ClickUp tasks

### Parent Task Management
- Parent tasks auto-update based on subtasks
- Status flows: `pending` → `in_progress` → `completed`
- Automatic completion when all subtasks done

## 🐛 Troubleshooting

### "Status validation failed"
- Configure custom statuses in ClickUp (see Status Configuration above)
- Run `clickmongrel check-statuses` to verify

### "No list ID available"
- Run setup again: `node dist/quick-setup.js --workspace "Your Workspace"`

### "Invalid API key"
- Check API key is correct
- Ensure it's passed via `--env` flag, not in config files

### Tasks not syncing
1. Check statuses are configured
2. Verify API key is set
3. Ensure workspace/space are correct
4. Check logs: `LOG_LEVEL=debug node dist/index.js`

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/clickmongrel)
- [MCP Documentation](https://modelcontextprotocol.io)
- [ClickUp API Docs](https://clickup.com/api)

## 💡 Tips for Claude Users

1. **Let Claude handle setup**: Just tell Claude your workspace name
2. **Use natural language**: "Create a goal for this feature"
3. **TodoWrite integration**: Automatic - just use TodoWrite normally
4. **Ask for attachments**: Claude can prompt for screenshots
5. **Check progress**: "Show sync status" or "Validate statuses"

## 🚨 Important Notes

- This is a PUBLIC project - never reference specific workspaces in code
- API keys must NEVER be stored in project files
- Always use environment variables for sensitive data
- Configure ClickUp statuses before first use

---

**Built for developers using Claude Code with ClickUp integration needs**