import ClickUpAPI from './clickup-api.js';
import logger from './logger.js';
import { ClickUpTeam, ClickUpSpace, ClickUpList } from '../types/index.js';

export class WorkspaceResolver {
  private api: ClickUpAPI;

  constructor(apiKey: string) {
    this.api = new ClickUpAPI(apiKey);
  }

  /**
   * Find workspace by name with fuzzy matching
   */
  async findWorkspaceByName(searchName: string): Promise<ClickUpTeam | null> {
    try {
      const teams = await this.api.getTeams();
      
      if (!teams || teams.length === 0) {
        logger.error('No workspaces found');
        return null;
      }

      // First try exact match (case insensitive)
      const exactMatch = teams.find(t => 
        t.name.toLowerCase() === searchName.toLowerCase()
      );
      
      if (exactMatch) {
        logger.info(`Found exact workspace match: ${exactMatch.name}`);
        return exactMatch;
      }

      // Try partial match (contains)
      const partialMatches = teams.filter(t => 
        t.name.toLowerCase().includes(searchName.toLowerCase()) ||
        searchName.toLowerCase().includes(t.name.toLowerCase())
      );

      if (partialMatches.length === 1) {
        const match = partialMatches[0];
        if (match) {
          logger.info(`Found workspace by partial match: ${match.name}`);
          return match;
        }
      }

      if (partialMatches.length > 1) {
        // Try to find best match by similarity
        const bestMatch = this.findBestMatch(searchName, partialMatches);
        if (bestMatch) {
          logger.info(`Found workspace by best match: ${bestMatch.name}`);
          return bestMatch;
        }
      }

      // Try fuzzy match with common variations
      const variations = this.generateVariations(searchName);
      for (const variation of variations) {
        const match = teams.find(t => 
          t.name.toLowerCase() === variation.toLowerCase()
        );
        if (match) {
          logger.info(`Found workspace by variation match: ${match.name}`);
          return match;
        }
      }

      // If only one workspace exists, use it
      if (teams.length === 1) {
        const singleTeam = teams[0];
        if (singleTeam) {
          logger.info(`Only one workspace exists, using: ${singleTeam.name}`);
          return singleTeam;
        }
      }

      logger.warn(`Could not find workspace matching "${searchName}"`);
      logger.info(`Available workspaces: ${teams.map(t => t.name).join(', ')}`);
      return null;

    } catch (error) {
      logger.error('Error finding workspace:', error);
      return null;
    }
  }

  /**
   * Find or create Agentic Development space
   */
  async findOrCreateAgenticSpace(workspaceId: string): Promise<ClickUpSpace | null> {
    try {
      const spaces = await this.api.getSpaces(workspaceId);
      
      // Look for Agentic Development or similar
      const agenticSpace = spaces.find(s => 
        s.name === 'Agentic Development' ||
        s.name.toLowerCase().includes('agentic') ||
        s.name.toLowerCase().includes('development')
      );

      if (agenticSpace) {
        logger.info(`Found existing space: ${agenticSpace.name}`);
        return agenticSpace;
      }

      // Create Agentic Development space
      logger.info('Creating Agentic Development space...');
      const newSpace = await this.api.createSpace(workspaceId, {
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
          portfolios: { enabled: true }
        }
      });

      logger.info(`Created space: ${newSpace.name}`);
      return newSpace;

    } catch (error) {
      logger.error('Error finding/creating space:', error);
      return null;
    }
  }

  /**
   * Find or create standard lists (Tasks, Commits)
   */
  async findOrCreateLists(spaceId: string): Promise<{ tasks: ClickUpList | null, commits: ClickUpList | null }> {
    try {
      const lists = await this.api.getLists(spaceId);
      
      let tasksList = lists.find(l => 
        l.name === 'Tasks' || 
        l.name.toLowerCase().includes('task')
      );

      let commitsList = lists.find(l => 
        l.name === 'Commits' || 
        l.name.toLowerCase().includes('commit')
      );

      // Create missing lists
      if (!tasksList) {
        logger.info('Creating Tasks list...');
        tasksList = await this.api.createList(spaceId, {
          name: 'Tasks',
          content: 'Development tasks from TodoWrite'
        });
      }

      if (!commitsList) {
        logger.info('Creating Commits list...');
        commitsList = await this.api.createList(spaceId, {
          name: 'Commits',
          content: 'Git commit tracking'
        });
      }

      return { tasks: tasksList, commits: commitsList };

    } catch (error) {
      logger.error('Error finding/creating lists:', error);
      return { tasks: null, commits: null };
    }
  }

  /**
   * Full workspace setup from name
   */
  async setupFromWorkspaceName(workspaceName: string): Promise<{
    workspace: ClickUpTeam | null,
    space: ClickUpSpace | null,
    lists: { tasks: ClickUpList | null, commits: ClickUpList | null }
  }> {
    // Find workspace
    const workspace = await this.findWorkspaceByName(workspaceName);
    if (!workspace) {
      return { workspace: null, space: null, lists: { tasks: null, commits: null } };
    }

    // Find or create Agentic Development space
    const space = await this.findOrCreateAgenticSpace(workspace.id);
    if (!space) {
      return { workspace, space: null, lists: { tasks: null, commits: null } };
    }

    // Find or create lists
    const lists = await this.findOrCreateLists(space.id);

    return { workspace, space, lists };
  }

  /**
   * Generate name variations for matching
   */
  private generateVariations(name: string): string[] {
    const variations: string[] = [];
    
    // Remove common suffixes
    variations.push(name.replace(/['']s\s+workspace$/i, ''));
    variations.push(name.replace(/\s+workspace$/i, ''));
    variations.push(name.replace(/['']s$/i, ''));
    
    // If name ends with "workspace", try adding possessive
    if (name.toLowerCase().endsWith('workspace')) {
      const base = name.replace(/\s+workspace$/i, '').trim();
      variations.push(`${base}'s Workspace`);
      variations.push(`${base}s Workspace`);
      variations.push(`${base}'s Workspace`);
    }
    
    // Add common suffixes
    variations.push(`${name} Workspace`);
    variations.push(`${name}'s Workspace`);
    variations.push(`${name}s Workspace`);
    
    // Handle special characters
    variations.push(name.replace(/['']/g, ''));
    variations.push(name.replace(/['']/g, "'"));
    
    // Handle "X workspace" -> "X's workspace" pattern
    if (name.toLowerCase().includes(' workspace') && !name.includes("'")) {
      const parts = name.split(/\s+workspace/i);
      if (parts[0]) {
        variations.push(`${parts[0]}'s Workspace`);
        variations.push(`${parts[0]}'s Workspace`);
      }
    }
    
    return [...new Set(variations)]; // Remove duplicates
  }

  /**
   * Find best match from multiple options
   */
  private findBestMatch(searchName: string, options: ClickUpTeam[]): ClickUpTeam | null {
    let bestMatch: ClickUpTeam | null = null;
    let bestScore = 0;

    for (const option of options) {
      const score = this.calculateSimilarity(searchName.toLowerCase(), option.name.toLowerCase());
      if (score > bestScore) {
        bestScore = score;
        bestMatch = option;
      }
    }

    // Require at least 50% similarity
    return bestScore >= 0.5 ? bestMatch : null;
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
}