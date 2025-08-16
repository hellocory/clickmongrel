#!/usr/bin/env node
import configManager from '../../dist/config/index.js';
import ClickUpAPI from '../../dist/utils/clickup-api.js';

async function checkConfig() {
  const config = configManager.getConfig();
  console.log('Auto-assign enabled:', config.clickup.auto_assign_user);
  console.log('Assignee ID:', config.clickup.assignee_user_id);
  
  // Get current user
  const apiKey = process.env.CLICKUP_API_KEY;
  if (apiKey) {
    const api = new ClickUpAPI(apiKey);
    const user = await api.getCurrentUser();
    console.log('Current user ID:', user.id);
    console.log('Current user name:', user.username);
  }
}

checkConfig().catch(console.error);