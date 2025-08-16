#!/bin/bash

# ClickMongrel User Simulation Test Harness
# Simulates a real user environment with MCP server as a tool, not the project

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CLICKMONGREL_REPO="$HOME/coding/mcps/clickmongrel"
TEST_RUN_ID="user-sim-$(date +%Y%m%d-%H%M%S)"
TEST_BASE_DIR="$HOME/coding/mcps/user-tests"
TEST_DIR="$TEST_BASE_DIR/$TEST_RUN_ID"
MCP_DIR="$TEST_DIR/deps/clickmongrel"
USER_PROJECT_DIR="$TEST_DIR/project"
LOGS_DIR="$TEST_DIR/logs"

# Functions
log() {
    echo -e "${2:-$NC}$1${NC}"
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

info() {
    log "ℹ️  $1" "$CYAN"
}

# Main setup process
setup_user_environment() {
    clear
    log "╔══════════════════════════════════════════════════════════════╗" "$BLUE"
    log "║     ClickMongrel User Environment Simulation                  ║" "$BLUE"
    log "║     Test Run: $TEST_RUN_ID                    ║" "$BLUE"
    log "╚══════════════════════════════════════════════════════════════╝" "$BLUE"
    
    header "Step 1: Creating User Environment Structure"
    
    log "Creating directories..."
    mkdir -p "$TEST_DIR"
    mkdir -p "$MCP_DIR"
    mkdir -p "$USER_PROJECT_DIR"
    mkdir -p "$LOGS_DIR"
    
    success "Created test directory: $TEST_DIR"
    info "  └── deps/         (MCP server installation)"
    info "  └── project/      (User's actual project)"
    info "  └── logs/         (Test logs)"
    
    header "Step 2: Installing ClickMongrel MCP Server"
    
    log "Copying ClickMongrel to deps directory..."
    cp -r "$CLICKMONGREL_REPO"/* "$MCP_DIR/"
    cd "$MCP_DIR"
    
    log "Building MCP server..."
    pnpm install > "$LOGS_DIR/mcp-install.log" 2>&1
    pnpm run build > "$LOGS_DIR/mcp-build.log" 2>&1
    
    success "ClickMongrel MCP server installed at: $MCP_DIR"
    
    header "Step 3: Creating Sample User Project"
    
    cd "$USER_PROJECT_DIR"
    
    # Create a sample Next.js-like project structure
    log "Initializing user project..."
    
    # Create package.json
    cat > package.json << 'EOF'
{
  "name": "my-awesome-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "echo 'Starting development server...'",
    "build": "echo 'Building project...'",
    "test": "echo 'Running tests...'"
  },
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0"
  }
}
EOF
    
    # Create project structure
    mkdir -p src/components
    mkdir -p src/pages
    mkdir -p src/utils
    mkdir -p tests
    
    # Create sample files
    cat > README.md << 'EOF'
# My Awesome App

This is a sample project to test ClickMongrel MCP integration.

## Features to Implement
- [ ] User authentication system
- [ ] Dashboard with analytics
- [ ] API integration
- [ ] Real-time notifications

## Getting Started
This project is being tracked by ClickMongrel MCP server.
EOF
    
    cat > src/components/Header.jsx << 'EOF'
// TODO: Implement header component
export default function Header() {
  return (
    <header>
      <h1>My App</h1>
      {/* TODO: Add navigation menu */}
      {/* TODO: Add user profile dropdown */}
    </header>
  );
}
EOF
    
    cat > src/pages/index.jsx << 'EOF'
// Main landing page
export default function Home() {
  // TODO: Implement landing page
  // TODO: Add hero section
  // TODO: Add feature showcase
  return (
    <div>
      <h1>Welcome to My App</h1>
    </div>
  );
}
EOF
    
    cat > src/utils/api.js << 'EOF'
// API utility functions
// TODO: Implement API client
// TODO: Add authentication headers
// TODO: Add error handling

export async function fetchData(endpoint) {
  // Placeholder implementation
  console.log('Fetching:', endpoint);
}
EOF
    
    # Initialize git
    git init > "$LOGS_DIR/git-init.log" 2>&1
    git config user.email "test@example.com"
    git config user.name "Test User"
    git add .
    git commit -m "Initial project setup" > "$LOGS_DIR/git-commit.log" 2>&1
    
    success "Sample project created at: $USER_PROJECT_DIR"
    
    header "Step 4: Setting Up MCP Integration"
    
    # Check if API key is available
    if [ -z "$CLICKUP_API_KEY" ]; then
        warning "CLICKUP_API_KEY not set. You'll need to provide it when adding the MCP."
        info "Get your API key from: https://app.clickup.com/settings/apps"
    fi
    
    # Create setup script for user
    cat > "$TEST_DIR/setup-mcp.sh" << EOF
#!/bin/bash
# Run this to add ClickMongrel MCP to Claude Code

echo "Adding ClickMongrel MCP server to Claude Code..."

# Remove if exists
claude mcp remove clickmongrel 2>/dev/null || true

# Add with proper environment variables
claude mcp add clickmongrel \\
    --env "CLICKUP_API_KEY=\${CLICKUP_API_KEY:-your_api_key_here}" \\
    --env "CLICKUP_WORKSPACE=\${CLICKUP_WORKSPACE:-Ghost Codes Workspace}" \\
    --env "CLICKUP_DEFAULT_SPACE=\${CLICKUP_DEFAULT_SPACE:-Agentic Development}" \\
    --env "CLICKUP_DEFAULT_LIST=\${CLICKUP_DEFAULT_LIST:-Tasks}" \\
    -- node "$MCP_DIR/dist/index.js"

echo "✅ MCP server added. Restart Claude Code to activate."
EOF
    
    chmod +x "$TEST_DIR/setup-mcp.sh"
    
    header "Step 5: Creating Test Instructions"
    
    cat > "$TEST_DIR/TEST_INSTRUCTIONS.md" << 'EOF'
# ClickMongrel MCP Testing Instructions

## Your Test Environment

You are now a user with:
- **Your Project**: Located in `./project/` directory
- **MCP Server**: Installed in `./deps/clickmongrel/`
- **Purpose**: Test task tracking and parent-child relationships

## Setup Steps

### 1. Add MCP to Claude Code
```bash
# Set your ClickUp API key first
export CLICKUP_API_KEY="your_actual_api_key"

# Run the setup script
./setup-mcp.sh
```

### 2. Open Your Project in Claude Code
```bash
cd project/
claude
```

### 3. Verify MCP Connection
In Claude Code, type:
```
/mcp
```
Select `clickmongrel` and verify it shows "Connected"

## Test Scenarios

### Scenario 1: Parent-Child Task Tracking

Ask Claude to help you implement the authentication system with subtasks:

```
I need to implement user authentication for my app. Can you help me break this down into tasks and track them in ClickUp?

Main task: Implement user authentication
Subtasks:
- Design the authentication flow
- Create login/signup forms
- Implement JWT token handling
- Add password encryption
- Create user profile management
```

### Scenario 2: Test Auto-Completion

1. Use TodoWrite to create the task structure
2. Mark subtasks as in_progress one by one
3. Complete subtasks and watch parent status change
4. When all subtasks complete, parent should auto-complete

### Scenario 3: Real Development Flow

1. Ask Claude to help implement a feature
2. Let Claude create todos for the work
3. As Claude writes code, todos should update
4. Commits should link to tasks in ClickUp

## What to Verify

### In Claude Code:
- [ ] TodoWrite creates proper parent-child relationships
- [ ] Sync updates ClickUp correctly
- [ ] Status changes propagate properly

### In ClickUp:
- [ ] Parent tasks show in "Tasks" list
- [ ] Subtasks are nested under parents
- [ ] Parent auto-completes when all subtasks done
- [ ] Task descriptions include metadata

### In Your Project:
- [ ] `.claude/clickup/` directory created
- [ ] Config files properly initialized
- [ ] Sync status tracked

## Troubleshooting

If MCP doesn't connect:
```bash
# Check MCP list
claude mcp list

# View logs
claude mcp logs clickmongrel --tail 50

# Restart Claude Code
```

If tasks don't sync:
- Check API key is valid
- Verify workspace/space names
- Check network connection

## Clean Up After Testing

```bash
# Remove MCP
claude mcp remove clickmongrel

# Remove test directory (optional)
cd ../..
rm -rf user-sim-*
```
EOF
    
    success "Test instructions created at: $TEST_DIR/TEST_INSTRUCTIONS.md"
    
    header "✨ Setup Complete!"
    
    echo ""
    info "Test Environment Ready at: $TEST_DIR"
    echo ""
    log "Directory Structure:" "$CYAN"
    tree -L 2 "$TEST_DIR" 2>/dev/null || {
        echo "$TEST_DIR/"
        echo "├── deps/"
        echo "│   └── clickmongrel/    (MCP server)"
        echo "├── project/             (Your test project)"
        echo "├── logs/                (Setup logs)"
        echo "├── setup-mcp.sh         (MCP setup script)"
        echo "└── TEST_INSTRUCTIONS.md (Testing guide)"
    }
    
    echo ""
    log "Next Steps:" "$GREEN"
    echo "1. Set your ClickUp API key:"
    echo "   export CLICKUP_API_KEY='your_api_key_here'"
    echo ""
    echo "2. Navigate to test directory:"
    echo "   cd $TEST_DIR"
    echo ""
    echo "3. Run MCP setup:"
    echo "   ./setup-mcp.sh"
    echo ""
    echo "4. Open project in Claude Code:"
    echo "   cd project && claude"
    echo ""
    echo "5. Follow TEST_INSTRUCTIONS.md for testing"
    
    # Save environment info
    cat > "$TEST_DIR/environment.json" << EOF
{
  "test_run_id": "$TEST_RUN_ID",
  "created_at": "$(date -Iseconds)",
  "directories": {
    "test_dir": "$TEST_DIR",
    "mcp_server": "$MCP_DIR",
    "user_project": "$USER_PROJECT_DIR",
    "logs": "$LOGS_DIR"
  },
  "mcp_version": "$(cd $MCP_DIR && node -p "require('./package.json').version")",
  "status": "ready"
}
EOF
    
    success "Environment info saved to environment.json"
}

# Run main function
setup_user_environment

# Option to open in file manager
read -p "Open test directory in file manager? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    xdg-open "$TEST_DIR" 2>/dev/null || open "$TEST_DIR" 2>/dev/null || echo "Please open: $TEST_DIR"
fi