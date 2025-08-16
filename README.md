# ClickMongrel - ClickUp MCP Server for Claude

A Model Context Protocol (MCP) server that seamlessly integrates Claude's TodoWrite with ClickUp, providing automatic task synchronization, commit tracking, and project management.

## Features

- 🔄 **Automatic TodoWrite Sync** - Tasks created in Claude automatically sync to ClickUp
- 📊 **Commit Lifecycle Tracking** - Track git commits through development stages
- 📈 **Goal Management** - Track project goals and progress
- 📝 **Report Generation** - Daily and weekly development reports
- 🚀 **AI-Optimized Setup** - Simple one-command setup for Claude users

## Quick Start

### For Claude AI Users

When a user says "setup clickup for me", run:

```bash
# Install globally
npm install -g @clickmongrel/mcp-server

# Setup with API key
clickmongrel setup-clickup --api-key <USER_API_KEY>

# Or with specific workspace
clickmongrel setup-clickup --api-key <KEY> --workspace-name "<workspace>"

# Or create in new space
clickmongrel setup-clickup --api-key <KEY> --space-name "Project Name"
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/clickmongrel.git
cd clickmongrel

# Install dependencies
pnpm install

# Build
pnpm run build

# Run setup
node dist/cli.js setup-clickup --api-key <YOUR_API_KEY>
```

## Configuration

The setup creates a `.claude/clickup/` folder in your project with:

```
.claude/
└── clickup/
    ├── config.json        # Main configuration
    ├── mcp-env.json      # Environment variables
    ├── cache/            # Temporary cache
    ├── logs/             # Sync logs
    └── reports/          # Generated reports
        ├── daily/
        └── weekly/
```

## ClickUp Structure

The integration creates:

### Space: "Agentic Development" (or custom)
- **Folders:**
  - Weekly Reports - Weekly development summaries
  - Daily Reports - Daily progress updates
  - Docs - Documentation and context

- **Lists:**
  - **Commits** - Git commit tracking with lifecycle statuses
  - **Tasks** - Task management synced with TodoWrite

## Commit Lifecycle Statuses

Commits are tracked through these stages:

1. **COMMITTED** (gray) - Local commit
2. **DEVELOPING** (yellow) - Pushed to development branch
3. **PROTOTYPING** (purple) - Merged to staging
4. **REJECTED** (orange) - Issues found/reverted
5. **PRODUCTION/TESTING** (blue) - In production testing
6. **PRODUCTION/FINAL** (green) - Stable in production

## Task Statuses

Tasks sync with these statuses:

- **to do** (gray) - Not started
- **future** (blue) - Planned for future
- **in progress** (yellow) - Currently working
- **fixing** (orange) - Fixing issues
- **completed** (green) - Done

## CLI Commands

```bash
# Setup
clickmongrel setup-clickup --api-key <KEY> [options]

# Status check
clickmongrel status

# Test connection
clickmongrel test

# Track commits
clickmongrel commit track              # Track current commit
clickmongrel commit status --hash <HASH> --status <EVENT>

# Generate reports
clickmongrel report daily
clickmongrel report weekly

# Goal management
clickmongrel goal --current            # Show current goal
clickmongrel goal --progress <percent>  # Update progress
```

## Environment Variables

```bash
# Required
CLICKUP_API_KEY=your_api_key

# Optional (auto-detected)
CLICKUP_WORKSPACE_ID=workspace_id
CLICKUP_SPACE_ID=space_id
```

## MCP Integration

Add to Claude's MCP servers:

```bash
claude mcp add clickmongrel -- node /path/to/clickmongrel/dist/index.js
```

## Manual Configuration Required

After setup, manually configure custom statuses in ClickUp:

1. Open ClickUp and navigate to your space
2. For each list (Commits and Tasks):
   - Click ... → List Settings → Statuses
   - Add the custom statuses as specified above

## API Key

Get your ClickUp API key:
1. Go to ClickUp Settings
2. Click "Apps" → "API Token"
3. Generate and copy your personal token

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run tests
pnpm test

# Development mode
pnpm run dev
```

## Security

- Never commit API keys to version control
- Use environment variables for sensitive data
- API keys are stored locally in `.claude/clickup/config.json`

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues or questions, please open an issue on GitHub.