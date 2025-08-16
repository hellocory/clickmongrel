# ClickUp Status Configuration - Visual Guide

## Why Custom Statuses Are Required

ClickMongrel tracks the full lifecycle of your tasks and commits. To enable this, you need to configure custom statuses in ClickUp that map to the TodoWrite states and commit lifecycle phases.

## Step-by-Step Configuration

### 1️⃣ Tasks List Configuration

1. **Navigate to your Tasks list** in the Agentic Development space
2. **Click the three dots** (⋮) menu on the list
3. **Select "Edit statuses"**
4. **Choose "Use custom statuses"** (not "Inherit from Space")
5. **Configure these statuses:**

#### Not Started Group (Gray section)
- `TO DO` - Gray color (#87909e)
- `FUTURE` - Blue color (#4194f6)

#### Active Group (Yellow section)  
- `IN PROGRESS` - Yellow/Orange color (#ffab00)
- `FIXING` - Orange color (#ff8c00)

#### Done Group (Green section)
- `COMPLETED` - Green color (#02c852)

6. **Click "Apply changes"**

### 2️⃣ Commits List Configuration

1. **Navigate to your Commits list** in the Agentic Development space
2. **Click the three dots** (⋮) menu on the list
3. **Select "Edit statuses"**
4. **Choose "Use custom statuses"**
5. **Configure these statuses:**

#### Development Phase
- `development update` - Gray (#87909e)
- `development push` - Blue (#5b9fd6)
- `upstream merge` - Purple (#a855f7)
- `merged` - Green (#02c852)

#### Production Phase
- `production/testing` - Yellow (#ffab00)
- `production/staging` - Orange (#ff8c00)
- `production/final` - Green (#02c852)

6. **Click "Apply changes"**

## Status Mapping Reference

### TodoWrite → ClickUp Mapping
```
TodoWrite Status  →  ClickUp Status
─────────────────────────────────
pending          →  TO DO
in_progress      →  IN PROGRESS
completed        →  COMPLETED
```

### Commit Lifecycle Tracking
```
Git Action              →  ClickUp Status
──────────────────────────────────────────
Initial commit          →  development update
git push                →  development push
Merge from upstream     →  upstream merge
Merge to main          →  merged
Deploy to test         →  production/testing
Deploy to staging      →  production/staging
Deploy to production   →  production/final
```

## Verification

After configuring statuses, verify they're working:

1. **Run status check:**
   ```bash
   node dist/cli.js status
   ```

2. **Create a test task:**
   ```bash
   # In Claude or your code
   Use TodoWrite to create a test task
   Sync to ClickUp
   Check that it appears with "TO DO" status
   ```

3. **Test status transitions:**
   - Mark task as `in_progress` in TodoWrite
   - Sync to ClickUp
   - Verify it shows as "IN PROGRESS"

## Troubleshooting

### Issue: Statuses not syncing
- **Solution:** Ensure status names match EXACTLY (case-sensitive)
- Status names must be identical to the ones listed above

### Issue: "Inherit from Space" selected
- **Solution:** You must select "Use custom statuses" for each list
- Space-level statuses won't work with the tracking system

### Issue: Can't create custom statuses
- **Solution:** You need appropriate permissions in ClickUp
- Ask your workspace admin to grant list edit permissions

### Issue: Status colors don't match
- **Solution:** Colors are optional but help with visual organization
- The system matches by name, not color

## Advanced Configuration

### Adding Custom Statuses
You can add additional statuses for your workflow:
- `BLOCKED` - For blocked tasks
- `REVIEW` - For code review phase
- `QA` - For quality assurance

Just ensure the core statuses listed above are present.

### Multiple Environments
For the Commits list, you can extend the production statuses:
- `production/dev` - Development environment
- `production/qa` - QA environment
- `production/uat` - User acceptance testing
- `production/prod` - Production environment

## Best Practices

1. **Keep status names consistent** across all projects
2. **Use the exact names** provided (including spaces and case)
3. **Document any custom statuses** you add for your team
4. **Test the sync** after any status changes
5. **Use colors** to help visualize workflow stages

## API Limitations

Note: ClickUp's API doesn't support creating custom statuses programmatically. This is why manual configuration is required. The statuses must be set up through the ClickUp web interface.

## Need Help?

- Check the [ClickUp documentation](https://docs.clickup.com/en/articles/2117335-statuses)
- Report issues at [ClickMongrel GitHub](https://github.com/hellocory/clickmongrel/issues)
- Join our [Discord community](https://discord.gg/clickmongrel) for support

---

*This configuration is required for ClickMongrel to properly track task and commit lifecycles. Take 5 minutes to set it up correctly and you'll have powerful tracking capabilities!*