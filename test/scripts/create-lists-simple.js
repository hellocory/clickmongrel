import ClickUpAPI from '../../dist/utils/clickup-api.js';
import chalk from 'chalk';

const api = new ClickUpAPI(process.env.CLICKUP_API_KEY);
const AGENTIC_SPACE_ID = '90139256189';

async function createLists() {
  try {
    console.log(chalk.cyan.bold('\n🚀 Creating Lists in Agentic Development Space\n'));
    
    // Create lists without custom statuses - just the basic list
    const lists = [
      { 
        name: 'Tasks',
        content: 'Development tasks from TodoWrite'
      },
      { 
        name: 'Commits',
        content: 'Git commit tracking'
      }
    ];
    
    for (const list of lists) {
      try {
        // Using makeRequest directly like quick-setup does
        const newList = await api.makeRequest(
          `/space/${AGENTIC_SPACE_ID}/list`,
          'POST',
          {
            name: list.name,
            content: list.content
          }
        );
        console.log(chalk.green(`✓ Created list: ${list.name} (ID: ${newList.id})`));
      } catch (error) {
        console.log(chalk.yellow(`⚠ Could not create list ${list.name}: ${error.message}`));
        if (error.response?.data) {
          console.log(chalk.red('Details:'), JSON.stringify(error.response.data, null, 2));
        }
      }
    }
    
    // Get all lists to verify
    const allLists = await api.getLists(AGENTIC_SPACE_ID);
    console.log(chalk.cyan('\n📋 All lists in space:'));
    for (const list of allLists) {
      console.log(`  - ${list.name} (ID: ${list.id})`);
    }
    
    const tasksList = allLists.find(l => l.name === 'Tasks');
    const commitsList = allLists.find(l => l.name === 'Commits');
    
    if (tasksList && commitsList) {
      console.log(chalk.green.bold('\n✅ Lists created successfully!'));
      console.log(chalk.yellow('\n📝 Run quick-setup to complete configuration:'));
      console.log(chalk.cyan(`node dist/cli.js quick-setup --space ${AGENTIC_SPACE_ID}`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    throw error;
  }
}

createLists();