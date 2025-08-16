# Commit Tracking Workflow

## Overview
Each git commit is tracked as a task in ClickUp's "Commits" list, moving through a defined lifecycle that reflects its journey from development to production.

## Status Lifecycle

### 1. **COMMITTED** (Gray) - Not Started
- **When**: Immediately after `git commit` is executed
- **Meaning**: Code has been committed locally
- **Branch Tag**: Local branch name is tagged
- **Next**: Moves to DEVELOPING when pushed to remote

### 2. **DEVELOPING** (Yellow) - Active
- **When**: After `git push` to development/feature branch
- **Meaning**: Code is in active development branch
- **Branch Tag**: Remote branch name (e.g., `feature/new-feature`, `dev`)
- **Next**: Moves to PROTOTYPING when merged to staging/test

### 3. **PROTOTYPING** (Purple) - Active
- **When**: Merged to staging/test branch
- **Meaning**: Code is being tested in staging environment
- **Branch Tag**: `staging` or `test`
- **Next**: Either REJECTED (if issues found) or PRODUCTION/TESTING

### 4. **REJECTED** (Orange) - Active
- **When**: Issues found during testing or review
- **Meaning**: Commit needs fixes or has been reverted
- **Branch Tag**: `reverted` or `hotfix/issue-name`
- **Next**: Back to DEVELOPING after fixes

### 5. **PRODUCTION/TESTING** (Blue) - Done
- **When**: Deployed to production for A/B testing or canary deployment
- **Meaning**: Code is in production but still being monitored
- **Branch Tag**: `production-testing` or `canary`
- **Next**: PRODUCTION/FINAL after validation period

### 6. **PRODUCTION/FINAL** (Green) - Closed
- **When**: Fully deployed and stable in production
- **Meaning**: Commit is complete and stable in production
- **Branch Tag**: `main` or `production`
- **End State**: This is the final state

## Automatic Tracking

### Git Hooks Integration
The system automatically creates/updates ClickUp tasks based on git actions:

```bash
# On commit
git commit -m "feat: Add user authentication"
# → Creates task in COMMITTED status

# On push
git push origin feature/auth
# → Updates task to DEVELOPING, tags with "feature/auth"

# On merge to staging
git checkout staging && git merge feature/auth
# → Updates task to PROTOTYPING, tags with "staging"

# On merge to main
git checkout main && git merge staging
# → Updates task to PRODUCTION/TESTING, then PRODUCTION/FINAL
```

## Task Details

Each commit task in ClickUp includes:

### Title Format
```
[COMMIT] <type>: <description> (<short-hash>)
```
Example: `[COMMIT] feat: Add user authentication (a3b2c1d)`

### Task Fields
- **Description**: Full commit message
- **Branch Tag**: Current branch name
- **Commit Hash**: Full git commit hash
- **Author**: Git author name/email
- **Timestamp**: Commit timestamp
- **Files Changed**: Number of files modified
- **Lines Changed**: Additions/deletions

### Custom Fields
- **Branch**: Text field with current branch
- **Environment**: Dropdown (development/staging/production)
- **PR Link**: URL to pull request (if applicable)
- **Build Status**: Pass/Fail/Pending

## Branch Tagging Strategy

Each status corresponds to typical branch patterns:

| Status | Typical Branches | Tag Format |
|--------|-----------------|------------|
| COMMITTED | local only | `local:<branch-name>` |
| DEVELOPING | feature/*, dev, develop | `dev:<branch-name>` |
| PROTOTYPING | staging, test, qa | `staging:<branch-name>` |
| REJECTED | hotfix/*, revert-* | `fix:<issue-description>` |
| PRODUCTION/TESTING | canary, production-test | `prod-test:<version>` |
| PRODUCTION/FINAL | main, master, production | `prod:<version>` |

## Implementation

### CLI Commands

```bash
# Track a commit manually
clickmongrel commit track <commit-hash> --branch <branch-name>

# Update commit status
clickmongrel commit status <commit-hash> --status developing

# Link commit to PR
clickmongrel commit link <commit-hash> --pr <pr-url>

# Bulk update commits after merge
clickmongrel commit merge --from feature/auth --to staging
```

### Automatic Hooks

Add to `.git/hooks/post-commit`:
```bash
#!/bin/bash
clickmongrel commit track $(git rev-parse HEAD) --branch $(git branch --show-current)
```

Add to `.git/hooks/post-merge`:
```bash
#!/bin/bash
clickmongrel commit merge --from $GIT_REFLOG_ACTION --to $(git branch --show-current)
```

## Status Transition Rules

### Allowed Transitions
- COMMITTED → DEVELOPING
- DEVELOPING → PROTOTYPING, REJECTED
- PROTOTYPING → REJECTED, PRODUCTION/TESTING
- REJECTED → DEVELOPING
- PRODUCTION/TESTING → PRODUCTION/FINAL, REJECTED
- PRODUCTION/FINAL → (terminal state)

### Automatic Transitions
Based on branch patterns and git events:
- Push to `feature/*` → DEVELOPING
- Merge to `staging` → PROTOTYPING  
- Merge to `main` → PRODUCTION/TESTING
- After 24 hours in PRODUCTION/TESTING → PRODUCTION/FINAL

## Benefits

1. **Complete Visibility**: Track every commit's journey
2. **Issue Tracking**: Identify which commits were rejected
3. **Deployment Tracking**: Know what's in each environment
4. **Audit Trail**: Full history of commit lifecycle
5. **Branch Context**: Always know which branch a commit is on