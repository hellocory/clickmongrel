#!/bin/bash
# Git hook for updating commit status on push
# Place this in .git/hooks/pre-push

# Read push information from stdin
while read local_ref local_sha remote_ref remote_sha; do
    # Get branch name from remote ref
    BRANCH=$(echo "$remote_ref" | sed 's/refs\/heads\///')
    
    # Get commits being pushed
    if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
        # New branch - all commits are new
        COMMITS=$(git rev-list "$local_sha" --not --remotes)
    else
        # Existing branch - only new commits
        COMMITS=$(git rev-list "$remote_sha..$local_sha")
    fi
    
    # Update each commit status to DEVELOPING
    for commit in $COMMITS; do
        clickmongrel commit status "$commit" \
            --status developing \
            --branch "$BRANCH" 2>/dev/null || true
    done
    
    if [ -n "$COMMITS" ]; then
        COUNT=$(echo "$COMMITS" | wc -l)
        echo "✓ Updated $COUNT commit(s) to DEVELOPING status"
    fi
done