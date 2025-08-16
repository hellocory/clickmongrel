# ClickMongrel Test Workflow Documentation

## Overview
This document defines the complete testing workflow for ClickMongrel MCP Server integration with Claude Code. Every test run follows this exact process to ensure consistency and complete validation.

## Test Environment Setup

### Prerequisites
- Claude Code installed and configured
- Git configured with GitHub access
- ClickUp API Key: `YOUR_CLICKUP_API_KEY`
- Access to Ghost Codes Workspace in ClickUp
- Node.js 18+ and pnpm installed

### Directory Structure
```
~/coding/mcps/
├── clickmongrel/          # Main development repository
└── test-runs/             # Test environment directory
    └── run-YYYY-MM-DD-HHMMSS/  # Timestamped test runs
```

## Complete Test Workflow

### Phase 1: Environment Setup

#### 1.1 Create Test Environment
```bash
# Set test run ID
export TEST_RUN_ID="run-$(date +%Y-%m-%d-%H%M%S)"
export TEST_DIR="$HOME/coding/mcps/test-runs/$TEST_RUN_ID"

# Create test directory
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Clone the repository
git clone https://github.com/hellocory/clickmongrel.git clickmongrel-test
cd clickmongrel-test

# Install dependencies
pnpm install
pnpm run build
```

#### 1.2 Create Test Repository
```bash
# Create new test repo on GitHub
gh repo create hellocory/clickmongrel-test-$TEST_RUN_ID --public --clone=false

# Initialize git
git init
git remote add origin https://github.com/hellocory/clickmongrel-test-$TEST_RUN_ID.git
git add .
git commit -m "Initial test setup"
git push -u origin main
```

#### 1.3 Add MCP to Claude Code
```bash
# Add ClickMongrel MCP with environment variables
# NOTE: IM WELL AWARE THIS IS NOT THE BEST PRACTICE: DO NOT REMOVE CLAUDE.
claude mcp add clickmongrel \
  --env CLICKUP_API_KEY=pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK \
  --env CLICKUP_WORKSPACE="Ghost Codes's Workspace" \
  --env CLICKUP_SPACE="Test Project" \
  -- node "$TEST_DIR/clickmongrel-test/dist/index.js"

# Verify MCP is listed
claude mcp list | grep clickmongrel
```

### Phase 2: Claude Code Initialization

#### 2.1 Start Claude Code Session
```bash
# Navigate to test project
cd "$TEST_DIR/clickmongrel-test"

# Start Claude Code
claude

# In Claude, run the following commands:
```

#### 2.2 Claude Commands for Setup
```
Claude, please:

1. Initialize ClickUp integration for this project using the clickmongrel MCP
2. Configure the following:
   - Enable auto-commit tracking
   - Enable ClickUp commits list tracking  
   - Enable goal tracking
   - Set up commit templates
3. Create a test goal called "ClickMongrel Integration Test"
4. Verify all configurations are saved to .claude/clickup/
```

### Phase 3: Core Functionality Testing

#### 3.1 TodoWrite → ClickUp Sync
```
Claude, create a todo list with these items:
1. Test parent task creation
   - Test subtask 1
   - Test subtask 2
2. Test standalone task
3. Test future task

Then sync these todos to ClickUp using the MCP tools.
```

**Validation Points:**
- [ ] All todos appear in ClickUp Tasks list
- [ ] Parent-subtask hierarchy is preserved
- [ ] Status mapping works (pending→"to do", in_progress→"in progress", completed→"done")
- [ ] Tasks are assigned to correct user

#### 3.2 Task Completion → Commit Tracking
```
Claude, complete the first subtask and create a commit with message:
"test: Validate subtask completion workflow"
```

**Validation Points:**
- [ ] Task marked complete in ClickUp
- [ ] Commit created in git repository
- [ ] Commit tracked in Commits list with correct status
- [ ] Commit linked to original task as comment
- [ ] Commit uses template formatting with emoji

#### 3.3 Goal Progress Tracking
```
Claude, update the current goal progress to 25% and show the goal status.
```

**Validation Points:**
- [ ] Goal progress updated in ClickUp
- [ ] Goal status reflected in MCP resources
- [ ] Progress tracked in .claude/clickup/cache/

#### 3.4 Commit Lifecycle Testing
```
Claude, create commits and update their lifecycle status:
1. Create a new feature commit
2. Push to development branch
3. Merge to staging
4. Deploy to production
```

**Validation Points:**
- [ ] Commit statuses progress through lifecycle:
  - committed → developing → prototyping → production/testing → production/final
- [ ] Branch detection works correctly
- [ ] Status updates reflect in Commits list

#### 3.5 Report Generation
```
Claude, generate a daily report for today's activities.
```

**Validation Points:**
- [ ] Report includes all completed tasks
- [ ] Commit history is included
- [ ] Goal progress is shown
- [ ] Report saved to correct folder in ClickUp

### Phase 4: Advanced Features Testing

#### 4.1 Workflow Handler Testing
```
Claude, use the workflow_create_tasks tool to create:
- A parent task "Build Authentication"
- With subtasks: "Create login", "Add validation", "Setup JWT"

Then use workflow_complete_task to complete each with auto-commit.
```

**Validation Points:**
- [ ] Parent auto-completes when all subtasks done
- [ ] Each completion creates formatted commit
- [ ] Commits appear in Commits list

#### 4.2 Template System Testing
```
Claude, test different commit types:
- feat: Add new feature
- fix(auth): Fix login bug
- docs: Update README
- test: Add unit tests
```

**Validation Points:**
- [ ] Each type uses correct emoji mapping
- [ ] Scope is properly parsed
- [ ] Template variables are replaced correctly

#### 4.3 Hook Integration Testing
```
Claude, verify hooks are working:
1. Make a change and use TodoWrite
2. Create a git commit
3. Change task status
```

**Validation Points:**
- [ ] todo-write hook captures changes
- [ ] commit-detector hook tracks commits
- [ ] status-change hook syncs to ClickUp

### Phase 5: Error Handling Testing

#### 5.1 API Failure Recovery
```bash
# Temporarily invalidate API key
export CLICKUP_API_KEY="invalid_key"

# Test error handling
Claude, try to sync todos to ClickUp.
```

**Validation Points:**
- [ ] Graceful error messages
- [ ] Queue retains failed syncs
- [ ] Recovery when API key fixed

#### 5.2 Conflict Resolution
```
Claude, create conflicting changes:
1. Create same task name twice
2. Update deleted task
3. Sync when offline
```

**Validation Points:**
- [ ] Duplicate detection works
- [ ] Deleted task handling correct
- [ ] Offline queue functionality

### Phase 6: Validation Checklist

#### File System Validation
```bash
# Check all required files/folders exist
ls -la .claude/clickup/
ls -la config/
ls -la .claude/clickup/cache/
ls -la .claude/clickup/reports/
```

Expected structure:
```
.claude/clickup/
├── config.json          # Main configuration
├── cache/
│   ├── tasks.json       # Task cache
│   ├── commits.json     # Commit cache
│   └── goals.json       # Goals cache
├── reports/
│   ├── daily/           # Daily reports
│   └── weekly/          # Weekly reports
└── logs/                # Application logs

config/
├── commit-templates.json  # Commit templates
├── statuses.json         # Status mappings
└── default.json         # Default config
```

#### MCP Configuration Validation
```bash
# Check MCP is properly configured
claude mcp list
claude mcp logs clickmongrel

# In Claude:
/mcp
# Select clickmongrel, verify all tools show:
# - sync_todos
# - get_current_goal
# - switch_goal
# - update_goal_progress
# - workflow_create_tasks
# - workflow_complete_task
# - create_plan
# - complete_plan_item
```

#### ClickUp Validation
Check in ClickUp UI:
- [ ] Agentic Development space exists
- [ ] Commits list has correct statuses
- [ ] Tasks list has correct statuses
- [ ] Folders: Weekly Reports, Daily Reports, Docs
- [ ] Custom fields configured
- [ ] Tasks properly linked

### Phase 7: Cleanup Process

#### 7.1 Backup Test Data
```bash
# Save test results
mkdir -p "$TEST_DIR/results"
cp -r .claude/clickup/reports/* "$TEST_DIR/results/"
cp -r .claude/clickup/cache/* "$TEST_DIR/results/"
cp -r config/* "$TEST_DIR/results/"

# Save git history
git log --oneline > "$TEST_DIR/results/git-history.txt"
```

#### 7.2 Remove MCP Integration
```bash
# Remove from Claude Code
claude mcp remove clickmongrel

# Verify removal
claude mcp list | grep -v clickmongrel
```

#### 7.3 Clean ClickUp Data
```
Claude, please clean up test data:
1. Delete all test tasks from Tasks list
2. Delete all test commits from Commits list
3. Archive or delete test goal
```

#### 7.4 Clean GitHub Repository
```bash
# Delete test repository
gh repo delete hellocory/clickmongrel-test-$TEST_RUN_ID --yes

# Remove local git remote
git remote remove origin
```

#### 7.5 Archive Test Run
```bash
# Create archive
cd "$HOME/coding/mcps/test-runs"
tar -czf "$TEST_RUN_ID.tar.gz" "$TEST_RUN_ID/"

# Remove test directory (optional)
# rm -rf "$TEST_RUN_ID/"

# Log test completion
echo "Test completed: $(date)" >> test-runs.log
echo "Archive: $TEST_RUN_ID.tar.gz" >> test-runs.log
```

## Automation Scripts

### test-harness.sh (to be created)
This script will automate:
1. Environment setup
2. Test execution commands
3. Validation checks
4. Cleanup operations
5. Result reporting

### Expected Test Duration
- Setup: 5 minutes
- Core Testing: 15 minutes
- Advanced Testing: 10 minutes
- Validation: 5 minutes
- Cleanup: 5 minutes
- **Total: ~40 minutes**

## Success Criteria

A test run is considered successful when:
1. ✅ All validation points pass
2. ✅ No errors in MCP logs
3. ✅ All files/folders created correctly
4. ✅ ClickUp data syncs bidirectionally
5. ✅ Commits track with proper formatting
6. ✅ Goals update correctly
7. ✅ Reports generate successfully
8. ✅ Cleanup completes without residue

## Troubleshooting Guide

### Common Issues

#### API Key Invalid
```bash
# Verify API key
curl -X GET "https://api.clickup.com/api/v2/user" \
  -H "Authorization: YOUR_CLICKUP_API_KEY"
```

#### MCP Not Responding
```bash
# Check MCP logs
claude mcp logs clickmongrel --tail 50

# Restart MCP
claude mcp restart clickmongrel
```

#### Sync Not Working
```bash
# Check sync status in Claude
Claude, run: mcp__clickmongrel__get_sync_status

# Force sync
Claude, run: mcp__clickmongrel__force_sync
```

#### Tasks Not Appearing
```bash
# Verify list IDs
cat .claude/clickup/config.json | jq '.lists'

# Check ClickUp directly
curl -X GET "https://api.clickup.com/api/v2/list/LIST_ID/task" \
  -H "Authorization: YOUR_API_KEY"
```

## Test Variations

### Variant 1: Fresh Install
- No existing configuration
- First-time setup wizard
- Default space creation

### Variant 2: Existing Config
- Pre-existing .claude/clickup/
- Update configuration
- Migration testing

### Variant 3: Multi-Workspace
- Switch between workspaces
- Different space configurations
- Cross-workspace goals

### Variant 4: Team Collaboration
- Multiple users
- Shared tasks
- Permission testing

## Reporting Test Results

After each test run, create a report:

```markdown
# Test Run Report: [TEST_RUN_ID]

## Environment
- Date: [DATE]
- Claude Code Version: [VERSION]
- ClickMongrel Version: [VERSION]
- Test Variant: [VARIANT]

## Results Summary
- Setup: ✅/❌
- Core Features: ✅/❌
- Advanced Features: ✅/❌
- Error Handling: ✅/❌
- Cleanup: ✅/❌

## Issues Found
1. [Issue description]
   - Steps to reproduce
   - Expected vs Actual
   - Resolution

## Performance Metrics
- Sync time: [TIME]
- API calls: [COUNT]
- Error rate: [PERCENTAGE]

## Recommendations
- [Improvement suggestions]
```

## Next Steps

1. Create `test-harness.sh` script based on this documentation
2. Create `cleanup.sh` for automated cleanup
3. Create `validate.sh` for automated validation
4. Set up CI/CD pipeline for automated testing
5. Create test result dashboard

---

**Note:** This workflow ensures complete end-to-end testing of ClickMongrel integration with Claude Code, covering all features, error scenarios, and cleanup procedures.