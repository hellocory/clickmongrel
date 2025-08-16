#!/usr/bin/env node

import SyncHandler from '../../dist/handlers/sync.js';
import { TaskAnalyzer } from '../../dist/utils/task-analyzer.js';

const API_KEY = process.env.CLICKUP_API_KEY;
const TASKS_LIST_ID = '901317936119';

async function testEnhancedTracking() {
    console.log('🧪 Testing Enhanced Time Tracking and Tagging\n');
    
    if (!API_KEY) {
        console.error('❌ CLICKUP_API_KEY not found in environment');
        return;
    }
    
    try {
        // Test task analyzer
        console.log('1️⃣ Testing Task Analyzer...');
        
        const testTodos = [
            {
                id: 'enhanced-1',
                content: 'Fix critical bug in authentication system',
                status: 'pending'
            },
            {
                id: 'enhanced-2', 
                content: 'Implement new user dashboard with React components',
                status: 'in_progress',
                started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // Started 30 min ago
            },
            {
                id: 'enhanced-3',
                content: 'Quick documentation update for API endpoints',
                status: 'completed',
                started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
                completed_at: new Date().toISOString()
            }
        ];
        
        testTodos.forEach(todo => {
            const analyzed = TaskAnalyzer.analyzeTodo(todo);
            console.log(`\n📋 Original: "${todo.content}"`);
            console.log(`   Title: "${analyzed.title}"`);
            console.log(`   Category: ${analyzed.category}`);
            console.log(`   Tags: ${analyzed.tags?.join(', ')}`);
            console.log(`   Priority: ${analyzed.priority}`);
            console.log(`   Estimated: ${analyzed.estimated_time ? TaskAnalyzer.formatDuration(analyzed.estimated_time) : 'none'}`);
            
            if (analyzed.actual_time) {
                console.log(`   Actual: ${TaskAnalyzer.formatDuration(analyzed.actual_time)}`);
                if (analyzed.estimated_time) {
                    const efficiency = TaskAnalyzer.calculateEfficiency(analyzed.estimated_time, analyzed.actual_time);
                    console.log(`   Efficiency: ${efficiency}%`);
                }
            }
        });
        
        // Test sync with enhanced data
        console.log('\n\n2️⃣ Testing Enhanced Sync...');
        const syncHandler = new SyncHandler(API_KEY, TASKS_LIST_ID);
        await syncHandler.initialize();
        
        const syncTodo = {
            id: 'enhanced-sync-test',
            content: 'Test comprehensive task tracking with TypeScript integration',
            status: 'pending'
        };
        
        console.log('\nSyncing enhanced todo...');
        await syncHandler.syncTodos([syncTodo]);
        
        console.log('✅ Enhanced tracking test completed!');
        console.log('Check ClickUp to see the rich task description with metadata.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

testEnhancedTracking();