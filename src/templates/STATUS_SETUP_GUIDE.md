# ClickUp Status Configuration Guide

## IMPORTANT: Manual Status Setup Required

ClickUp's API doesn't allow creating custom statuses programmatically. You need to configure them manually in the ClickUp UI for proper task and commit tracking.

## 📋 Tasks List Status Configuration

Navigate to your **Tasks** list in ClickUp and configure these statuses:

### Not Started (Gray)
- **TO DO** - Tasks not yet started
- **FUTURE** - Tasks planned for later

### Active (Blue/Yellow)
- **IN PROGRESS** - Currently being worked on
- **FIXING** - Addressing issues or bugs

### Done (Green)
- **COMPLETED** - Task finished successfully

**Setup Steps:**
1. Open your Tasks list in ClickUp
2. Click the list options (3 dots) → Edit statuses
3. Select "Use custom statuses"
4. Add the statuses above with their respective colors
5. Save the configuration

## 🔄 Commits List Status Configuration

Navigate to your **Commits** list in ClickUp and configure these statuses:

### Development Phase
- **development update** (Gray) - Regular development commits
- **development push** (Blue) - Pushed to remote branch
- **upstream merge** (Purple) - Merged from upstream
- **merged** (Green) - Merged to main branch

### Production Phase
- **production/testing** (Yellow) - In testing phase
- **production/staging** (Orange) - Deployed to staging
- **production/final** (Green) - Deployed to production

**Setup Steps:**
1. Open your Commits list in ClickUp
2. Click the list options (3 dots) → Edit statuses
3. Select "Use custom statuses"
4. Add all the statuses above
5. Save the configuration

## 🎯 Why These Statuses Matter

### For Tasks:
- **TO DO** → Maps from `pending` in TodoWrite
- **IN PROGRESS** → Maps from `in_progress` in TodoWrite
- **COMPLETED** → Maps from `completed` in TodoWrite
- **FUTURE** → For backlog items
- **FIXING** → For bug fixes and issues

### For Commits:
The commit lifecycle tracking allows you to see the full journey of your code:
1. **development update** - Initial commit
2. **development push** - Shared with team
3. **upstream merge** - Integrated changes
4. **merged** - In main branch
5. **production/testing** - Being tested
6. **production/staging** - In staging environment
7. **production/final** - Live in production

## ✅ Verification

After setting up statuses, run:
```bash
node dist/cli.js status
```

This will show you the current configuration and verify everything is set up correctly.

## 🔧 Troubleshooting

If status mapping isn't working:
1. Check that status names match exactly (case-sensitive)
2. Ensure you selected "Use custom statuses" not "Inherit from Space"
3. Try refreshing the configuration:
   ```bash
   node dist/cli.js quick-setup --workspace "Your Workspace"
   ```

## 📝 Notes

- Status names must match exactly for proper syncing
- Colors help with visual organization but aren't required for functionality
- The system will map similar status names if exact matches aren't found
- You can add additional statuses as needed for your workflow

---

*This guide was generated during ClickMongrel setup. Keep it for reference when setting up new workspaces.*