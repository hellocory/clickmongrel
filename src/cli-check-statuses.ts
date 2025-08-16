#!/usr/bin/env node
import chalk from 'chalk';
import { StatusValidator } from './utils/status-validator.js';
import * as fs from 'fs';
import * as path from 'path';

async function checkStatuses() {
  console.log(chalk.cyan.bold('\n🔍 ClickMongrel Status Configuration Check\n'));
  
  // Load config
  const configPath = path.join(process.cwd(), '.claude/clickup/config.json');
  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('❌ No configuration found. Run quick-setup first.'));
    process.exit(1);
  }
  
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to read configuration.'));
    process.exit(1);
  }
  
  const apiKey = config.apiKey || process.env.CLICKUP_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('❌ No API key found.'));
    process.exit(1);
  }
  
  const tasksListId = config.lists?.tasks;
  const commitsListId = config.lists?.commits;
  
  if (!tasksListId || !commitsListId) {
    console.error(chalk.red('❌ List IDs not configured. Run quick-setup first.'));
    process.exit(1);
  }
  
  const validator = new StatusValidator(apiKey);
  
  console.log(chalk.yellow('Checking Tasks list statuses...'));
  try {
    const tasksResult = await validator.validateListStatuses(tasksListId, 'tasks');
    if (tasksResult.valid) {
      console.log(chalk.green('✅ Tasks list statuses are properly configured!'));
      console.log(chalk.gray(`   Configured: ${tasksResult.configured.join(', ')}`));
      if (tasksResult.missingOptional.length > 0) {
        console.log(chalk.yellow(`   Optional missing: ${tasksResult.missingOptional.join(', ')}`));
      }
    }
  } catch (error: any) {
    console.log(chalk.red('❌ Tasks list statuses NOT configured properly'));
    // Error message already displayed by validator
  }
  
  console.log('');
  console.log(chalk.yellow('Checking Commits list statuses...'));
  try {
    const commitsResult = await validator.validateListStatuses(commitsListId, 'commits');
    if (commitsResult.valid) {
      console.log(chalk.green('✅ Commits list statuses are properly configured!'));
      console.log(chalk.gray(`   Configured: ${commitsResult.configured.join(', ')}`));
      if (commitsResult.missingOptional.length > 0) {
        console.log(chalk.yellow(`   Optional missing: ${commitsResult.missingOptional.join(', ')}`));
      }
    }
  } catch (error: any) {
    console.log(chalk.red('❌ Commits list statuses NOT configured properly'));
    // Error message already displayed by validator
  }
  
  // Overall summary
  console.log(chalk.cyan.bold('\n📊 Summary\n'));
  
  const allResult = await validator.validateAllLists(tasksListId, commitsListId);
  
  if (allResult.canProceed) {
    console.log(chalk.green.bold('✅ All required statuses are configured!'));
    console.log(chalk.green('You can now use ClickMongrel to sync tasks and commits.'));
  } else {
    console.log(chalk.red.bold('❌ Status configuration incomplete!'));
    console.log(chalk.red('You must configure the missing statuses before using ClickMongrel.'));
    console.log('');
    console.log(chalk.yellow('See .claude/clickup/STATUS_SETUP_GUIDE.md for instructions.'));
  }
  
  process.exit(allResult.canProceed ? 0 : 1);
}

export default checkStatuses;

if (import.meta.url === `file://${process.argv[1]}`) {
  checkStatuses().catch(error => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
}