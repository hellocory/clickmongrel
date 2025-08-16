#!/bin/bash

# ClickMongrel Isolated User Environment Test Harness
# Creates a COMPLETELY ISOLATED environment outside the project
# Logs are tracked in the clickmongrel project, but execution is isolated

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Base Configuration
CLICKMONGREL_SOURCE="$(cd "$(dirname "$0")/.." && pwd)"  # The clickmongrel project root
TEST_RUN_ID="isolated-$(date +%Y%m%d-%H%M%S)"
ISOLATED_BASE="/home/cory-ubuntu/coding/mcps/test-runs"  # OUTSIDE the project
ISOLATED_ENV="$ISOLATED_BASE/$TEST_RUN_ID"
LOG_BASE="$CLICKMONGREL_SOURCE/test/logs/$TEST_RUN_ID"  # Logs stay in project

# Test Environment Paths (completely isolated)
MCP_INSTALL_DIR="$ISOLATED_ENV/mcp-server"
USER_PROJECT_DIR="$ISOLATED_ENV/user-project"
CLAUDE_CONFIG_DIR="$ISOLATED_ENV/.claude"

# Functions
log() {
    # Create log directory if it doesn't exist
    [ -d "$LOG_BASE" ] || mkdir -p "$LOG_BASE"
    echo -e "${2:-$NC}$1${NC}" | tee -a "$LOG_BASE/harness.log"
}

header() {
    echo "" | tee -a "$LOG_BASE/harness.log"
    log "==========================================" "$BLUE"
    log "$1" "$BLUE"
    log "==========================================" "$BLUE"
    echo "" | tee -a "$LOG_BASE/harness.log"
}

success() {
    log "✅ $1" "$GREEN"
}

error() {
    log "❌ $1" "$RED"
    exit 1
}

warning() {
    log "⚠️  $1" "$YELLOW"
}

info() {
    log "ℹ️  $1" "$CYAN"
}

# Cleanup function
cleanup_environment() {
    header "🧹 Cleanup Operations"
    
    echo -e "${YELLOW}This will remove:${NC}"
    echo "  - Test environment at: $ISOLATED_ENV"
    echo "  - MCP server registration (if exists)"
    echo ""
    echo -e "${CYAN}Logs will be preserved at: $LOG_BASE${NC}"
    echo ""
    
    read -p "Are you sure you want to clean up? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove MCP registration
        info "Removing MCP registration..."
        claude mcp remove clickmongrel-test 2>/dev/null || true
        
        # Remove isolated environment
        if [ -d "$ISOLATED_ENV" ]; then
            info "Removing test environment..."
            rm -rf "$ISOLATED_ENV"
            success "Test environment removed"
        fi
        
        # Archive logs
        if [ -d "$LOG_BASE" ]; then
            info "Archiving logs..."
            tar -czf "$LOG_BASE.tar.gz" -C "$(dirname "$LOG_BASE")" "$(basename "$LOG_BASE")"
            success "Logs archived to: $LOG_BASE.tar.gz"
        fi
        
        success "Cleanup complete!"
    else
        warning "Cleanup cancelled"
    fi
}

# Main setup function
setup_isolated_environment() {
    clear
    log "╔══════════════════════════════════════════════════════════════╗" "$MAGENTA"
    log "║         ClickMongrel Isolated Test Environment                ║" "$MAGENTA"
    log "║         Test Run: $TEST_RUN_ID            ║" "$MAGENTA"
    log "╚══════════════════════════════════════════════════════════════╝" "$MAGENTA"
    
    # Create directories
    header "Step 1: Creating Isolated Environment"
    
    info "Creating directories..."
    mkdir -p "$ISOLATED_ENV"
    mkdir -p "$MCP_INSTALL_DIR"
    mkdir -p "$USER_PROJECT_DIR"
    mkdir -p "$CLAUDE_CONFIG_DIR"
    mkdir -p "$LOG_BASE"
    
    # Save environment info
    cat > "$LOG_BASE/environment.json" << EOF
{
  "test_run_id": "$TEST_RUN_ID",
  "created_at": "$(date -Iseconds)",
  "paths": {
    "isolated_environment": "$ISOLATED_ENV",
    "mcp_server": "$MCP_INSTALL_DIR",
    "user_project": "$USER_PROJECT_DIR",
    "logs": "$LOG_BASE",
    "source": "$CLICKMONGREL_SOURCE"
  },
  "isolation": {
    "type": "complete",
    "location": "outside_project",
    "context_pollution": "prevented"
  }
}
EOF
    
    success "Isolated environment created at: $ISOLATED_ENV"
    info "This is COMPLETELY SEPARATE from the ClickMongrel project"
    
    # Install MCP Server
    header "Step 2: Installing MCP Server (Isolated Copy)"
    
    info "Copying ClickMongrel source to isolated location..."
    cp -r "$CLICKMONGREL_SOURCE"/* "$MCP_INSTALL_DIR/"
    
    # Remove any existing configs/contexts from the copy
    rm -rf "$MCP_INSTALL_DIR/.claude"
    rm -rf "$MCP_INSTALL_DIR/config/*.json"
    rm -rf "$MCP_INSTALL_DIR/node_modules"
    rm -rf "$MCP_INSTALL_DIR/dist"
    
    cd "$MCP_INSTALL_DIR"
    
    info "Installing dependencies in isolated environment..."
    pnpm install > "$LOG_BASE/mcp-install.log" 2>&1
    
    info "Building MCP server..."
    pnpm run build > "$LOG_BASE/mcp-build.log" 2>&1
    
    success "MCP server installed (completely isolated)"
    
    # Create User Project
    header "Step 3: Creating Sample User Project"
    
    cd "$USER_PROJECT_DIR"
    
    # Create a sample Next.js project
    cat > package.json << 'EOF'
{
  "name": "test-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "echo 'Starting dev server...'",
    "build": "echo 'Building application...'",
    "test": "echo 'Running tests...'"
  }
}
EOF
    
    # Create project structure
    mkdir -p src/components
    mkdir -p src/features/auth
    mkdir -p src/api
    mkdir -p tests
    
    # Create sample files with TODOs
    cat > README.md << 'EOF'
# Test Application

This is an isolated test project for ClickMongrel MCP testing.

## Tasks to Implement

### Authentication System
- [ ] Design authentication flow
- [ ] Create login/signup forms  
- [ ] Implement JWT handling
- [ ] Add password encryption
- [ ] Create user profile management

### Dashboard
- [ ] Create dashboard layout
- [ ] Add analytics widgets
- [ ] Implement data fetching
- [ ] Add real-time updates

## Notes
This project is in an ISOLATED environment, completely separate from the ClickMongrel source.
EOF
    
    cat > src/features/auth/login.tsx << 'EOF'
// TODO: Implement login component
// TODO: Add form validation
// TODO: Connect to authentication API
// TODO: Handle error states

export function LoginForm() {
  return (
    <div>
      <h2>Login</h2>
      {/* Implementation needed */}
    </div>
  );
}
EOF
    
    # Initialize git
    git init > "$LOG_BASE/git-init.log" 2>&1
    git config user.email "test@isolated.local"
    git config user.name "Isolated Test User"
    git add .
    git commit -m "Initial isolated project setup" > "$LOG_BASE/git-commit.log" 2>&1
    
    success "User project created in isolated environment"
    
    # Create MCP setup script IN USER PROJECT
    header "Step 4: Creating MCP Integration Script"
    
    cat > "$USER_PROJECT_DIR/setup-mcp.sh" << EOF
#!/bin/bash
# Setup script for isolated MCP integration

echo "Setting up ClickMongrel MCP in isolated environment..."

# Remove any existing registration
claude mcp remove clickmongrel-test 2>/dev/null || true

# Add MCP with isolated paths
claude mcp add clickmongrel-test \\
    --env "CLICKUP_API_KEY=\${CLICKUP_API_KEY}" \\
    --env "CLICKUP_WORKSPACE=\${CLICKUP_WORKSPACE:-Ghost Codes Workspace}" \\
    --env "CLICKUP_DEFAULT_SPACE=\${CLICKUP_DEFAULT_SPACE:-Agentic Development}" \\
    --env "CLICKUP_DEFAULT_LIST=\${CLICKUP_DEFAULT_LIST:-Tasks}" \\
    --env "TEST_ISOLATION=true" \\
    --env "TEST_RUN_ID=$TEST_RUN_ID" \\
    -- node "$MCP_INSTALL_DIR/dist/index.js"

echo "✅ MCP added as 'clickmongrel-test' (isolated instance)"
echo ""
echo "⚠️  IMPORTANT: This is an ISOLATED instance"
echo "   - Completely separate from main ClickMongrel"
echo "   - No context pollution"
echo "   - Fresh environment"
echo ""
echo "Restart Claude Code to activate the isolated MCP."
EOF
    
    chmod +x "$USER_PROJECT_DIR/setup-mcp.sh"
    
    # Create test instructions
    cat > "$ISOLATED_ENV/TEST_INSTRUCTIONS.md" << EOF
# Isolated Test Environment Instructions

## 🔒 Isolation Details

This is a **COMPLETELY ISOLATED** test environment:
- **Location**: \`$ISOLATED_ENV\`
- **Outside**: The main ClickMongrel project
- **Clean**: No context pollution from development
- **Fresh**: Brand new Claude environment

## 📁 Structure

\`\`\`
$ISOLATED_ENV/
├── mcp-server/        # Isolated copy of ClickMongrel
├── user-project/      # Test project to track
├── .claude/           # Isolated Claude configs
└── setup-mcp.sh       # MCP setup script
\`\`\`

## 🚀 Setup Steps

### 1. Set Environment Variables
\`\`\`bash
export CLICKUP_API_KEY="your_api_key"
export CLICKUP_WORKSPACE="your_workspace"
\`\`\`

### 2. Add Isolated MCP
\`\`\`bash
cd $ISOLATED_ENV
./setup-mcp.sh
\`\`\`

### 3. Open Isolated Project
\`\`\`bash
cd $USER_PROJECT_DIR
claude
\`\`\`

**IMPORTANT**: You're now in a completely isolated environment!

### 4. Verify Isolation
In Claude Code:
\`\`\`
/mcp
\`\`\`
Should show \`clickmongrel-test\` (not the main clickmongrel)

## 🧪 Test Scenarios

### Test 1: Parent-Child Tasks
Ask Claude:
\`\`\`
Create a parent task "Build Authentication" with subtasks:
- Design auth flow
- Create login form
- Add JWT tokens
- Setup encryption

Track these in ClickUp with parent-child relationships.
\`\`\`

### Test 2: Auto-Completion
1. Mark subtasks as in_progress one by one
2. Complete all subtasks
3. Verify parent auto-completes

### Test 3: Real Workflow
1. Ask Claude to implement a feature
2. Watch todos sync to ClickUp
3. Make commits and verify linking

## ✅ Verification Checklist

- [ ] MCP connects as \`clickmongrel-test\`
- [ ] No pollution from main project
- [ ] Parent-child relationships work
- [ ] Auto-completion triggers
- [ ] Commits link to tasks

## 🧹 Cleanup

To completely remove this isolated environment:
\`\`\`bash
# From the main ClickMongrel project:
cd $CLICKMONGREL_SOURCE
./test/isolated-user-harness.sh --cleanup $TEST_RUN_ID
\`\`\`

Or manually:
\`\`\`bash
# Remove MCP
claude mcp remove clickmongrel-test

# Remove environment
rm -rf $ISOLATED_ENV

# Logs are preserved in:
# $LOG_BASE
\`\`\`

## 📊 Logs

All logs are stored in the main project at:
\`$LOG_BASE\`

This keeps test history while maintaining isolation.
EOF
    
    success "Test instructions created"
    
    # Create cleanup helper
    cat > "$ISOLATED_ENV/cleanup.sh" << EOF
#!/bin/bash
# Cleanup this isolated environment

echo "Cleaning up test run: $TEST_RUN_ID"
claude mcp remove clickmongrel-test 2>/dev/null || true
echo "MCP removed"
echo ""
echo "To remove files, run from main project:"
echo "cd $CLICKMONGREL_SOURCE"
echo "./test/isolated-user-harness.sh --cleanup $TEST_RUN_ID"
EOF
    
    chmod +x "$ISOLATED_ENV/cleanup.sh"
    
    # Final summary
    header "✨ Isolated Environment Ready!"
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}COMPLETELY ISOLATED TEST ENVIRONMENT${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Test ID:${NC} $TEST_RUN_ID"
    echo -e "${CYAN}Location:${NC} $ISOLATED_ENV"
    echo -e "${CYAN}Logs:${NC} $LOG_BASE"
    echo ""
    echo -e "${YELLOW}This environment is:${NC}"
    echo "  ✓ Outside the ClickMongrel project"
    echo "  ✓ Completely isolated from development"
    echo "  ✓ No context pollution"
    echo "  ✓ Fresh Claude environment"
    echo ""
    echo -e "${GREEN}Next Steps:${NC}"
    echo "1. Set your API key:"
    echo "   ${CYAN}export CLICKUP_API_KEY='your_key'${NC}"
    echo ""
    echo "2. Navigate to isolated environment:"
    echo "   ${CYAN}cd $ISOLATED_ENV${NC}"
    echo ""
    echo "3. Run MCP setup:"
    echo "   ${CYAN}./setup-mcp.sh${NC}"
    echo ""
    echo "4. Open isolated project in Claude:"
    echo "   ${CYAN}cd user-project && claude${NC}"
    echo ""
    echo "5. Follow TEST_INSTRUCTIONS.md"
    echo ""
    echo -e "${MAGENTA}Cleanup:${NC}"
    echo "   ${CYAN}$CLICKMONGREL_SOURCE/test/isolated-user-harness.sh --cleanup $TEST_RUN_ID${NC}"
}

# Parse arguments
if [ "$1" == "--cleanup" ] && [ -n "$2" ]; then
    TEST_RUN_ID="$2"
    ISOLATED_ENV="$ISOLATED_BASE/$TEST_RUN_ID"
    LOG_BASE="$CLICKMONGREL_SOURCE/test/logs/$TEST_RUN_ID"
    cleanup_environment
    exit 0
fi

if [ "$1" == "--list" ]; then
    header "📋 Existing Test Runs"
    if [ -d "$ISOLATED_BASE" ]; then
        for run in "$ISOLATED_BASE"/isolated-*; do
            if [ -d "$run" ]; then
                run_id=$(basename "$run")
                echo "  • $run_id"
                if [ -f "$CLICKMONGREL_SOURCE/test/logs/$run_id/environment.json" ]; then
                    created=$(jq -r '.created_at' "$CLICKMONGREL_SOURCE/test/logs/$run_id/environment.json" 2>/dev/null)
                    echo "    Created: $created"
                fi
            fi
        done
    else
        info "No test runs found"
    fi
    exit 0
fi

if [ "$1" == "--help" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  (no args)           Create new isolated test environment"
    echo "  --cleanup <run-id>  Clean up specific test run"
    echo "  --list             List existing test runs"
    echo "  --help             Show this help"
    exit 0
fi

# Run main setup
setup_isolated_environment

# Save quick access script
cat > "$CLICKMONGREL_SOURCE/test/logs/$TEST_RUN_ID/quick-access.sh" << EOF
#!/bin/bash
# Quick access to test run: $TEST_RUN_ID
cd "$ISOLATED_ENV"
echo "Test Environment: $TEST_RUN_ID"
echo "Run './setup-mcp.sh' to setup MCP"
echo "Run 'cd user-project && claude' to start testing"
EOF
chmod +x "$CLICKMONGREL_SOURCE/test/logs/$TEST_RUN_ID/quick-access.sh"

success "Quick access script saved to logs"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"