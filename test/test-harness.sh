#!/bin/bash

# ClickMongrel Test Harness Script
# Automates the complete testing workflow for ClickMongrel MCP integration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLICKUP_API_KEY="${CLICKUP_API_KEY}"
CLICKUP_WORKSPACE="${CLICKUP_WORKSPACE:-Ghost Codes Workspace}"
CLICKUP_SPACE="${CLICKUP_SPACE:-Agentic Development}"
GITHUB_USER="${GITHUB_USER:-hellocory}"
BASE_DIR="$HOME/coding/mcps"
SOURCE_REPO="$BASE_DIR/clickmongrel"

# Test run ID and directories
TEST_RUN_ID="run-$(date +%Y-%m-%d-%H%M%S)"
TEST_DIR="$BASE_DIR/test-runs/$TEST_RUN_ID"
TEST_REPO_NAME="clickmongrel-test-$TEST_RUN_ID"
TEST_PROJECT="$TEST_DIR/clickmongrel-test"

# Logging directories
LOGS_DIR="$SOURCE_REPO/test/logs/$TEST_RUN_ID"
RESULTS_DIR="$TEST_DIR/results"

# Log files
LOG_FILE="$LOGS_DIR/test.log"
FULL_OUTPUT="$LOGS_DIR/full-output.log"
BUILD_LOG="$LOGS_DIR/build.log"
MCP_LOG="$LOGS_DIR/mcp-setup.log"
GITHUB_LOG="$LOGS_DIR/github.log"
CLAUDE_LOG="$LOGS_DIR/claude-commands.log"
USER_LOG="$LOGS_DIR/user-actions.log"
SUMMARY_LOG="$LOGS_DIR/test-summary.log"

# Functions
log() {
    echo -e "${2:-$NC}$1${NC}" | tee -a "$FULL_OUTPUT"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

header() {
    echo ""
    log "==========================================" "$BLUE"
    log "$1" "$BLUE"
    log "==========================================" "$BLUE"
    echo ""
}

success() {
    log "✅ $1" "$GREEN"
}

error() {
    log "❌ $1" "$RED"
}

warning() {
    log "⚠️  $1" "$YELLOW"
}

check_prerequisites() {
    header "Checking Prerequisites"
    
    local missing=0
    
    # Check Claude Code
    if ! command -v claude &> /dev/null; then
        error "Claude Code not found"
        missing=1
    else
        success "Claude Code installed"
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        error "pnpm not found"
        missing=1
    else
        success "pnpm installed"
    fi
    
    # Check gh CLI
    if ! command -v gh &> /dev/null; then
        error "GitHub CLI not found"
        missing=1
    else
        success "GitHub CLI installed"
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js not found"
        missing=1
    else
        NODE_VERSION=$(node -v)
        success "Node.js installed: $NODE_VERSION"
    fi
    
    # Check source repository
    if [ ! -d "$SOURCE_REPO" ]; then
        error "Source repository not found at $SOURCE_REPO"
        missing=1
    else
        success "Source repository found"
    fi
    
    if [ $missing -eq 1 ]; then
        error "Missing prerequisites. Please install required tools."
        exit 1
    fi
}

setup_test_environment() {
    header "Setting Up Test Environment"
    
    # Create directories
    log "Creating test directory: $TEST_DIR"
    mkdir -p "$TEST_DIR"
    mkdir -p "$RESULTS_DIR"
    mkdir -p "$LOGS_DIR"
    
    # Initialize output files
    echo "=== ClickMongrel Test Run: $TEST_RUN_ID ===" > "$FULL_OUTPUT"
    echo "Started: $(date)" >> "$FULL_OUTPUT"
    echo "Test Directory: $TEST_DIR" >> "$FULL_OUTPUT"
    echo "Logs Directory: $LOGS_DIR" >> "$FULL_OUTPUT"
    echo "" >> "$FULL_OUTPUT"
    
    # Copy source to test location
    log "Copying source repository..."
    cp -r "$SOURCE_REPO" "$TEST_PROJECT"
    cd "$TEST_PROJECT"
    
    # Clean any existing build/config
    rm -rf dist/ node_modules/ .claude/ config/*.json
    
    # Install and build
    log "Installing dependencies..."
    echo "=== PNPM Install Output ===" >> "$FULL_OUTPUT"
    pnpm install 2>&1 | tee "$BUILD_LOG" | tee -a "$FULL_OUTPUT" >> "$LOG_FILE"
    
    log "Building project..."
    echo "=== Build Output ===" >> "$FULL_OUTPUT"
    pnpm run build 2>&1 | tee -a "$BUILD_LOG" | tee -a "$FULL_OUTPUT" >> "$LOG_FILE"
    
    success "Test environment ready"
}

create_github_repo() {
    header "Creating GitHub Test Repository"
    
    cd "$TEST_PROJECT"
    
    # Check if gh is authenticated
    if ! gh auth status &> /dev/null; then
        error "GitHub CLI not authenticated. Run: gh auth login"
        exit 1
    fi
    
    # Create repository
    log "Creating repository: $GITHUB_USER/$TEST_REPO_NAME"
    echo "=== GitHub Repo Creation ===" >> "$FULL_OUTPUT"
    echo "=== GitHub Operations Log ===" > "$GITHUB_LOG"
    if gh repo create "$GITHUB_USER/$TEST_REPO_NAME" --public --clone=false 2>&1 | tee "$GITHUB_LOG" | tee -a "$FULL_OUTPUT" >> "$LOG_FILE"; then
        success "Repository created"
    else
        warning "Repository creation failed (may already exist)"
    fi
    
    # Initialize git
    rm -rf .git
    echo "=== Git Initialization ===" >> "$FULL_OUTPUT"
    git init 2>&1 | tee -a "$GITHUB_LOG" | tee -a "$FULL_OUTPUT" >> "$LOG_FILE"
    git config user.email "test@clickmongrel.com"
    git config user.name "ClickMongrel Test"
    git branch -M main
    git remote add origin "https://github.com/$GITHUB_USER/$TEST_REPO_NAME.git"
    git add .
    git commit -m "Initial test setup for $TEST_RUN_ID" 2>&1 | tee -a "$GITHUB_LOG" | tee -a "$FULL_OUTPUT" >> "$LOG_FILE"
    
    # Try to push (may fail if repo doesn't exist)
    if git push -u origin main --force 2>&1 | tee -a "$GITHUB_LOG" | tee -a "$FULL_OUTPUT" >> "$LOG_FILE"; then
        success "Repository initialized and pushed"
    else
        warning "Could not push to repository (non-critical)"
    fi
}

setup_mcp() {
    header "Setting Up MCP Integration"
    
    log "Adding ClickMongrel to Claude Code..."
    echo "=== MCP Setup Log ===" > "$MCP_LOG"
    
    # Remove if exists
    claude mcp remove clickmongrel 2>&1 | tee -a "$MCP_LOG" >> "$LOG_FILE" || true
    
    # Add MCP with environment variables
    echo "Adding MCP server..." >> "$MCP_LOG"
    claude mcp add clickmongrel \
        --env "CLICKUP_API_KEY=$CLICKUP_API_KEY" \
        --env "CLICKUP_WORKSPACE=$CLICKUP_WORKSPACE" \
        --env "CLICKUP_SPACE=$CLICKUP_SPACE" \
        -- node "$TEST_PROJECT/dist/index.js" 2>&1 | tee -a "$MCP_LOG" | tee -a "$FULL_OUTPUT" >> "$LOG_FILE"
    
    # Verify
    echo "Verifying MCP installation..." >> "$MCP_LOG"
    claude mcp list 2>&1 | tee -a "$MCP_LOG" >> "$LOG_FILE"
    
    if claude mcp list | grep -q clickmongrel; then
        success "MCP integration added"
    else
        error "Failed to add MCP integration"
        exit 1
    fi
}

run_claude_setup() {
    header "Running Claude Setup Commands"
    
    cd "$TEST_PROJECT"
    
    echo "=== Claude Commands Log ===" > "$CLAUDE_LOG"
    echo "=== User Actions Log ===" > "$USER_LOG"
    echo "Timestamp: $(date)" >> "$USER_LOG"
    echo "" >> "$USER_LOG"
    
    # Create Claude command script
    cat > claude-setup.txt << EOF
Please perform the following comprehensive test of the task-commit flow:

1. Initialize ClickUp with workspace "$CLICKUP_WORKSPACE"
   (The MCP tool will handle all the setup automatically)

2. Create a test goal called "ClickMongrel Integration Test Run"

3. Create this specific todo structure using TodoWrite:
   - id: "main-feature", content: "Implement user authentication", status: "pending"
   - id: "task-1", content: "Create login form", status: "pending" 
   - id: "task-2", content: "Add password validation", status: "pending"
   - id: "task-3", content: "Implement JWT tokens", status: "pending"
   - id: "bug-fix", content: "Fix memory leak in dashboard", status: "pending"

4. Sync the todos to ClickUp using the sync_todos MCP tool

5. Complete task-1 and create a commit:
   - Mark "task-1" as completed in TodoWrite
   - Run: git commit -m "feat: Create login form component"
   - The commit should automatically check off task-1 in ClickUp

6. Complete task-2 and create another commit:
   - Mark "task-2" as completed in TodoWrite  
   - Run: git commit -m "feat: Add password validation logic"
   - The commit should automatically check off task-2 in ClickUp

7. Complete task-3 and create final commit:
   - Mark "task-3" as completed in TodoWrite
   - Run: git commit -m "feat: Implement JWT token authentication"
   - This should check off task-3 AND complete the parent "main-feature" task

8. Fix the bug with a separate commit:
   - Mark "bug-fix" as completed in TodoWrite
   - Run: git commit -m "fix: Resolve memory leak in dashboard component"

9. Generate a status report showing:
   - All tasks completed
   - Commits linked to tasks
   - Parent task auto-completed when all subtasks done

10. Verify in ClickUp that:
    - All individual tasks show as completed
    - The parent task "Implement user authentication" is completed
    - Each commit appears in the Commits list with proper status
    - Commits are linked to their respective tasks

Output "SETUP_COMPLETE" when all tests pass.
EOF
    
    # Copy to logs directory
    cp claude-setup.txt "$CLAUDE_LOG"
    
    # Log user actions expected
    cat >> "$USER_LOG" << EOF
Expected User Actions:
1. Open Claude Code in test directory: cd $TEST_PROJECT && claude
2. Initialize ClickUp with workspace "$CLICKUP_WORKSPACE"
3. Create goal "ClickMongrel Integration Test Run"
4. Create todo list with authentication tasks using TodoWrite
5. Sync todos to ClickUp using sync_todos MCP tool
6. Complete task-1 and commit "feat: Create login form component"
7. Complete task-2 and commit "feat: Add password validation logic"
8. Complete task-3 and commit "feat: Implement JWT token authentication"
   - This should auto-complete the parent task
9. Complete bug-fix and commit "fix: Resolve memory leak in dashboard component"
10. Generate status report
11. Verify in ClickUp:
    - All tasks show as completed
    - Parent task auto-completed when subtasks done
    - Commits appear in Commits list with correct statuses
    - Commits are linked to their tasks
EOF
    
    log "Claude setup script created at: claude-setup.txt"
    log "Copy saved to: $CLAUDE_LOG"
    log "User actions logged to: $USER_LOG"
    warning "Please run Claude Code and execute the commands in claude-setup.txt"
    
    # Open Claude in test directory
    log "Opening Claude Code in test directory..."
    log "Run: cd $TEST_PROJECT && claude"
}

validate_setup() {
    header "Validating Setup"
    
    cd "$TEST_PROJECT"
    
    local valid=1
    
    # Check configuration files
    if [ -f ".claude/clickup/config.json" ]; then
        success "ClickUp config exists"
    else
        error "ClickUp config missing"
        valid=0
    fi
    
    if [ -f "config/commit-templates.json" ]; then
        success "Commit templates exist"
    else
        error "Commit templates missing"
        valid=0
    fi
    
    # Check MCP
    if claude mcp list | grep -q clickmongrel; then
        success "MCP integration active"
    else
        error "MCP integration not found"
        valid=0
    fi
    
    # Check folders
    for folder in ".claude/clickup/cache" ".claude/clickup/reports" ".claude/clickup/logs"; do
        if [ -d "$folder" ]; then
            success "Folder exists: $folder"
        else
            warning "Folder missing: $folder"
        fi
    done
    
    if [ $valid -eq 0 ]; then
        error "Validation failed"
        return 1
    else
        success "All validations passed"
        return 0
    fi
}

validate_task_commit_flow() {
    header "Validating Task-Commit Flow Results"
    
    cd "$TEST_PROJECT"
    
    local valid=1
    
    # Check git commits were created
    log "Checking git commits..."
    local commit_count=$(git log --oneline 2>/dev/null | wc -l)
    if [ $commit_count -gt 1 ]; then
        success "Found $commit_count commits"
        git log --oneline --graph -10 2>/dev/null | while read line; do
            log "  $line"
        done
    else
        error "Not enough commits found (expected at least 4)"
        valid=0
    fi
    
    # Check for specific commit messages
    if git log --oneline | grep -q "Create login form"; then
        success "Found login form commit"
    else
        error "Missing login form commit"
        valid=0
    fi
    
    if git log --oneline | grep -q "password validation"; then
        success "Found password validation commit"
    else
        error "Missing password validation commit"
        valid=0
    fi
    
    if git log --oneline | grep -q "JWT token"; then
        success "Found JWT token commit"
    else
        error "Missing JWT token commit"
        valid=0
    fi
    
    if git log --oneline | grep -q "memory leak"; then
        success "Found memory leak fix commit"
    else
        error "Missing memory leak fix commit"
        valid=0
    fi
    
    # Check for sync status file
    if [ -f ".claude/clickup/cache/sync-status.json" ]; then
        success "Sync status file exists"
        local sync_data=$(cat .claude/clickup/cache/sync-status.json 2>/dev/null)
        if echo "$sync_data" | grep -q "completed"; then
            success "Found completed tasks in sync status"
        else
            warning "No completed tasks found in sync status"
        fi
    else
        warning "Sync status file missing"
    fi
    
    # Check for reports
    if ls .claude/clickup/reports/*.md 2>/dev/null | head -1; then
        success "Found generated reports"
    else
        warning "No reports generated"
    fi
    
    if [ $valid -eq 0 ]; then
        error "Task-commit flow validation failed"
        return 1
    else
        success "Task-commit flow validation passed"
        return 0
    fi
}

collect_results() {
    header "Collecting Test Results"
    
    cd "$TEST_PROJECT"
    
    # Copy configurations
    cp -r .claude/clickup/* "$RESULTS_DIR/" 2>/dev/null || true
    cp -r config/* "$RESULTS_DIR/" 2>/dev/null || true
    
    # Git history
    git log --oneline > "$RESULTS_DIR/git-history.txt" 2>/dev/null || true
    
    # MCP status
    claude mcp list > "$RESULTS_DIR/mcp-status.txt" 2>/dev/null || true
    claude mcp logs clickmongrel --tail 100 > "$RESULTS_DIR/mcp-logs.txt" 2>/dev/null || true
    
    # Copy all logs to results
    echo "Copying logs to results..." >> "$FULL_OUTPUT"
    cp -r "$LOGS_DIR" "$RESULTS_DIR/logs" 2>/dev/null || true
    
    # Create summary
    cat > "$RESULTS_DIR/summary.txt" << EOF
Test Run: $TEST_RUN_ID
Date: $(date)
Directory: $TEST_DIR
Repository: $GITHUB_USER/$TEST_REPO_NAME

Results collected in: $RESULTS_DIR
EOF
    
    success "Results collected"
}

function cleanup {
    header "Cleanup Process"
    
    echo -n "Do you want to clean up test data? (y/n) "
    read -n 1 -r REPLY
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove MCP
        log "Removing MCP integration..."
        claude mcp remove clickmongrel 2>/dev/null || true
        
        # Delete GitHub repo
        log "Deleting GitHub repository..."
        gh repo delete "$GITHUB_USER/$TEST_REPO_NAME" --yes 2>/dev/null || true
        
        # Archive test run
        log "Archiving test run..."
        cd "$BASE_DIR/test-runs"
        tar -czf "$TEST_RUN_ID.tar.gz" "$TEST_RUN_ID/" 2>/dev/null || true
        
        # Optional: Remove test directory
        read -p "Remove test directory? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$TEST_DIR"
            success "Test directory removed"
        fi
        
        success "Cleanup complete"
    else
        warning "Skipping cleanup - test data preserved at: $TEST_DIR"
    fi
}

generate_report() {
    header "Generating Comprehensive Test Report"
    
    REPORT_FILE="$RESULTS_DIR/test-report.md"
    
    # Generate comprehensive summary
    echo "=== Test Summary ===" > "$SUMMARY_LOG"
    echo "Test Run ID: $TEST_RUN_ID" >> "$SUMMARY_LOG"
    echo "Date: $(date)" >> "$SUMMARY_LOG"
    echo "" >> "$SUMMARY_LOG"
    
    # Check what was created
    echo "=== Directories Created ===" >> "$SUMMARY_LOG"
    if [ -d "$TEST_PROJECT/.claude/clickup" ]; then
        echo "✓ .claude/clickup/" >> "$SUMMARY_LOG"
        ls -la "$TEST_PROJECT/.claude/clickup/" 2>/dev/null >> "$SUMMARY_LOG"
    fi
    if [ -d "$TEST_PROJECT/config" ]; then
        echo "✓ config/" >> "$SUMMARY_LOG"
        ls -la "$TEST_PROJECT/config/" 2>/dev/null >> "$SUMMARY_LOG"
    fi
    echo "" >> "$SUMMARY_LOG"
    
    # Check configuration files
    echo "=== Configuration Files ===" >> "$SUMMARY_LOG"
    if [ -f "$TEST_PROJECT/.claude/clickup/config.json" ]; then
        echo "✓ ClickUp config exists" >> "$SUMMARY_LOG"
        echo "Content preview:" >> "$SUMMARY_LOG"
        cat "$TEST_PROJECT/.claude/clickup/config.json" 2>/dev/null | jq '.' | head -15 >> "$SUMMARY_LOG"
    fi
    echo "" >> "$SUMMARY_LOG"
    
    # Check MCP status
    echo "=== MCP Status ===" >> "$SUMMARY_LOG"
    claude mcp list | grep clickmongrel >> "$SUMMARY_LOG" 2>/dev/null || echo "No MCP found" >> "$SUMMARY_LOG"
    echo "" >> "$SUMMARY_LOG"
    
    # Log files created
    echo "=== Log Files Created ===" >> "$SUMMARY_LOG"
    ls -la "$LOGS_DIR/" 2>/dev/null >> "$SUMMARY_LOG"
    echo "" >> "$SUMMARY_LOG"
    
    cat > "$REPORT_FILE" << EOF
# Test Run Report: $TEST_RUN_ID

## Environment
- Date: $(date)
- Test Directory: $TEST_DIR
- Repository: $GITHUB_USER/$TEST_REPO_NAME
- Claude Code Version: $(claude --version 2>/dev/null || echo "unknown")
- Node Version: $(node -v)

## Configuration
- API Key: ${CLICKUP_API_KEY:0:10}...
- Workspace: $CLICKUP_WORKSPACE
- Space: $CLICKUP_SPACE

## Project Structure Created

### Directories
\`\`\`
$(cd "$TEST_PROJECT" && find .claude config -type d 2>/dev/null | sort)
\`\`\`

### Files
\`\`\`
$(cd "$TEST_PROJECT" && find .claude config -type f 2>/dev/null | sort)
\`\`\`

## MCP Integration Status
\`\`\`
$(claude mcp list | grep clickmongrel || echo "Not configured")
\`\`\`

## User Commands (Expected vs Actual)
\`\`\`
$(cat "$USER_LOG" 2>/dev/null || echo "No user actions logged")
\`\`\`

## ClickUp Resources Created
- Space: ${CLICKUP_SPACE}
- Lists: Tasks, Commits
- Folders: Weekly Reports, Daily Reports, Docs
- Templates: Commit templates configured

## Test Logs Available
\`\`\`
$(ls -lh "$LOGS_DIR/" 2>/dev/null)
\`\`\`

## Validation Results

### Setup Validation
$(validate_setup 2>&1 || echo "Setup validation not completed")

### Task-Commit Flow Validation  
$(validate_task_commit_flow 2>&1 || echo "Task-commit flow validation not completed")

## Summary
\`\`\`
$(cat "$SUMMARY_LOG" 2>/dev/null || echo "Summary not available")
\`\`\`

## Next Steps
1. Review test results in: $RESULTS_DIR
2. Check ClickUp workspace for created resources
3. Review logs in: $LOGS_DIR
4. Run cleanup when test is complete

---
Generated: $(date)
EOF
    
    success "Report generated: $REPORT_FILE"
    log "Summary saved to: $SUMMARY_LOG"
    
    # Display key summary points
    echo ""
    echo "=== FINAL TEST SUMMARY ==="
    echo "Test Run: $TEST_RUN_ID"
    echo "Logs: $LOGS_DIR"
    echo "Results: $RESULTS_DIR"
    echo ""
    cat "$SUMMARY_LOG"
}

# Main execution
main() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     ClickMongrel Test Harness - $TEST_RUN_ID     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    # Run test phases
    check_prerequisites
    setup_test_environment
    create_github_repo
    setup_mcp
    run_claude_setup
    
    # Wait for user to complete Claude setup
    echo ""
    warning "Please complete the Claude setup before continuing..."
    read -p "Press ENTER when Claude setup is complete..."
    
    # Validate and collect results
    validate_setup
    validate_task_commit_flow
    collect_results
    generate_report
    
    # Cleanup
    echo ""
    cleanup
    
    echo ""
    success "Test harness complete!"
    log "Results saved to: $RESULTS_DIR"
    log "Logs saved to: $LOGS_DIR"
    log "Full output: $FULL_OUTPUT"
    echo ""
    echo "Log files created:"
    echo "  - Full output: $FULL_OUTPUT"
    echo "  - Build log: $BUILD_LOG"
    echo "  - GitHub log: $GITHUB_LOG"
    echo "  - MCP setup: $MCP_LOG"
    echo "  - Claude commands: $CLAUDE_LOG"
}

# Handle interrupts
trap 'error "Test interrupted"; collect_results; exit 1' INT TERM

# Run main function
main "$@"