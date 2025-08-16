# ClickUp Manual Setup Guide

Since the ClickUp API has limitations with creating custom statuses for lists, you'll need to manually configure the statuses in the ClickUp UI.

## Current Structure Created

✅ **Automatically Created:**
- Space: **Agentic Development** (ID: 90139254308)
- Folders:
  - Weekly Reports
  - Daily Reports  
  - Docs
- Lists:
  - Commits (ID: 901317935856)
  - Tasks (ID: 901317935857)

## ⚠️ Manual Setup Required

### For the "Commits" List:
1. Open the **Commits** list in ClickUp
2. Click the `...` menu in the top right
3. Select **"List settings"**
4. Go to the **"Statuses"** tab
5. Add these custom statuses with exact names and colors:
   - `development` - Color: #87909e (gray)
   - `error` - Color: #ff5733 (red)
   - `prototype` - Color: #ffab00 (yellow)
   - `production` - Color: #02c852 (green)

### For the "Tasks" List:
1. Open the **Tasks** list in ClickUp
2. Click the `...` menu in the top right
3. Select **"List settings"**
4. Go to the **"Statuses"** tab
5. Add these custom statuses with exact names and colors:
   - `to do` - Color: #87909e (gray)
   - `future` - Color: #4194f6 (blue)
   - `in progress` - Color: #ffab00 (yellow)
   - `fixing` - Color: #ff8c00 (orange)
   - `completed` - Color: #02c852 (green)

## After Manual Setup

Once you've manually configured the statuses, the integration will work properly:

- **TodoWrite** in Claude will sync to the **Tasks** list
- Git commits will be tracked in the **Commits** list
- Status mappings will work correctly between Claude and ClickUp

## Quick Test

After setting up statuses, run:
```bash
node test/validate-lists.js
```

This will verify that all statuses are properly configured.