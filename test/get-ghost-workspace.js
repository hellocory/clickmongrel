import ClickUpAPI from '../dist/utils/clickup-api.js';

const api = new ClickUpAPI('pk_138190514_O3WELFAWWV5OHNYNZBZVVLRH2D5FO4RK');

async function getWorkspaceInfo() {
  try {
    const teams = await api.getTeams();
    
    for (const team of teams) {
      console.log(`Workspace: ${team.name} (ID: ${team.id})`);
      
      if (team.name === "Ghost Codes's Workspace") {
        console.log('\n✓ Found Ghost Codes Workspace!');
        console.log('Workspace ID:', team.id);
        
        // Get spaces in this workspace
        const spaces = await api.getSpaces(team.id);
        console.log('\nSpaces in Ghost Codes Workspace:');
        for (const space of spaces) {
          console.log(`  - ${space.name} (ID: ${space.id})`);
        }
        
        // Check if Agentic Development exists
        const agenticSpace = spaces.find(s => 
          s.name === 'Agentic Development' || 
          s.name.toLowerCase().includes('agentic')
        );
        
        if (agenticSpace) {
          console.log('\n✓ Agentic Development space exists!');
          console.log('Space ID:', agenticSpace.id);
        } else {
          console.log('\n✗ Agentic Development space not found');
          console.log('Run quick-setup with workspace ID:', team.id);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getWorkspaceInfo();