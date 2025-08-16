#!/usr/bin/env node
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ClickUpAPI from './utils/clickup-api.js';
import configManager from './config/index.js';
import { SpaceStatusConfig, ClickUpSpace, ClickUpList, ClickUpStatus } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.cyan.bold('\n🚀 ClickMongrel MCP Server - Initialization\n'));

async function init() {
  try {
    // Step 1: Check for API key
    let apiKey = process.env.CLICKUP_API_KEY;
    
    if (!apiKey) {
      const { inputApiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'inputApiKey',
          message: 'Enter your ClickUp API key:',
          validate: (input) => input.length > 0 || 'API key is required'
        }
      ]);
      apiKey = inputApiKey;
    }

    console.log(chalk.green('✓ API key configured'));

    // Step 2: Initialize API and test connection
    const api = new ClickUpAPI(apiKey!);
    console.log(chalk.yellow('Testing ClickUp connection...'));
    
    const user = await api.getCurrentUser();
    console.log(chalk.green(`✓ Connected as: ${user.username} (${user.email})`));

    // Step 2.5: Enable auto-assignment by default for connected user
    const enableAutoAssign = true;
    const assigneeUserId = user.id;
    console.log(chalk.green(`✓ Auto-assignment enabled for user: ${user.username} (${user.email})`));

    // Step 3: Get teams/workspaces
    console.log(chalk.yellow('Fetching workspaces...'));
    const teams = await api.getTeams();
    
    if (teams.length === 0) {
      console.log(chalk.red('No workspaces found. Please check your API key.'));
      process.exit(1);
    }

    // Step 4: Select workspace
    const { selectedTeam } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTeam',
        message: 'Select your workspace:',
        choices: teams.map((t) => ({ name: t.name, value: t }))
      }
    ]);

    console.log(chalk.green(`✓ Selected workspace: ${selectedTeam.name}`));

    // Step 5: Get spaces
    console.log(chalk.yellow('Fetching spaces...'));
    const spaces = await api.getSpaces(selectedTeam.id);
    
    if (spaces.length === 0) {
      console.log(chalk.red('No spaces found in workspace.'));
      process.exit(1);
    }

    // Step 6: Select space
    const { selectedSpace } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedSpace',
        message: 'Select your default space:',
        choices: spaces.map((s: ClickUpSpace) => ({ name: s.name, value: s }))
      }
    ]);

    console.log(chalk.green(`✓ Selected space: ${selectedSpace.name}`));

    // Step 7: Get lists
    console.log(chalk.yellow('Fetching lists...'));
    const lists = await api.getLists(selectedSpace.id);
    
    if (lists.length === 0) {
      console.log(chalk.red('No lists found in space.'));
      process.exit(1);
    }

    // Step 8: Select list
    const { selectedList } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedList',
        message: 'Select your default list for tasks:',
        choices: lists.map((l: ClickUpList) => ({ name: `${l.name} (${l.task_count || 0} tasks)`, value: l }))
      }
    ]);

    console.log(chalk.green(`✓ Selected list: ${selectedList.name}`));

    // Step 9: Get and cache statuses
    console.log(chalk.yellow('Configuring status mappings...'));
    const statuses = selectedList.statuses;
    
    // Find best matches for todo statuses
    const todoStatus = statuses.find((s: ClickUpStatus) => 
      s.status.toLowerCase().includes('to do') || 
      s.status.toLowerCase().includes('todo')
    ) || statuses[0];
    
    const progressStatus = statuses.find((s: ClickUpStatus) => 
      s.status.toLowerCase().includes('progress') || 
      s.status.toLowerCase().includes('doing')
    ) || statuses[1];
    
    const doneStatus = statuses.find((s: ClickUpStatus) => 
      s.status.toLowerCase().includes('done') || 
      s.status.toLowerCase().includes('complete')
    ) || statuses[statuses.length - 1];

    console.log(chalk.cyan('\nStatus mappings:'));
    console.log(`  pending → ${todoStatus.status}`);
    console.log(`  in_progress → ${progressStatus.status}`);
    console.log(`  completed → ${doneStatus.status}`);

    const { confirmMappings } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmMappings',
        message: 'Are these status mappings correct?',
        default: true
      }
    ]);

    let statusMappings = {
      pending: todoStatus.status,
      in_progress: progressStatus.status,
      completed: doneStatus.status
    };

    if (!confirmMappings) {
      // Allow custom mapping
      const customMappings = await inquirer.prompt([
        {
          type: 'list',
          name: 'pending',
          message: 'Select status for "pending" todos:',
          choices: statuses.map((s: ClickUpStatus) => s.status)
        },
        {
          type: 'list',
          name: 'in_progress',
          message: 'Select status for "in_progress" todos:',
          choices: statuses.map((s: ClickUpStatus) => s.status)
        },
        {
          type: 'list',
          name: 'completed',
          message: 'Select status for "completed" todos:',
          choices: statuses.map((s: ClickUpStatus) => s.status)
        }
      ]);
      statusMappings = customMappings;
    }

    // Step 10: Save configuration
    console.log(chalk.yellow('\nSaving configuration...'));

    // Save main config
    const config = {
      clickup: {
        api_key: apiKey!,
        workspace_id: selectedTeam.id,
        default_space: selectedSpace.name,
        default_list: selectedList.name,
        auto_assign_user: enableAutoAssign,
        assignee_user_id: assigneeUserId
      },
      sync: {
        enabled: true,
        interval: 300,
        todo_write_sync: true,
        commit_tracking: true,
        auto_status_update: true
      },
      goals: {
        track_progress: true,
        auto_switch: true,
        clickup_custom_field: 'goal_id'
      },
      reports: {
        daily: {
          enabled: true,
          time: '18:00',
          auto_submit: false
        },
        weekly: {
          enabled: true,
          day: 'friday',
          time: '17:00',
          auto_submit: false
        }
      },
      templates: {
        task_creation: 'task_creation.md',
        subtask_creation: 'subtask_creation.md',
        future_tasks: 'future_tasks.md',
        daily_report: 'daily_report.md',
        weekly_report: 'weekly_report.md'
      },
      hooks: {
        todo_write: true,
        git_commit: true,
        status_change: true
      }
    };

    configManager.saveConfig(config);

    // Save status config
    const statusConfig: SpaceStatusConfig = {
      spaces: {
        [selectedSpace.name]: {
          lists: {
            [selectedList.name]: {
              statuses: statuses,
              default_status: todoStatus.status,
              complete_status: doneStatus.status
            }
          }
        }
      },
      status_mappings: statusMappings
    };

    configManager.saveStatusConfig(statusConfig);

    console.log(chalk.green('✓ Configuration saved'));

    // Step 11: Create .claude/clickup structure first
    console.log(chalk.yellow('\nCreating .claude/clickup structure...'));
    const claudeDir = path.join(process.cwd(), '.claude/clickup');
    const templatesDir = path.join(claudeDir, 'templates');
    
    // Ensure directories exist
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Step 12: Create commit templates if they don't exist
    console.log(chalk.yellow('Setting up commit templates...'));
    const commitTemplatePath = path.join(claudeDir, 'templates', 'commit-templates.json');
    if (!fs.existsSync(commitTemplatePath)) {
      // Ensure templates directory exists
      const templateDir = path.dirname(commitTemplatePath);
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }
      const defaultCommitTemplates = {
        templates: {
          default: {
            title: "[COMMIT] {type}: {description}",
            body: "## Commit Details\\n\\n**Type:** {type}\\n**Scope:** {scope}\\n**Description:** {description}\\n\\n**Hash:** `{hash}`\\n**Author:** {author}\\n**Timestamp:** {timestamp}\\n\\n### Changes\\n{changes}\\n\\n### Files Modified\\n{files}\\n\\n---\\n*Tracked by ClickMongrel MCP*"
          },
          simple: {
            title: "{type}: {description}",
            body: "Commit: `{hash}`\\nAuthor: {author}\\n\\n{description}"
          },
          detailed: {
            title: "[{type}] {scope}: {description} ({hash_short})",
            body: "## 📝 Commit Information\\n\\n### Summary\\n{description}\\n\\n### Details\\n- **Type:** `{type}`\\n- **Scope:** `{scope}`\\n- **Hash:** `{hash}`\\n- **Author:** {author}\\n- **Date:** {timestamp}\\n\\n### Modified Files\\n```\\n{files}\\n```\\n\\n### Full Commit Message\\n```\\n{raw_message}\\n```"
          }
        },
        typeMapping: {
          feat: "✨ Feature",
          fix: "🐛 Fix",
          docs: "📚 Documentation",
          style: "💎 Style",
          refactor: "♻️ Refactor",
          test: "✅ Test",
          chore: "🔧 Chore",
          perf: "⚡ Performance",
          ci: "👷 CI",
          build: "📦 Build",
          revert: "⏪ Revert"
        },
        defaultTemplate: "default",
        parsePattern: "^(?<type>\\\\w+)(?:\\\\((?<scope>[^)]+)\\\\))?:\\\\s+(?<description>.+)$"
      };
      
      fs.writeFileSync(commitTemplatePath, JSON.stringify(defaultCommitTemplates, null, 2));
      console.log(chalk.green('✓ Commit templates created'));
    } else {
      console.log(chalk.green('✓ Commit templates already exist'));
    }

    // Step 13: Create template files with default content
    console.log(chalk.yellow('Creating template files...'));
    
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Create template files with default content
    const templateFiles = [
      { name: 'task_creation.md', content: configManager.loadTemplate('task_creation') },
      { name: 'subtask_creation.md', content: configManager.loadTemplate('subtask_creation') },
      { name: 'future_tasks.md', content: configManager.loadTemplate('future_tasks') },
      { name: 'daily_report.md', content: configManager.loadTemplate('daily_report') },
      { name: 'weekly_report.md', content: configManager.loadTemplate('weekly_report') },
      { name: 'README.md', content: getTemplateDocumentation() }
    ];

    for (const template of templateFiles) {
      const templatePath = path.join(templatesDir, template.name);
      if (!fs.existsSync(templatePath)) {
        fs.writeFileSync(templatePath, template.content);
        console.log(chalk.green(`  ✓ Created template: ${template.name}`));
      } else {
        console.log(chalk.yellow(`  ~ Template exists: ${template.name}`));
      }
    }

    console.log(chalk.green('✓ Templates folder configured'));

    // Step 12: Setup instructions
    console.log(chalk.cyan.bold('\n📋 Setup Complete!\n'));
    console.log('To start using ClickMongrel with Claude Code:\n');
    console.log(chalk.white('1. Build the project:'));
    console.log(chalk.gray('   pnpm run build\n'));
    console.log(chalk.white('2. Add to Claude Code:'));
    console.log(chalk.gray(`   claude mcp add clickmongrel --env CLICKUP_API_KEY=${apiKey} -- node ${path.join(__dirname, '../dist/index.js')}\n`));
    console.log(chalk.white('3. Test the integration:'));
    console.log(chalk.gray('   In Claude Code, type: /mcp'));
    console.log(chalk.gray('   Then use: mcp__clickmongrel__get_sync_status\n'));
    
    console.log(chalk.yellow('Optional: Configure hooks in .claude/settings.json for automatic TodoWrite sync'));
    console.log(chalk.green('\n✨ Happy coding with ClickMongrel!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Initialization failed:'), error);
    process.exit(1);
  }
}

function getTemplateDocumentation(): string {
  return `# ClickMongrel Templates Documentation

## Overview

ClickMongrel uses customizable templates to format task descriptions, reports, and other content sent to ClickUp. Templates use a simple variable substitution system with \`{{variable_name}}\` placeholders.

## Available Templates

### 1. task_creation.md
Used when creating new tasks from TodoWrite items.

**Available Variables:**
- \`{{title}}\` - Parsed task title
- \`{{description}}\` - Original todo content
- \`{{category}}\` - Auto-detected category (feature, fix, enhancement, etc.)
- \`{{priority}}\` - Task priority (urgent, high, normal, low)
- \`{{estimated_time}}\` - Human-readable time estimate (e.g., "30 minutes")
- \`{{tags}}\` - Comma-separated list of auto-generated tags
- \`{{created_at}}\` - Formatted creation timestamp
- \`{{todo_id}}\` - Unique TodoWrite identifier

### 2. subtask_creation.md
Used for creating subtasks (currently same variables as task_creation).

**Additional Variables:**
- \`{{parent_id}}\` - Parent task ID
- \`{{goal_title}}\` - Associated goal name

### 3. future_tasks.md
Used for planning future tasks or backlog items.

**Available Variables:**
- \`{{title}}\` - Task title
- \`{{description}}\` - Task description
- \`{{planned_start}}\` - Estimated start date
- \`{{estimated_time}}\` - Duration estimate
- \`{{priority}}\` - Priority level
- \`{{dependencies}}\` - Task dependencies
- \`{{category}}\` - Task category
- \`{{tags}}\` - Associated tags
- \`{{notes}}\` - Additional notes
- \`{{todo_id}}\` - Unique identifier

### 4. daily_report.md
Template for generating daily progress reports.

**Available Variables:**
- \`{{date}}\` - Report date
- \`{{goal_title}}\` - Current goal name
- \`{{goal_progress}}\` - Goal completion percentage
- \`{{completed_tasks}}\` - Array of completed tasks
- \`{{in_progress_tasks}}\` - Array of active tasks
- \`{{tomorrow_tasks}}\` - Array of planned tasks
- \`{{notes}}\` - Additional notes

**Array Variables (use with loops):**
Each task in arrays contains:
- \`{{title}}\` - Task name
- \`{{time_tracked}}\` - Time spent
- \`{{commits}}\` - Related git commits
- \`{{progress}}\` - Completion percentage
- \`{{blockers}}\` - Identified blockers

### 5. weekly_report.md
Template for weekly summary reports.

**Available Variables:**
- \`{{week_start}}\` - Week starting date
- \`{{goal_title}}\` - Current goal
- \`{{goal_progress}}\` - Overall goal progress
- \`{{week_progress}}\` - This week's progress
- \`{{completed_tasks}}\` - Completed work
- \`{{in_progress_tasks}}\` - Active work
- \`{{commits}}\` - All commits this week
- \`{{next_week_tasks}}\` - Planned work
- \`{{blockers}}\` - Current challenges
- \`{{notes}}\` - Summary notes

## Template Syntax

### Basic Variables
\`\`\`markdown
# {{title}}

**Priority**: {{priority}}
**Category**: {{category}}
**Created**: {{created_at}}
\`\`\`

### Conditional Content
While not implemented yet, you can use conditional logic in templates:

\`\`\`markdown
{{#if priority_urgent}}
🔥 **URGENT TASK**
{{/if}}

{{#unless tags_empty}}
**Tags**: {{tags}}
{{/unless}}
\`\`\`

### Array Loops (Future Enhancement)
\`\`\`markdown
## Completed Tasks
{{#each completed_tasks}}
- {{title}} ({{time_tracked}})
  {{#each commits}}
  - Commit: {{.}}
  {{/each}}
{{/each}}
\`\`\`

## Smart Task Analysis

ClickMongrel automatically analyzes your TodoWrite content to extract:

### Categories
- **feature** - New functionality
- **fix** - Bug fixes
- **enhancement** - Improvements
- **refactor** - Code restructuring
- **test** - Testing work
- **docs** - Documentation
- **style** - Styling/formatting
- **chore** - Maintenance tasks

### Tags
Auto-generated based on content analysis:
- Technology tags (react, typescript, api, etc.)
- Action tags (implement, update, debug, etc.)
- Priority tags (urgent, important, etc.)

### Time Estimation
Intelligent parsing of time references:
- "30 minutes", "2 hours", "half day"
- "quick fix", "major refactor"
- Auto-estimation based on task complexity

### Priority Detection
Automatic priority assignment:
- **urgent** - Critical issues, production bugs
- **high** - Important features, user-facing issues
- **normal** - Standard development tasks
- **low** - Nice-to-have improvements

## Customization Guide

### 1. Edit Templates
Simply modify the \`.md\` files in this directory. Changes take effect immediately.

### 2. Add Custom Variables
To add custom variables, modify:
- \`src/handlers/sync.ts\` - \`buildTaskDescription()\` method
- Add your variable to the \`templateVars\` object

### 3. Advanced Formatting
For complex formatting, modify the template engine in:
- \`src/config/index.ts\` - \`loadTemplate()\` and \`getDefaultTemplate()\` methods

### 4. Custom Analyzers
Enhance task analysis in:
- \`src/utils/task-analyzer.ts\` - Add new analysis functions

## Examples

### Enhanced Task Template
\`\`\`markdown
# 🎯 {{title}}

## Description
{{description}}

## Project Details
- **🏷️ Category**: {{category}}
- **⚡ Priority**: {{priority}}
- **⏱️ Estimate**: {{estimated_time}}
- **🏷️ Tags**: {{tags}}

## Timeline
- **📅 Created**: {{created_at}}
- **🎯 Due**: {{due_date}}

## Technical Notes
\`\`\`

### Rich Report Template
\`\`\`markdown
# 📊 Daily Progress - {{date}}

## 🎯 Goal: {{goal_title}}
**Progress**: {{goal_progress}}% complete

## ✅ Completed Today
{{#each completed_tasks}}
### {{title}}
- **Time**: {{time_tracked}}
- **Category**: {{category}}
{{#if commits}}
- **Commits**: {{commits}}
{{/if}}
{{/each}}

## 🔄 In Progress
{{#each in_progress_tasks}}
- {{title}} ({{progress}}%)
{{/each}}

## 📅 Tomorrow's Focus
{{#each tomorrow_tasks}}
- [ ] {{title}}
{{/each}}

---
Generated by ClickMongrel v1.0
\`\`\`

## Best Practices

1. **Keep templates focused** - Each template should serve a specific purpose
2. **Use consistent formatting** - Maintain visual consistency across templates
3. **Include essential metadata** - Priority, category, time estimates help with planning
4. **Leverage emojis sparingly** - Use them for visual hierarchy, not decoration
5. **Test your changes** - Verify templates render correctly in ClickUp
6. **Version control** - Keep templates in git for team consistency

## Troubleshooting

### Variables Not Substituting
- Check variable name spelling: \`{{title}}\` not \`{{Title}}\`
- Ensure variable exists in the template context
- Check for extra spaces: \`{{ title }}\` should be \`{{title}}\`

### Template Not Loading
- Verify file path and permissions
- Check template syntax for errors
- Review logs for specific error messages

### Formatting Issues
- Test templates in a markdown preview
- Remember ClickUp has its own markdown parser
- Some markdown features may not be supported

## Need Help?

- Check the main project documentation
- Review example templates in this directory
- Look at the source code in \`src/handlers/sync.ts\`
- Create an issue on GitHub for bugs or feature requests

---

Last updated: Generated during ClickMongrel initialization
`;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  init();
}

export default init;