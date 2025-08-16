import ClickUpAPI from '../dist/utils/clickup-api.js';

const api = new ClickUpAPI('pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK');

async function checkWorkspace() {
  try {
    // Get workspace
    const workspaces = await api.getTeams();
    const workspace = workspaces.find(w => w.name === "Ghost Codes's Workspace");
    console.log('Workspace ID:', workspace.id);
    console.log('Workspace Name:', workspace.name);
    
    // Get spaces
    const spaces = await api.getSpaces(workspace.id);
    console.log('\nSpaces in workspace:');
    for (const space of spaces) {
      console.log('  - ' + space.name + ' (ID: ' + space.id + ')');
      
      // Get folders
      const folders = await api.getFolders(space.id);
      if (folders.length > 0) {
        console.log('    Folders:');
        for (const folder of folders) {
          console.log('      - ' + folder.name + ' (ID: ' + folder.id + ')');
          
          // Get lists in folder
          const folderLists = await api.getListsInFolder(folder.id);
          if (folderLists.length > 0) {
            console.log('        Lists in folder:');
            for (const list of folderLists) {
              console.log('          - ' + list.name + ' (ID: ' + list.id + ')');
            }
          }
        }
      }
      
      // Get lists (not in folders)
      const lists = await api.getLists(space.id);
      if (lists.length > 0) {
        console.log('    Lists (not in folders):');
        for (const list of lists) {
          console.log('      - ' + list.name + ' (ID: ' + list.id + ')');
        }
      }
    }
    
    // Check for specific expected structure
    console.log('\n=== Expected Structure Check ===');
    const expectedFolders = ['Agentic Development', 'Reports', 'Documentation'];
    const expectedLists = ['Tasks', 'Commits', 'Goals'];
    
    for (const space of spaces) {
      console.log('\nSpace: ' + space.name);
      const folders = await api.getFolders(space.id);
      const lists = await api.getLists(space.id);
      
      for (const expected of expectedFolders) {
        const found = folders.find(f => f.name === expected);
        console.log('  Folder "' + expected + '": ' + (found ? '✓ Found' : '✗ Missing'));
      }
      
      for (const expected of expectedLists) {
        const found = lists.find(l => l.name === expected);
        console.log('  List "' + expected + '": ' + (found ? '✓ Found' : '✗ Missing'));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkWorkspace();