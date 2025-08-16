# Changelog

All notable changes to ClickMongrel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-08-16

### Added
- 🔄 **Automatic TodoWrite Sync** - Seamless integration with Claude's TodoWrite
- 👨‍👩‍👧‍👦 **Parent-Child Task Relationships** - Subtasks with automatic parent status management
- ⏱️ **Smart Time Tracking** - Automatic time tracking from task start to completion
- 📝 **Commit Linking** - Links completed tasks to their commits
- 📎 **Attachment Support** - Upload screenshots, demos, and files to tasks
- 👤 **Auto-Assignment** - Tasks automatically assigned to configured user
- 📊 **Status Lifecycle** - Custom ClickUp status management
- 🎯 **Goal Management** - Track project goals and progress
- 📈 **Report Generation** - Daily and weekly development reports
- 🚀 **AI-Optimized Setup** - Natural language setup commands
- 🔐 **Secure Configuration** - Environment variable based API key management
- 📦 **MCP Tools** - Full suite of MCP tools for Claude integration
- 🏗️ **Workspace Management** - Multi-workspace and space support
- 🔍 **Status Validation** - Automatic validation of ClickUp configurations
- 💾 **Smart Caching** - Performance optimization with intelligent caching

### Security
- API keys stored via environment variables only
- No sensitive data in configuration files
- Secure MCP integration with Claude Code

### Technical Details
- Built with TypeScript and Node.js 18+
- MCP (Model Context Protocol) implementation
- Axios for HTTP requests
- Winston for logging
- Commander for CLI
- Full ESM module support

## [0.9.0-beta] - 2024-08-15

### Added
- Initial beta release
- Basic TodoWrite sync functionality
- ClickUp API integration
- MCP server implementation

---

## Upcoming Features (Roadmap)

### [1.1.0] - Planned
- Webhook support for real-time ClickUp → Claude sync
- Multi-team collaboration features
- Advanced analytics and reporting
- Custom field mappings
- Bulk operations support

### [1.2.0] - Planned
- Slack/Discord notifications
- GitHub/GitLab integration
- Advanced time tracking analytics
- AI-powered task suggestions
- Template management system

---

For more information, see the [README](README.md) or visit the [GitHub repository](https://github.com/yourusername/clickmongrel).