#!/usr/bin/env node

import { ClickUpAPI } from '../dist/utils/clickup-api.js';

const API_KEY = 'pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK';
const api = new ClickUpAPI(API_KEY);

async function test() {
  const teams = await api.getTeams();
  const workspace = teams[0];
  const spaces = await api.getSpaces(workspace.id);
  const space = spaces[0];
  const lists = await api.getLists(space.id);
  const list = lists[0];
  
  console.log('Getting list details for:', list.name);
  const listDetails = await api.getList(list.id);
  console.log('List structure:', JSON.stringify(listDetails, null, 2));
}

test().catch(console.error);