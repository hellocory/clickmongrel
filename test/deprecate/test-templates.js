#!/usr/bin/env node
import configManager from '../../dist/config/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testTemplates() {
  console.log('🧪 Testing Template System\n');
  
  try {
    // Test loading default templates
    console.log('1️⃣ Testing template loading...');
    const taskTemplate = configManager.loadTemplate('task_creation');
    const dailyTemplate = configManager.loadTemplate('daily_report');
    const futureTemplate = configManager.loadTemplate('future_tasks');
    
    console.log('✓ Task creation template loaded:', taskTemplate.substring(0, 50) + '...');
    console.log('✓ Daily report template loaded:', dailyTemplate.substring(0, 50) + '...');
    console.log('✓ Future tasks template loaded:', futureTemplate.substring(0, 50) + '...');
    
    // Test assignee configuration
    console.log('\n2️⃣ Testing assignee configuration...');
    console.log('✓ Auto-assign enabled:', configManager.shouldAutoAssignUser());
    console.log('✓ Assignee user ID:', configManager.getAssigneeUserId());
    
    // Test creating templates directory
    console.log('\n3️⃣ Creating templates directory...');
    const templatesDir = path.join(__dirname, '../templates');
    
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
      console.log('✓ Templates directory created');
    } else {
      console.log('✓ Templates directory already exists');
    }
    
    // Create template files
    const templateFiles = [
      { name: 'task_creation.md', content: configManager.loadTemplate('task_creation') },
      { name: 'subtask_creation.md', content: configManager.loadTemplate('subtask_creation') },
      { name: 'future_tasks.md', content: configManager.loadTemplate('future_tasks') },
      { name: 'daily_report.md', content: configManager.loadTemplate('daily_report') },
      { name: 'weekly_report.md', content: configManager.loadTemplate('weekly_report') }
    ];

    for (const template of templateFiles) {
      const templatePath = path.join(templatesDir, template.name);
      if (!fs.existsSync(templatePath)) {
        fs.writeFileSync(templatePath, template.content);
        console.log(`✓ Created template: ${template.name}`);
      } else {
        console.log(`~ Template exists: ${template.name}`);
      }
    }
    
    console.log('\n4️⃣ Testing variable substitution...');
    
    // Mock todo item
    const mockTodo = {
      id: 'test-template-123',
      content: 'Implement advanced template system with variable substitution',
      title: 'Template System Enhancement',
      category: 'feature',
      priority: 'high',
      tags: ['template', 'enhancement', 'system'],
      estimated_time: 1800000, // 30 minutes
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    
    // Test template variable substitution
    const template = configManager.loadTemplate('task_creation');
    const templateVars = {
      title: mockTodo.title || mockTodo.content,
      description: mockTodo.content || '',
      category: mockTodo.category || 'general',
      priority: mockTodo.priority || 'normal',
      estimated_time: '30 minutes',
      tags: mockTodo.tags ? mockTodo.tags.join(', ') : 'None',
      created_at: new Date(mockTodo.created_at).toLocaleString(),
      todo_id: mockTodo.id
    };
    
    let processedTemplate = template;
    Object.entries(templateVars).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedTemplate = processedTemplate.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value.toString());
    });
    
    console.log('✓ Template processing test:');
    console.log(processedTemplate);
    
    console.log('\n🎉 All template tests passed!\n');
    
  } catch (error) {
    console.error('❌ Template test failed:', error);
    process.exit(1);
  }
}

testTemplates();