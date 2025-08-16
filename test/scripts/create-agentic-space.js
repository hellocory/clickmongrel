import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const GHOST_WORKSPACE_ID = '90131285250';

async function createAgenticDevelopmentSpace() {
  try {
    console.log(chalk.cyan.bold('\n🚀 Creating Agentic Development Space in Ghost Codes Workspace\n'));
    
    // Step 1: Verify workspace
    const teams = await api.getTeams();
    const workspace = teams.find(t => t.id === GHOST_WORKSPACE_ID);
    console.log(chalk.green(`✓ Using workspace: ${workspace.name}`));
    
    // Step 2: Check if space already exists
    const spaces = await api.getSpaces(GHOST_WORKSPACE_ID);
    const existingSpace = spaces.find(s => 
      s.name === 'Agentic Development' || 
      s.name.toLowerCase().includes('agentic')
    );
    
    if (existingSpace) {
      console.log(chalk.yellow(`Space already exists: ${existingSpace.name}`));
      return existingSpace;
    }
    
    // Step 3: Create the Agentic Development space
    console.log(chalk.cyan('Creating Agentic Development space...'));
    const newSpace = await api.createSpace(GHOST_WORKSPACE_ID, {
      name: 'Agentic Development',
      multiple_assignees: true,
      features: {
        due_dates: {
          enabled: true,
          start_date: true,
          remap_due_dates: false,
          remap_closed_due_date: false
        },
        time_tracking: { enabled: true },
        tags: { enabled: true },
        time_estimates: { enabled: true },
        checklists: { enabled: true },
        custom_fields: { enabled: true },
        remap_dependencies: { enabled: false },
        dependency_warning: { enabled: true },
        portfolios: { enabled: true },
        emails: { enabled: true }
      }
    });
    
    console.log(chalk.green(`✓ Created space: ${newSpace.name} (ID: ${newSpace.id})`));
    
    // Step 4: Create lists
    console.log(chalk.cyan('\nCreating lists...'));
    
    const lists = [
      { name: 'Tasks', description: 'Development tasks from TodoWrite' },
      { name: 'Commits', description: 'Git commit tracking' }
    ];
    
    for (const list of lists) {
      try {
        const newList = await api.createList(newSpace.id, {
          name: list.name,
          content: list.description,
          status: 'active',
          priority: 1
        });
        console.log(chalk.green(`  ✓ Created list: ${list.name} (ID: ${newList.id})`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not create list ${list.name}: ${error.message}`));
      }
    }
    
    // Step 5: Create folders
    console.log(chalk.cyan('\nCreating folders...'));
    
    const folders = [
      { name: 'Weekly Reports', description: 'Weekly development reports' },
      { name: 'Daily Reports', description: 'Daily progress updates' },
      { name: 'Documentation', description: 'Project documentation' }
    ];
    
    for (const folder of folders) {
      try {
        const newFolder = await api.createFolder(newSpace.id, {
          name: folder.name
        });
        console.log(chalk.green(`  ✓ Created folder: ${folder.name} (ID: ${newFolder.id})`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not create folder ${folder.name}: ${error.message}`));
      }
    }
    
    // Step 6: Create custom statuses for Commits list
    console.log(chalk.cyan('\nSetting up Commits list statuses...'));
    
    // Get the Commits list
    const allLists = await api.getLists(newSpace.id);
    const commitsList = allLists.find(l => l.name === 'Commits');
    
    if (commitsList) {
      const commitStatuses = [
        { status: 'development update', color: '#5b9fd6', orderindex: 0 },
        { status: 'development push', color: '#f9d900', orderindex: 1 },
        { status: 'upstream merge', color: '#ff7fab', orderindex: 2 },
        { status: 'merged', color: '#6bc950', orderindex: 3 }
      ];
      
      console.log(chalk.gray('  Note: Custom statuses must be added manually in ClickUp'));
      console.log(chalk.gray('  Recommended statuses for Commits list:'));
      commitStatuses.forEach(s => {
        console.log(chalk.gray(`    - ${s.status}`));
      });
    }
    
    console.log(chalk.green.bold('\n✅ Agentic Development space created successfully!\n'));
    console.log('Space ID:', newSpace.id);
    console.log('Tasks List ID:', allLists.find(l => l.name === 'Tasks')?.id);
    console.log('Commits List ID:', commitsList?.id);
    
    return newSpace;
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    throw error;
  }
}

createAgenticDevelopmentSpace();