#!/usr/bin/env node
import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const listId = '901317936119';

console.log(chalk.cyan('Testing getCustomFields:'));
try {
  const fields = await api.getCustomFields(listId);
  console.log('Fields returned:', fields);
} catch (error) {
  console.log('Error:', error.message);
}

console.log(chalk.cyan('\nTesting getList:'));
try {
  const list = await api.getList(listId);
  console.log('List has custom_fields?', !!list.custom_fields);
  if (list.custom_fields) {
    console.log('Custom fields from getList:', list.custom_fields);
  }
} catch (error) {
  console.log('Error:', error.message);
}