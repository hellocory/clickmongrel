#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);

console.log(chalk.cyan('Checking Commits list statuses...'));

const statuses = await api.getListStatuses('901317936118');

console.log(`\nFound ${statuses.length} statuses in Commits list:`);
statuses.forEach(s => {
  console.log(`  - ${s.status} (${s.type})`);
});