---
layout: default
---

<div style="text-align: center; margin: 2rem 0;">
  <img src="./assets/logo-simple.svg" alt="ClickMongrel Logo" style="width: 150px; height: 150px;">
</div>

# Welcome to ClickMongrel

> Seamless ClickUp integration for Claude AI - Automatically sync tasks, track time, and manage projects without leaving your development environment.

<div style="text-align: center; margin: 2rem 0;">
  <a href="https://github.com/hellocory/clickmongrel" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px;">View on GitHub</a>
  <a href="#quick-start" style="display: inline-block; padding: 12px 24px; background: #764ba2; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px;">Get Started</a>
</div>

## ✨ Key Features

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h3 style="color: white; margin-top: 0;">🔄 Real-time Sync</h3>
    <p style="color: rgba(255,255,255,0.95); margin-bottom: 0;">Automatically sync Claude's TodoWrite tasks with ClickUp in real-time. No manual updates needed.</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 1.5rem; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h3 style="color: white; margin-top: 0;">🎯 Smart Status Mapping</h3>
    <p style="color: rgba(255,255,255,0.95); margin-bottom: 0;">Intelligent mapping between Claude and ClickUp task statuses with customizable workflows.</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 1.5rem; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h3 style="color: white; margin-top: 0;">⏱️ Time Tracking</h3>
    <p style="color: rgba(255,255,255,0.95); margin-bottom: 0;">Automatic time tracking from task start to completion with detailed time logs.</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 1.5rem; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h3 style="color: white; margin-top: 0;">📊 Goal Management</h3>
    <p style="color: rgba(255,255,255,0.95); margin-bottom: 0;">Track project goals and milestones directly from Claude with progress visualization.</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 1.5rem; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h3 style="color: white; margin-top: 0;">🔗 Commit Linking</h3>
    <p style="color: rgba(255,255,255,0.95); margin-bottom: 0;">Link git commits to tasks for complete development traceability.</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); padding: 1.5rem; border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h3 style="color: white; margin-top: 0;">📝 Natural Language</h3>
    <p style="color: rgba(255,255,255,0.95); margin-bottom: 0;">Create tasks using natural language - Claude understands your intent.</p>
  </div>

</div>

## 🚀 Quick Start

Get up and running in just 3 simple steps:

### Step 1: Install and Build

```bash
# Clone the repository
git clone https://github.com/hellocory/clickmongrel.git
cd clickmongrel

# Install dependencies and build
pnpm install && pnpm run build
```

### Step 2: Configure ClickUp

```bash
# Run the interactive setup wizard
pnpm run setup

# Or set your API key manually
export CLICKUP_API_KEY="pk_your_api_key_here"
```

### Step 3: Add to Claude

```bash
# Add ClickMongrel to Claude Code
claude mcp add clickmongrel \
  --env CLICKUP_API_KEY=your_key \
  -- node /path/to/clickmongrel/dist/index.js
```

That's it! Start using TodoWrite in Claude and watch your tasks sync automatically to ClickUp.

## 📚 Documentation

<div style="background: #f8f9fa; padding: 2rem; border-radius: 12px; margin: 2rem 0;">
  <h3 style="margin-top: 0;">📖 Available Guides</h3>
  
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;">
    <div>
      <h4>Getting Started</h4>
      <ul style="list-style: none; padding: 0;">
        <li>📋 <a href="./getting-started/quick-setup">Quick Setup Guide</a></li>
        <li>🔧 <a href="./docs/MANUAL_SETUP">Manual Setup</a></li>
        <li>🔒 <a href="./docs/SECURITY">Security Best Practices</a></li>
      </ul>
    </div>
    
    <div>
      <h4>API Reference</h4>
      <ul style="list-style: none; padding: 0;">
        <li>🛠️ <a href="./api/tools">MCP Tools</a></li>
        <li>⚙️ <a href="./api/configuration">Configuration</a></li>
        <li>🔗 <a href="./api/clickup">ClickUp Integration</a></li>
      </ul>
    </div>
    
    <div>
      <h4>Features</h4>
      <ul style="list-style: none; padding: 0;">
        <li>⏱️ Time Tracking</li>
        <li>🎯 Goal Management</li>
        <li>📝 Task Templates</li>
      </ul>
    </div>
  </div>
</div>

## 🛠️ Available MCP Tools

| Tool | Description |
|------|-------------|
| `sync_todos` | Sync TodoWrite tasks with ClickUp |
| `create_task` | Create a new task in ClickUp |
| `update_task` | Update an existing task |
| `track_time` | Track time spent on a task |
| `create_goal` | Create a project goal |
| `link_commit` | Link a git commit to a task |
| `generate_report` | Generate progress reports |
| `list_tasks` | List tasks from a list or space |

## 💻 Example Usage

### In Claude:

```javascript
// Create tasks with TodoWrite - automatically syncs!
TodoWrite: 
- [ ] Implement user authentication
- [x] Update API documentation
- [ ] Add unit tests for auth module

// Track time on a specific task
track_time({
  task_id: "abc123",
  duration: 45,
  description: "Implemented OAuth2 flow"
})

// Generate a weekly progress report
generate_report({
  type: "weekly",
  include_commits: true,
  include_time: true
})
```

## 🎯 Perfect For

- **Development Teams** - Track sprints, link commits, and generate reports
- **Solo Developers** - Stay organized with automatic task tracking
- **Project Managers** - Monitor progress across multiple projects
- **Content Creators** - Manage content calendars and publishing schedules

## 🤝 Contributing

We welcome contributions! Please check our [Contributing Guide](https://github.com/hellocory/clickmongrel/blob/main/CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/hellocory/clickmongrel/blob/main/LICENSE) file for details.

---

<div style="text-align: center; padding: 2rem 0; background: #f8f9fa; border-radius: 12px; margin: 3rem 0;">
  <h3>Ready to supercharge your workflow?</h3>
  <p style="color: #666; margin: 1rem 0;">Join developers using ClickMongrel to streamline their development process</p>
  <div style="margin: 1.5rem 0;">
    <a href="https://github.com/hellocory/clickmongrel" style="display: inline-block; padding: 12px 24px; background: #24292e; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px;">GitHub</a>
    <a href="https://github.com/hellocory/clickmongrel/issues" style="display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px;">Report Issue</a>
    <a href="https://github.com/hellocory/clickmongrel/discussions" style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin: 0 8px;">Discussions</a>
  </div>
</div>

<div style="text-align: center; color: #999; font-size: 0.9rem; margin-top: 3rem;">
  <p>Made with ❤️ by the ClickMongrel team</p>
  <p>
    <a href="https://github.com/hellocory/clickmongrel" style="color: #999;">GitHub</a> • 
    <a href="https://www.npmjs.com/package/@clickmongrel/mcp-server" style="color: #999;">NPM</a> • 
    <a href="https://clickup.com/api" style="color: #999;">ClickUp API</a> • 
    <a href="https://modelcontextprotocol.io" style="color: #999;">MCP Docs</a>
  </p>
</div>