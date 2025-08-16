#!/usr/bin/env node
import { TodoItem } from '../types/index.js';

/**
 * Hook script for syncing TodoWrite changes to ClickUp
 * Called by Claude Code when TodoWrite tool is used
 */

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    todos: TodoItem[];
  };
  tool_response?: unknown;
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
      console.error('No input received from hook');
      process.exit(0);
    }

    const hookData: HookInput = JSON.parse(inputData);

    // Only process TodoWrite tool
    if (hookData.tool_name !== 'TodoWrite') {
      process.exit(0);
    }

    const todos = hookData.tool_input?.todos;
    if (!todos || !Array.isArray(todos)) {
      console.error('No todos found in input');
      process.exit(0);
    }

    // Import sync handler and sync the todos
    const { default: SyncHandler } = await import('../handlers/sync.js');
    const fs = await import('fs');
    const path = await import('path');
    
    // Read config to get API key
    const configPath = path.join(hookData.cwd, '.claude', 'clickup', 'config.json');
    let apiKey = process.env.CLICKUP_API_KEY;
    
    if (!apiKey && fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      apiKey = config.apiKey;
    }
    
    if (!apiKey) {
      console.error('[ClickMongrel] No API key found, skipping sync');
      process.exit(0);
    }
    
    // Initialize sync handler and sync todos
    console.error(`[ClickMongrel] Syncing ${todos.length} todos to ClickUp...`);
    
    const handler = new SyncHandler(apiKey);
    await handler.initialize();
    
    // Check if we have a list configured
    const status = handler.getSyncStatus();
    if (!status.listId) {
      console.error('[ClickMongrel] No list configured, run setup first');
      process.exit(0);
    }
    
    // Log todos being synced
    todos.forEach(todo => {
      const statusIcon = todo.status === 'completed' ? '✓' : 
                        todo.status === 'in_progress' ? '⚡' : '○';
      console.error(`[ClickMongrel] ${statusIcon} ${todo.content.substring(0, 50)}`);
    });
    
    // Sync todos (returns void, but logs internally)
    await handler.syncTodos(todos);
    
    console.error(`[ClickMongrel] Sync request sent to ClickUp`);
    
    // Success
    process.exit(0);
  } catch (error) {
    console.error('[ClickMongrel] Error in todo-sync hook:', error);
    process.exit(1); // Exit with error but don't block
  }
}

main();