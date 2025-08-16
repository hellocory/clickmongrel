#!/usr/bin/env node

import CommitHandler from '../../dist/handlers/commits.js';
import * as fs from 'fs';

console.log('🎨 TESTING COMMIT TEMPLATE FORMATTING\n');

// Show template configuration
const templateConfig = JSON.parse(fs.readFileSync('./config/commit-templates.json', 'utf-8'));
console.log('Available templates:', Object.keys(templateConfig.templates));
console.log('Default template:', templateConfig.defaultTemplate);
console.log('\nType mappings:');
Object.entries(templateConfig.typeMapping).forEach(([key, value]) => {
  console.log(`  ${key} → ${value}`);
});

// Test different commit messages
const testCommits = [
  {
    hash: 'abc123456789',
    message: 'feat: Add user authentication',
    author: 'John Doe <john@example.com>',
    timestamp: new Date().toISOString()
  },
  {
    hash: 'def456789012',
    message: 'fix(auth): Resolve login token expiry issue',
    author: 'Jane Smith <jane@example.com>',
    timestamp: new Date().toISOString()
  },
  {
    hash: 'ghi789012345',
    message: 'docs: Update README with installation instructions',
    author: 'Bob Johnson <bob@example.com>',
    timestamp: new Date().toISOString()
  }
];

console.log('\n📝 Testing commit formatting:\n');

const handler = new CommitHandler('dummy-key');

// Access the private method through prototype for testing
const formatMethod = handler.constructor.prototype.formatWithTemplate;

testCommits.forEach(commit => {
  console.log(`\nCommit: ${commit.message}`);
  console.log('---');
  
  // We can't directly call private methods, so let's simulate what would happen
  const pattern = new RegExp(templateConfig.parsePattern);
  const match = commit.message.match(pattern);
  
  if (match && match.groups) {
    const type = match.groups.type;
    const mappedType = templateConfig.typeMapping[type] || type;
    console.log(`Type: ${type} → ${mappedType}`);
    console.log(`Scope: ${match.groups.scope || 'none'}`);
    console.log(`Description: ${match.groups.description}`);
    
    // Show what the title would look like
    const template = templateConfig.templates[templateConfig.defaultTemplate];
    const title = template.title
      .replace('{type}', mappedType)
      .replace('{description}', match.groups.description || commit.message);
    console.log(`\nFormatted title: ${title}`);
  }
});

console.log('\n✨ Template testing complete!');