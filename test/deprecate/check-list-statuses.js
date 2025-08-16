#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const statuses = await api.getListStatuses('901317936119');
console.log('Available statuses:');
statuses.forEach(s => console.log('  -', s.status));