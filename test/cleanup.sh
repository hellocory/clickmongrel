#!/bin/bash

# ClickMongrel Test Cleanup Script
# Safely removes all test artifacts from a test run

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_DIR="$HOME/coding/mcps/test-runs"
GITHUB_USER="${GITHUB_USER:-hellocory}"

# Functions
log() {
    echo -e "${2:-$NC}$1${NC}"
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

header() {
    echo ""
    log "==========================================" "$BLUE"
    log "$1" "$BLUE"
    log "==========================================" "$BLUE"
    echo ""
}

cleanup_mcp() {
    header "Cleaning MCP Integration"
    
    if claude mcp list | grep -q clickmongrel; then
        log "Removing ClickMongrel from Claude Code..."
        if claude mcp remove clickmongrel; then
            success "MCP integration removed"
        else
            error "Failed to remove MCP integration"
        fi
    else
        warning "ClickMongrel MCP not found"
    fi
}

cleanup_github_repos() {
    header "Cleaning GitHub Repositories"
    
    log "Checking for test repositories..."
    
    # List all test repos
    REPOS=$(gh repo list "$GITHUB_USER" --limit 100 | grep "clickmongrel-test-" | awk '{print $1}' || true)
    
    if [ -z "$REPOS" ]; then
        warning "No test repositories found"
    else
        echo "Found test repositories:"
        echo "$REPOS"
        echo ""
        
        read -p "Delete ALL test repositories? (y/n) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for repo in $REPOS; do
                log "Deleting $repo..."
                if gh repo delete "$repo" --yes; then
                    success "Deleted $repo"
                else
                    error "Failed to delete $repo"
                fi
            done
        else
            warning "Skipping repository deletion"
        fi
    fi
}

cleanup_clickup_data() {
    header "Cleaning ClickUp Data"
    
    # Check if we have API key
    if [ -z "$CLICKUP_API_KEY" ]; then
        warning "No ClickUp API key found. Manual cleanup required:"
        echo "1. Go to ClickUp workspace"
        echo "2. Delete test spaces created during testing"
        echo "3. Delete test tasks from Tasks list"
        echo "4. Delete test commits from Commits list"
        echo "5. Archive or delete test goals"
        echo ""
        
        read -p "Have you cleaned ClickUp data? (y/n) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            success "ClickUp data cleaned"
        else
            warning "Remember to clean ClickUp data manually"
        fi
        return
    fi
    
    # Attempt automatic cleanup
    log "Attempting automatic ClickUp cleanup..."
    
    # Get workspace/team ID
    TEAM_DATA=$(curl -s "https://api.clickup.com/api/v2/team" \
        -H "Authorization: $CLICKUP_API_KEY" 2>/dev/null || true)
    
    if [ -n "$TEAM_DATA" ]; then
        TEAM_ID=$(echo "$TEAM_DATA" | jq -r '.teams[0].id' 2>/dev/null || true)
        
        if [ -n "$TEAM_ID" ]; then
            # Get all spaces
            SPACES_DATA=$(curl -s "https://api.clickup.com/api/v2/team/${TEAM_ID}/space" \
                -H "Authorization: $CLICKUP_API_KEY" 2>/dev/null || true)
            
            # Find test spaces (containing "Test" in name)
            TEST_SPACES=$(echo "$SPACES_DATA" | \
                jq -r '.spaces[] | select(.name | test("Test|test")) | "\(.id):\(.name)"' 2>/dev/null || true)
            
            if [ -n "$TEST_SPACES" ]; then
                echo "Found test spaces:"
                while IFS=: read -r space_id space_name; do
                    echo "  - $space_name (ID: $space_id)"
                done <<< "$TEST_SPACES"
                echo ""
                
                read -p "Delete these test spaces? (y/n) " -n 1 -r
                echo
                
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    while IFS=: read -r space_id space_name; do
                        log "Deleting space: $space_name"
                        RESULT=$(curl -s -X DELETE "https://api.clickup.com/api/v2/space/${space_id}" \
                            -H "Authorization: $CLICKUP_API_KEY" 2>&1)
                        
                        if [ $? -eq 0 ]; then
                            success "Deleted space: $space_name"
                        else
                            warning "Could not delete space: $space_name"
                        fi
                    done <<< "$TEST_SPACES"
                else
                    warning "Skipping space deletion"
                fi
            else
                log "No test spaces found"
            fi
            
            # Also check for test lists in the main space
            echo ""
            log "Checking for test lists in existing spaces..."
            
            # Get all lists from all spaces
            ALL_SPACES=$(echo "$SPACES_DATA" | jq -r '.spaces[].id' 2>/dev/null || true)
            
            for space_id in $ALL_SPACES; do
                LISTS_DATA=$(curl -s "https://api.clickup.com/api/v2/space/${space_id}/list" \
                    -H "Authorization: $CLICKUP_API_KEY" 2>/dev/null || true)
                
                TEST_LISTS=$(echo "$LISTS_DATA" | \
                    jq -r '.lists[] | select(.name | test("Test|test|Commits")) | "\(.id):\(.name)"' 2>/dev/null || true)
                
                if [ -n "$TEST_LISTS" ]; then
                    echo "Found test/commits lists in space $space_id:"
                    while IFS=: read -r list_id list_name; do
                        echo "  - $list_name (ID: $list_id)"
                    done <<< "$TEST_LISTS"
                fi
            done
        fi
    else
        warning "Could not connect to ClickUp API"
    fi
    
    echo ""
    warning "Please verify in ClickUp that all test data has been removed"
}

cleanup_test_directories() {
    header "Cleaning Test Directories"
    
    if [ ! -d "$BASE_DIR" ]; then
        warning "No test-runs directory found"
        return
    fi
    
    cd "$BASE_DIR"
    
    # Find all test run directories
    TEST_DIRS=$(find . -maxdepth 1 -type d -name "run-*" | sort)
    
    if [ -z "$TEST_DIRS" ]; then
        warning "No test directories found"
    else
        echo "Found test directories:"
        echo "$TEST_DIRS"
        echo ""
        
        echo "Options:"
        echo "1. Archive all and delete"
        echo "2. Archive all and keep"
        echo "3. Delete all without archiving"
        echo "4. Skip"
        
        read -p "Choose option (1-4): " -n 1 -r
        echo
        
        case $REPLY in
            1)
                for dir in $TEST_DIRS; do
                    dirname=$(basename "$dir")
                    log "Archiving $dirname..."
                    tar -czf "$dirname.tar.gz" "$dir"
                    rm -rf "$dir"
                    success "Archived and deleted $dirname"
                done
                ;;
            2)
                for dir in $TEST_DIRS; do
                    dirname=$(basename "$dir")
                    log "Archiving $dirname..."
                    tar -czf "$dirname.tar.gz" "$dir"
                    success "Archived $dirname"
                done
                ;;
            3)
                read -p "Are you sure? This cannot be undone. (yes/no): " -r
                if [[ $REPLY == "yes" ]]; then
                    for dir in $TEST_DIRS; do
                        rm -rf "$dir"
                        success "Deleted $dir"
                    done
                else
                    warning "Skipping deletion"
                fi
                ;;
            *)
                warning "Skipping directory cleanup"
                ;;
        esac
    fi
}

cleanup_specific_run() {
    header "Clean Specific Test Run"
    
    read -p "Enter test run ID (e.g., run-2024-01-15-143022): " TEST_RUN_ID
    
    if [ -z "$TEST_RUN_ID" ]; then
        error "No test run ID provided"
        return
    fi
    
    TEST_DIR="$BASE_DIR/$TEST_RUN_ID"
    
    if [ ! -d "$TEST_DIR" ]; then
        error "Test directory not found: $TEST_DIR"
        return
    fi
    
    log "Cleaning test run: $TEST_RUN_ID"
    
    # Remove MCP if it references this test
    MCP_PATH=$(claude mcp list | grep "$TEST_DIR" | awk '{print $1}' || true)
    if [ -n "$MCP_PATH" ]; then
        log "Removing associated MCP..."
        claude mcp remove clickmongrel 2>/dev/null || true
    fi
    
    # Delete GitHub repo
    REPO_NAME="clickmongrel-test-${TEST_RUN_ID#run-}"
    if gh repo view "$GITHUB_USER/$REPO_NAME" &>/dev/null; then
        log "Deleting repository $REPO_NAME..."
        gh repo delete "$GITHUB_USER/$REPO_NAME" --yes
    fi
    
    # Archive and remove directory
    cd "$BASE_DIR"
    tar -czf "$TEST_RUN_ID.tar.gz" "$TEST_RUN_ID/"
    rm -rf "$TEST_RUN_ID"
    
    success "Test run cleaned: $TEST_RUN_ID"
}

reset_dev_environment() {
    header "Reset Development Environment"
    
    warning "This will reset your development ClickMongrel configuration!"
    read -p "Are you sure? (yes/no): " -r
    
    if [[ $REPLY != "yes" ]]; then
        warning "Skipping reset"
        return
    fi
    
    DEV_DIR="$HOME/coding/mcps/clickmongrel"
    
    if [ -d "$DEV_DIR" ]; then
        cd "$DEV_DIR"
        
        log "Cleaning development environment..."
        rm -rf .claude/clickup/cache/*
        rm -rf .claude/clickup/reports/*
        rm -rf .claude/clickup/logs/*
        rm -f config/*.json
        
        success "Development environment reset"
    else
        error "Development directory not found"
    fi
}

show_status() {
    header "Current Status"
    
    # Check MCP
    echo "MCP Integrations:"
    claude mcp list | grep clickmongrel || echo "  None found"
    echo ""
    
    # Check test directories
    if [ -d "$BASE_DIR" ]; then
        echo "Test Directories:"
        ls -la "$BASE_DIR" | grep "run-" || echo "  None found"
        echo ""
        
        echo "Archives:"
        ls -la "$BASE_DIR"/*.tar.gz 2>/dev/null || echo "  None found"
    else
        echo "No test-runs directory"
    fi
    echo ""
    
    # Check GitHub repos
    echo "Test Repositories:"
    gh repo list "$GITHUB_USER" --limit 100 | grep "clickmongrel-test-" || echo "  None found"
}

# Main menu
main() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          ClickMongrel Test Cleanup Utility          ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    while true; do
        echo "Options:"
        echo "1. Show current status"
        echo "2. Clean all test artifacts"
        echo "3. Clean specific test run"
        echo "4. Clean MCP integrations only"
        echo "5. Clean GitHub repositories only"
        echo "6. Clean test directories only"
        echo "7. Clean ClickUp data (manual)"
        echo "8. Reset development environment"
        echo "9. Exit"
        echo ""
        
        read -p "Choose option (1-9): " -n 1 -r
        echo ""
        
        case $REPLY in
            1)
                show_status
                ;;
            2)
                cleanup_mcp
                cleanup_github_repos
                cleanup_clickup_data
                cleanup_test_directories
                ;;
            3)
                cleanup_specific_run
                ;;
            4)
                cleanup_mcp
                ;;
            5)
                cleanup_github_repos
                ;;
            6)
                cleanup_test_directories
                ;;
            7)
                cleanup_clickup_data
                ;;
            8)
                reset_dev_environment
                ;;
            9)
                success "Cleanup utility closed"
                exit 0
                ;;
            *)
                error "Invalid option"
                ;;
        esac
        
        echo ""
        read -p "Press ENTER to continue..."
        clear
    done
}

# Run main function
main "$@"