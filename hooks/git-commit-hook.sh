#!/bin/bash
# Git hook for tracking commits in ClickUp
# Place this in .git/hooks/post-commit

# Get commit information
COMMIT_HASH=$(git rev-parse HEAD)
BRANCH=$(git branch --show-current)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)
AUTHOR=$(git log -1 --pretty="%an <%ae>")

# Check if clickmongrel is configured
if [ -f ".claude/clickup/config.json" ]; then
    # Use clickmongrel CLI to track the commit
    clickmongrel commit track "$COMMIT_HASH" \
        --branch "$BRANCH" \
        --message "$COMMIT_MESSAGE" \
        --author "$AUTHOR" 2>/dev/null || true
    
    echo "✓ Commit tracked in ClickUp: $(echo $COMMIT_HASH | cut -c1-7)"
fi