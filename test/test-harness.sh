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

# Logging
LOG_FILE="$TEST_DIR/test.log"
RESULTS_DIR="$TEST_DIR/results"

# Functions
log() {
    echo -e "${2:-$NC}$1${NC}"
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
    
    # Create test directory
    log "Creating test directory: $TEST_DIR"
    mkdir -p "$TEST_DIR"
    mkdir -p "$RESULTS_DIR"
    
    # Copy source to test location
    log "Copying source repository..."
    cp -r "$SOURCE_REPO" "$TEST_PROJECT"
    cd "$TEST_PROJECT"
    
    # Clean any existing build/config
    rm -rf dist/ node_modules/ .claude/ config/*.json
    
    # Install and build
    log "Installing dependencies..."
    pnpm install >> "$LOG_FILE" 2>&1
    
    log "Building project..."
    pnpm run build >> "$LOG_FILE" 2>&1
    
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
    if gh repo create "$GITHUB_USER/$TEST_REPO_NAME" --public --clone=false >> "$LOG_FILE" 2>&1; then
        success "Repository created"
    else
        warning "Repository creation failed (may already exist)"
    fi
    
    # Initialize git
    rm -rf .git
    git init >> "$LOG_FILE" 2>&1
    git remote add origin "https://github.com/$GITHUB_USER/$TEST_REPO_NAME.git"
    git add .
    git commit -m "Initial test setup for $TEST_RUN_ID" >> "$LOG_FILE" 2>&1
    
    # Try to push (may fail if repo doesn't exist)
    if git push -u origin main --force >> "$LOG_FILE" 2>&1; then
        success "Repository initialized"
    else
        warning "Could not push to repository"
    fi
}

setup_mcp() {
    header "Setting Up MCP Integration"
    
    log "Adding ClickMongrel to Claude Code..."
    
    # Remove if exists
    claude mcp remove clickmongrel 2>/dev/null || true
    
    # Add MCP with environment variables
    claude mcp add clickmongrel \
        --env "CLICKUP_API_KEY=$CLICKUP_API_KEY" \
        --env "CLICKUP_WORKSPACE=$CLICKUP_WORKSPACE" \
        --env "CLICKUP_SPACE=$CLICKUP_SPACE" \
        -- node "$TEST_PROJECT/dist/index.js" >> "$LOG_FILE" 2>&1
    
    # Verify
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
    
    # Create Claude command script
    cat > claude-setup.txt << EOF
Please perform the following setup tasks:

1. Initialize ClickUp integration using: node dist/cli.js setup-clickup --workspace-name "$CLICKUP_WORKSPACE"

2. Verify the following configurations are created:
   - .claude/clickup/config.json exists
   - config/commit-templates.json exists
   - All required folders are created

3. Create a test goal called "ClickMongrel Integration Test Run"

4. Create a test todo list:
   - Test parent task
     - Test subtask 1
     - Test subtask 2
   - Test standalone task

5. Sync the todos to ClickUp using the MCP tools

6. Complete the first subtask and create a commit with message: "test: Validate subtask completion"

7. Generate a status report showing:
   - Current goal and progress
   - Tasks in ClickUp
   - Commits tracked

Please output "SETUP_COMPLETE" when done.
EOF
    
    log "Claude setup script created at: claude-setup.txt"
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
    header "Generating Test Report"
    
    REPORT_FILE="$RESULTS_DIR/test-report.md"
    
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

## Test Execution Log
\`\`\`
$(tail -50 "$LOG_FILE")
\`\`\`

## Validation Results
$(validate_setup 2>&1 || echo "Validation not completed")

## Files Created
\`\`\`
$(find "$TEST_PROJECT/.claude" -type f 2>/dev/null | head -20)
\`\`\`

## Next Steps
1. Review test results in: $RESULTS_DIR
2. Check ClickUp for created tasks/commits
3. Run cleanup if test is complete

---
Generated: $(date)
EOF
    
    success "Report generated: $REPORT_FILE"
    log "Opening report..."
    cat "$REPORT_FILE"
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
    collect_results
    generate_report
    
    # Cleanup
    echo ""
    cleanup
    
    echo ""
    success "Test harness complete!"
    log "Results saved to: $RESULTS_DIR"
    log "Full log: $LOG_FILE"
}

# Handle interrupts
trap 'error "Test interrupted"; collect_results; exit 1' INT TERM

# Run main function
main "$@"