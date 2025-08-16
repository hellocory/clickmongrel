#!/usr/bin/env node

// Test script to sync todos to ClickUp via MCP server
const { spawn } = require('child_process');

const todos = [
  { id: "test-1", content: "Test MCP server connectivity", status: "completed" },
  { id: "test-2", content: "Test TodoWrite sync to ClickUp", status: "in_progress" },
  { id: "test-3", content: "Test goal management", status: "pending" },
  { id: "test-4", content: "Test report generation", status: "pending" },
  { id: "test-5", content: "Test commit linking", status: "pending" }
];

const mcpRequest = {
  jsonrpc: "2.0",
  method: "tools/call",
  params: {
    name: "sync_todos",
    arguments: { todos }
  },
  id: 1
};

console.log('Sending sync request to MCP server...');
console.log('Todos to sync:', todos.map(t => `${t.status}: ${t.content}`).join('\n'));

const server = spawn('node', ['/home/cory-ubuntu/coding/mcps/clickmongrel/dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errors = '';

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  errors += data.toString();
});

server.on('close', (code) => {
  console.log('\n=== MCP Server Response ===');
  if (output) {
    try {
      const lines = output.split('\n').filter(l => l.trim());
      const jsonLine = lines.find(l => l.startsWith('{'));
      if (jsonLine) {
        const response = JSON.parse(jsonLine);
        console.log('Response:', JSON.stringify(response, null, 2));
      }
    } catch (e) {
      console.log('Raw output:', output);
    }
  }
  
  if (errors) {
    console.log('\n=== Server Logs ===');
    console.log(errors);
  }
  
  process.exit(code);
});

// Send the request
server.stdin.write(JSON.stringify(mcpRequest) + '\n');

// Give it time to process
setTimeout(() => {
  server.kill();
}, 10000);