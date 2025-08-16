#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const task = await api.getTask('86ab17zec');
console.log('Task name:', task.name);
console.log('Custom fields on task:', JSON.stringify(task.custom_fields, null, 2));