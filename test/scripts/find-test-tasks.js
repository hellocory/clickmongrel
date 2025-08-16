import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);

async function findTestTasks() {
  try {
    // The list ID where our test tasks were created
    const testListId = '901317936119';
    
    console.log('Looking for list ID:', testListId);
    
    // Get all workspaces
    const workspaces = await api.getTeams();
    
    for (const workspace of workspaces) {
      const spaces = await api.getSpaces(workspace.id);
      
      for (const space of spaces) {
        const lists = await api.getLists(space.id);
        
        for (const list of lists) {
          if (list.id === testListId) {
            console.log('\n✓ FOUND THE LIST!');
            console.log('Workspace:', workspace.name);
            console.log('Space:', space.name); 
            console.log('List:', list.name);
            console.log('List ID:', list.id);
            
            // Get tasks in this list
            const tasks = await api.getTasks(list.id);
            console.log('\nTasks in this list:', tasks.length);
            
            for (const task of tasks) {
              console.log('  - ' + task.name + ' (Status: ' + task.status.status + ', ID: ' + task.id + ')');
            }
            
            return;
          }
        }
      }
    }
    
    console.log('List not found in any workspace!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findTestTasks();