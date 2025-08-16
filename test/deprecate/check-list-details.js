#!/usr/bin/env node

import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const listId = '901317936119'; // Tasks list in Agentic Development

console.log('\nFetching list details...\n');

const list = await api.getList(listId);
console.log('List object keys:', Object.keys(list));
console.log('\nList statuses:', list.statuses);
console.log('\nList status:', list.status);