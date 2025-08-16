#!/usr/bin/env node

/**
 * Hook script for detecting git commits and linking them to ClickUp
 * Called before Bash commands to detect git commit operations
 */

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    command?: string;
    description?: string;
  };
}

async function main() {
  try {
    // Read input from stdin
    let inputData = '';
    process.stdin.setEncoding('utf8');
    
    for await (const chunk of process.stdin) {
      inputData += chunk;
    }

    if (!inputData) {
      process.exit(0);
    }

    const hookData: HookInput = JSON.parse(inputData);

    // Only process Bash tool
    if (hookData.tool_name !== 'Bash') {
      process.exit(0);
    }

    const command = hookData.tool_input?.command;
    if (!command) {
      process.exit(0);
    }

    // Detect git commit commands
    const isGitCommit = command.includes('git commit') && !command.includes('--dry-run');
    const isGitPush = command.includes('git push');
    
    if (isGitCommit) {
      // Extract commit message if possible
      const messageMatch = command.match(/-m\s+["']([^"']+)["']/) || 
                          command.match(/-m\s+(\S+)/);
      const message = messageMatch ? messageMatch[1] : 'Commit detected';
      
      console.error(`[ClickMongrel] Git commit detected: "${message}"`);
      console.error('[ClickMongrel] Will link to current ClickUp task after commit completes');
      
      // Store in environment for post-hook processing
      process.env.CLICKMONGREL_PENDING_COMMIT = 'true';
      process.env.CLICKMONGREL_COMMIT_MESSAGE = message;
    }

    if (isGitPush) {
      console.error('[ClickMongrel] Git push detected - updating ClickUp task status');
    }

    // Always allow the command to proceed
    process.exit(0);
  } catch (error) {
    console.error('[ClickMongrel] Error in commit-detector hook:', error);
    process.exit(0); // Don't block on errors
  }
}

main();