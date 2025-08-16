#!/bin/bash

# ClickMongrel Validation Script
# Validates all components of a ClickMongrel installation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Configuration
CLICKUP_API_KEY="${CLICKUP_API_KEY}"
PROJECT_DIR="${1:-$(pwd)}"

# Functions
log() {
    echo -e "${2:-$NC}$1${NC}"
}

pass() {
    log "✅ $1" "$GREEN"
    ((PASSED++))
}

fail() {
    log "❌ $1" "$RED"
    ((FAILED++))
}

warn() {
    log "⚠️  $1" "$YELLOW"
    ((WARNINGS++))
}

header() {
    echo ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "$BLUE"
    log "$1" "$BLUE"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "$BLUE"
}

check_file() {
    if [ -f "$1" ]; then
        pass "$2"
        return 0
    else
        fail "$2 - Not found: $1"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        pass "$2"
        return 0
    else
        fail "$2 - Not found: $1"
        return 1
    fi
}

check_json() {
    if [ -f "$1" ]; then
        if jq empty "$1" 2>/dev/null; then
            pass "$2 - Valid JSON"
            return 0
        else
            fail "$2 - Invalid JSON"
            return 1
        fi
    else
        fail "$2 - File not found"
        return 1
    fi
}

# Validation Functions

validate_project_structure() {
    header "Project Structure"
    
    cd "$PROJECT_DIR"
    
    # Source files
    check_dir "src" "Source directory"
    check_file "src/index.ts" "MCP entry point"
    check_dir "src/handlers" "Handlers directory"
    check_dir "src/utils" "Utils directory"
    check_dir "src/types" "Types directory"
    
    # Build files
    check_dir "dist" "Build directory"
    check_file "dist/index.js" "Built MCP server"
    
    # Configuration
    check_file "package.json" "Package configuration"
    check_file "tsconfig.json" "TypeScript configuration"
}

validate_clickup_config() {
    header "ClickUp Configuration"
    
    cd "$PROJECT_DIR"
    
    # Main config structure
    check_dir ".claude/clickup" "ClickUp config directory"
    
    # Config files
    if check_json ".claude/clickup/config.json" "ClickUp configuration"; then
        # Validate config contents
        WORKSPACE_ID=$(jq -r '.workspace.id // empty' .claude/clickup/config.json 2>/dev/null)
        SPACE_ID=$(jq -r '.space.id // empty' .claude/clickup/config.json 2>/dev/null)
        COMMITS_LIST=$(jq -r '.lists.commits // empty' .claude/clickup/config.json 2>/dev/null)
        TASKS_LIST=$(jq -r '.lists.tasks // empty' .claude/clickup/config.json 2>/dev/null)
        
        [ -n "$WORKSPACE_ID" ] && pass "Workspace ID configured" || fail "Workspace ID missing"
        [ -n "$SPACE_ID" ] && pass "Space ID configured" || fail "Space ID missing"
        [ -n "$COMMITS_LIST" ] && pass "Commits list configured" || fail "Commits list missing"
        [ -n "$TASKS_LIST" ] && pass "Tasks list configured" || fail "Tasks list missing"
    fi
    
    # Cache directories
    check_dir ".claude/clickup/cache" "Cache directory"
    check_dir ".claude/clickup/logs" "Logs directory"
    check_dir ".claude/clickup/reports" "Reports directory"
    check_dir ".claude/clickup/reports/daily" "Daily reports directory"
    check_dir ".claude/clickup/reports/weekly" "Weekly reports directory"
}

validate_templates() {
    header "Templates Configuration"
    
    cd "$PROJECT_DIR"
    
    # Commit templates
    if check_json "config/commit-templates.json" "Commit templates"; then
        # Check template structure
        TEMPLATES=$(jq -r '.templates | keys[]' config/commit-templates.json 2>/dev/null)
        if echo "$TEMPLATES" | grep -q "default"; then
            pass "Default template exists"
        else
            fail "Default template missing"
        fi
        
        # Check type mappings
        TYPE_COUNT=$(jq '.typeMapping | length' config/commit-templates.json 2>/dev/null)
        if [ "$TYPE_COUNT" -gt 0 ]; then
            pass "Type mappings configured ($TYPE_COUNT types)"
        else
            fail "No type mappings found"
        fi
    fi
    
    # Status mappings
    check_json "config/statuses.json" "Status mappings" || warn "Status mappings not configured"
}

validate_mcp_integration() {
    header "MCP Integration"
    
    # Check if Claude Code is available
    if command -v claude &> /dev/null; then
        pass "Claude Code installed"
        
        # Check if ClickMongrel is registered
        if claude mcp list 2>/dev/null | grep -q clickmongrel; then
            pass "ClickMongrel MCP registered"
            
            # Try to get MCP status
            if claude mcp logs clickmongrel --tail 1 &>/dev/null; then
                pass "MCP accessible"
            else
                warn "MCP registered but not responding"
            fi
        else
            warn "ClickMongrel not registered in Claude Code"
        fi
    else
        fail "Claude Code not installed"
    fi
}

validate_api_connection() {
    header "API Connection"
    
    # Test ClickUp API
    RESPONSE=$(curl -s -X GET "https://api.clickup.com/api/v2/user" \
        -H "Authorization: $CLICKUP_API_KEY" \
        -H "Content-Type: application/json")
    
    if echo "$RESPONSE" | jq -e '.user' &>/dev/null; then
        USER_NAME=$(echo "$RESPONSE" | jq -r '.user.username')
        pass "API connection successful (User: $USER_NAME)"
    else
        fail "API connection failed"
        echo "Response: $RESPONSE"
    fi
}

validate_git_integration() {
    header "Git Integration"
    
    cd "$PROJECT_DIR"
    
    # Check git repository
    if [ -d ".git" ]; then
        pass "Git repository initialized"
        
        # Check remote
        if git remote -v | grep -q origin; then
            REMOTE=$(git remote get-url origin)
            pass "Git remote configured: $REMOTE"
        else
            warn "No git remote configured"
        fi
        
        # Check branch
        BRANCH=$(git branch --show-current)
        pass "Current branch: $BRANCH"
    else
        fail "Not a git repository"
    fi
}

validate_handlers() {
    header "Handler Files"
    
    cd "$PROJECT_DIR"
    
    # Check all handler files
    HANDLERS=("sync" "goals" "tasks" "commits" "reports" "workflow")
    
    for handler in "${HANDLERS[@]}"; do
        check_file "dist/handlers/$handler.js" "$handler handler"
    done
}

validate_tools() {
    header "MCP Tools Availability"
    
    cd "$PROJECT_DIR"
    
    # Read tool definitions from index.ts
    if [ -f "src/index.ts" ]; then
        TOOLS=$(grep -o "name: '[^']*'" src/index.ts | cut -d"'" -f2)
        TOOL_COUNT=$(echo "$TOOLS" | wc -l)
        
        if [ "$TOOL_COUNT" -gt 0 ]; then
            pass "Found $TOOL_COUNT MCP tools defined"
            
            # Check for essential tools
            for tool in "sync_todos" "get_current_goal" "workflow_create_tasks" "workflow_complete_task"; do
                if echo "$TOOLS" | grep -q "$tool"; then
                    pass "Essential tool: $tool"
                else
                    fail "Missing essential tool: $tool"
                fi
            done
        else
            fail "No MCP tools found"
        fi
    else
        fail "Source file not found"
    fi
}

validate_dependencies() {
    header "Dependencies"
    
    cd "$PROJECT_DIR"
    
    # Check node_modules
    if [ -d "node_modules" ]; then
        pass "Dependencies installed"
        
        # Check key dependencies
        for dep in "@modelcontextprotocol/sdk" "axios" "winston"; do
            if [ -d "node_modules/$dep" ]; then
                pass "Dependency: $dep"
            else
                fail "Missing dependency: $dep"
            fi
        done
    else
        fail "Dependencies not installed"
    fi
}

validate_permissions() {
    header "File Permissions"
    
    cd "$PROJECT_DIR"
    
    # Check script permissions
    for script in test/*.sh; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                pass "Executable: $(basename $script)"
            else
                warn "Not executable: $(basename $script)"
                chmod +x "$script"
                pass "Fixed: $(basename $script)"
            fi
        fi
    done
}

generate_report() {
    header "Validation Summary"
    
    TOTAL=$((PASSED + FAILED + WARNINGS))
    SCORE=$((PASSED * 100 / TOTAL))
    
    echo ""
    log "Results:" "$BLUE"
    log "  Passed:   $PASSED" "$GREEN"
    log "  Failed:   $FAILED" "$RED"
    log "  Warnings: $WARNINGS" "$YELLOW"
    log "  Total:    $TOTAL" "$NC"
    log "  Score:    $SCORE%" "$NC"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        log "✨ All critical validations passed!" "$GREEN"
        return 0
    else
        log "❌ Some validations failed. Please review and fix." "$RED"
        return 1
    fi
}

# Main execution
main() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         ClickMongrel Validation Suite              ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    log "Validating: $PROJECT_DIR" "$NC"
    
    # Run all validations
    validate_project_structure
    validate_clickup_config
    validate_templates
    validate_mcp_integration
    validate_api_connection
    validate_git_integration
    validate_handlers
    validate_tools
    validate_dependencies
    validate_permissions
    
    # Generate report
    generate_report
}

# Run main function
main "$@"