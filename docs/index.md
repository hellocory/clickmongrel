---
layout: default
title: ClickMongrel MCP Server
---

# ClickMongrel MCP Server

> Seamless ClickUp integration for Claude AI - Task sync, time tracking, and project management

## 🚀 Features

- **Real-time Task Sync**: Automatically sync Claude's TodoWrite with ClickUp tasks
- **Smart Status Mapping**: Intelligent mapping between Claude and ClickUp task statuses
- **Goal Tracking**: Track and manage project goals directly from Claude
- **Time Tracking**: Built-in time tracking for tasks
- **Commit Integration**: Link git commits to ClickUp tasks
- **Natural Language**: Create tasks using natural language
- **Workspace Management**: Handle multiple ClickUp workspaces

## 📚 Documentation

### Getting Started
- [Quick Setup Guide](./QUICK_SETUP) - Get up and running in 5 minutes
- [Manual Setup Guide](./MANUAL_SETUP) - Detailed setup instructions
- [Security Guide](./SECURITY) - Security best practices

### API Reference
- [MCP Tools](./api/tools) - Available MCP tools
- [Configuration](./api/configuration) - Configuration options
- [ClickUp Integration](./api/clickup) - ClickUp API integration

### Guides
- [Task Management](./guides/tasks) - Managing tasks with ClickMongrel
- [Goal Tracking](./guides/goals) - Setting and tracking goals
- [Time Tracking](./guides/time) - Using the time tracking features
- [Troubleshooting](./guides/troubleshooting) - Common issues and solutions

## 🔧 Installation

### Prerequisites
- Node.js 18+ 
- Claude Desktop App
- ClickUp Account with API access

### Quick Install

```bash
# Clone the repository
git clone https://github.com/hellocory/clickmongrel.git
cd clickmongrel

# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run setup
pnpm run setup
```

## 🎯 Usage

### Basic Commands

```bash
# Test connection
clickmongrel test

# Check status
clickmongrel status

# Initialize workspace
clickmongrel init

# Sync todos
clickmongrel sync
```

### In Claude

Once installed, use these MCP tools in Claude:

- `/mcp` - View available tools
- `sync_todos` - Sync current todos with ClickUp
- `get_current_goal` - Get current project goal
- `create_task` - Create a new task
- `update_task` - Update existing task
- `track_time` - Track time on a task

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/hellocory/clickmongrel)
- [NPM Package](https://www.npmjs.com/package/@clickmongrel/mcp-server)
- [ClickUp API Documentation](https://clickup.com/api)
- [MCP Documentation](https://modelcontextprotocol.io)

## 💬 Support

- [Report Issues](https://github.com/hellocory/clickmongrel/issues)
- [Discussions](https://github.com/hellocory/clickmongrel/discussions)