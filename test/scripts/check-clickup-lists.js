import ClickUpAPI from '../../dist/utils/clickup-api.js';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);

async function checkWorkspace() {
  try {
    // Get workspace
    const workspaces = await api.getTeams();
    const workspace = workspaces.find(w => w.name === "Ghost Codes's Workspace");
    console.log('=== Ghost Codes Workspace ===');
    console.log('Workspace ID:', workspace.id);
    
    // Get spaces
    const spaces = await api.getSpaces(workspace.id);
    console.log('\nSpaces found:', spaces.length);
    
    for (const space of spaces) {
      console.log('\n--- Space: ' + space.name + ' (ID: ' + space.id + ') ---');
      
      // Get lists in this space
      const lists = await api.getLists(space.id);
      console.log('Lists in this space:', lists.length);
      
      for (const list of lists) {
        console.log('  - ' + list.name + ' (ID: ' + list.id + ')');
        
        // Get statuses for this list
        try {
          const statuses = await api.getListStatuses(list.id);
          if (statuses && statuses.length > 0) {
            console.log('    Statuses:');
            for (const status of statuses) {
              console.log('      - ' + status.status);
            }
          }
        } catch (e) {
          console.log('    Could not get statuses');
        }
        
        // Check if this is the list where our test tasks were created
        if (list.id === '901317936119') {
          console.log('    *** This is where test tasks were created! ***');
          
          // Get tasks in this list
          const tasks = await api.getTasks(list.id);
          console.log('    Tasks in list:', tasks.length);
          for (const task of tasks.slice(0, 5)) {
            console.log('      - ' + task.name + ' (Status: ' + task.status.status + ')');
          }
        }
      }
    }
    
    // Also check for "Agentic Development" or similar lists that should have been created
    console.log('\n=== Looking for expected ClickMongrel structure ===');
    const expectedListNames = ['Tasks', 'Commits', 'Goals', 'Agentic Development', 'Development Tasks'];
    
    for (const space of spaces) {
      const lists = await api.getLists(space.id);
      for (const expectedName of expectedListNames) {
        const found = lists.find(l => l.name.includes(expectedName));
        if (found) {
          console.log('✓ Found "' + expectedName + '" as "' + found.name + '" in space "' + space.name + '"');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkWorkspace();