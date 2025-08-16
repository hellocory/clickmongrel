# 🚀 ClickUp Setup - For Claude AI Users

## Super Simple Setup

When a user says any of these:
- "Hey, setup clickup for me"
- "Setup clickup in a new space called ProjectX"
- "Configure clickup integration"
- "I need clickup tracking"

Claude should run ONE command:

### Default Setup (Creates/uses "Agentic Development" space)
```bash
clickmongrel setup-clickup --api-key <USER_API_KEY>
```

### Create New Space
```bash
clickmongrel setup-clickup --api-key <USER_API_KEY> --space-name "Project Name"
```

### Use Existing Space
```bash
clickmongrel setup-clickup --api-key <USER_API_KEY> --space-id <SPACE_ID>
```

## That's It! ✅

The command automatically:
1. Connects to ClickUp
2. Creates/finds the space
3. Creates folders (Weekly Reports, Daily Reports, Docs)
4. Creates lists (Commits, Tasks)
5. Saves configuration to `.claude/clickup/`

## What Happens Next

After running the command, the user needs to:
1. Open ClickUp
2. Add custom statuses to the lists (instructions are shown)
3. Start working - TodoWrite and commits will auto-sync!

## Examples

### User: "Hey Claude, setup clickup for me"
Claude runs:
```bash
clickmongrel setup-clickup --api-key pk_xxxxx
```
Result: Creates "Agentic Development" space with everything

### User: "Setup clickup in a new space called Website Redesign"
Claude runs:
```bash
clickmongrel setup-clickup --api-key pk_xxxxx --space-name "Website Redesign"
```
Result: Creates "Website Redesign" space with everything

### User: "I already have a space, use space ID 90139254789"
Claude runs:
```bash
clickmongrel setup-clickup --api-key pk_xxxxx --space-id 90139254789
```
Result: Uses existing space and adds lists/folders

## How Claude Should Respond

```markdown
I'll set up ClickUp integration for you now.

[Runs command]

✅ ClickUp is now set up with:
- Space: [Space Name]
- Folders for reports and documentation
- Lists for tracking tasks and commits

**One manual step needed:**
Please add the custom statuses in ClickUp as shown above.
Once done, your TodoWrite tasks and git commits will automatically sync!
```

## Testing

We just tested this with "Test Project" space and it worked perfectly:
- Created space ✅
- Created folders ✅
- Created lists ✅
- Saved config ✅

The entire process takes about 5 seconds!