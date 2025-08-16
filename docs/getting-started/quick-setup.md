---
layout: default
title: Quick Setup
parent: Getting Started
nav_order: 1
---

# Quick Setup Guide
{: .no_toc }

Get ClickMongrel up and running in 5 minutes
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Claude Desktop App
- ✅ ClickUp account with API access
- ✅ pnpm package manager (`npm install -g pnpm`)

## Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/hellocory/clickmongrel.git
cd clickmongrel

# Install dependencies
pnpm install

# Build the project
pnpm run build
```

## Step 2: Get Your ClickUp API Key

1. Log into [ClickUp](https://app.clickup.com)
2. Navigate to **Settings** → **Apps**
3. Click **Generate** under Personal API Token
4. Copy your API key

<div class="code-example" markdown="1">
⚠️ **Important**: Keep your API key secure and never commit it to version control
</div>

## Step 3: Run Setup Wizard

The easiest way to configure ClickMongrel:

```bash
pnpm run setup
```

This interactive wizard will:
- ✅ Validate your API key
- ✅ List available workspaces
- ✅ Help you select a default workspace
- ✅ Configure status mappings
- ✅ Set up the MCP server

## Step 4: Add to Claude

Add ClickMongrel to Claude Code:

```bash
claude mcp add clickmongrel \
  --env CLICKUP_API_KEY=pk_your_api_key_here \
  -- node /full/path/to/clickmongrel/dist/index.js
```

Replace:
- `pk_your_api_key_here` with your actual ClickUp API key
- `/full/path/to/clickmongrel` with the absolute path to the cloned repository

## Step 5: Verify Installation

In Claude Code, type:

```
/mcp
```

You should see `clickmongrel` in the list of available MCP servers.

## Test the Connection

Try creating a simple todo list in Claude:

```
TodoWrite:
- [ ] Test task from Claude
- [ ] Verify sync to ClickUp
```

Then check your ClickUp workspace - the tasks should appear automatically!

## Next Steps

- [Configure status mappings](../configuration/status-mapping)
- [Set up custom fields](../configuration/custom-fields)
- [Enable time tracking](../features/time-tracking)
- [Link git commits](../features/commit-linking)

## Troubleshooting

### "API key not valid" error
- Ensure your API key starts with `pk_`
- Check that you copied the entire key
- Try regenerating the key in ClickUp

### Tasks not syncing
- Verify the workspace ID is correct
- Check that the list exists in ClickUp
- Review logs: `tail -f ~/.clickmongrel/logs/sync.log`

### MCP server not showing in Claude
- Ensure the path in the claude command is absolute
- Check that `dist/index.js` exists after building
- Restart Claude Code after adding the MCP server

---

Need help? [Open an issue](https://github.com/hellocory/clickmongrel/issues) on GitHub!