#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const listId = '901317936119'; // Tasks list in Agentic Development

console.log('\nChecking statuses for Tasks list...\n');

const statuses = await api.getListStatuses(listId);
console.log('Statuses response:', statuses);