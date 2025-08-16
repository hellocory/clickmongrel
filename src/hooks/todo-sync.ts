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

    // Call the MCP server to sync todos
    // In production, this would use the MCP client SDK
    // For now, we'll log the action
    console.error(`[ClickMongrel] Syncing ${todos.length} todos to ClickUp`);
    
    // Log todo status changes
    todos.forEach(todo => {
      console.error(`[ClickMongrel] Todo ${todo.id}: ${todo.status} - ${todo.content.substring(0, 50)}...`);
    });

    // Success
    process.exit(0);
  } catch (error) {
    console.error('[ClickMongrel] Error in todo-sync hook:', error);
    process.exit(1); // Exit with error but don't block
  }
}

main();