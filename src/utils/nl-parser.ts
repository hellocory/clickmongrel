/**
 * Natural language parser for setup commands
 */

export interface ParsedSetupCommand {
  workspace?: string;
  space?: string;
  raw: string;
}

export class NaturalLanguageParser {
  /**
   * Parse natural language setup command to extract workspace and space names
   * 
   * Examples:
   * - "ghost codes workspace" -> { workspace: "ghost codes workspace" }
   * - "ghost codes workspace in the test space" -> { workspace: "ghost codes workspace", space: "test space" }
   * - "setup in ohriv workspace in agentic development" -> { workspace: "ohriv workspace", space: "agentic development" }
   * - "my workspace called gridflux in space production" -> { workspace: "gridflux", space: "production" }
   */
  static parseSetupCommand(input: string): ParsedSetupCommand {
    const result: ParsedSetupCommand = { raw: input };
    
    // Normalize input - lowercase, trim, remove extra spaces
    let normalized = input.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Remove common prefixes that don't add meaning
    normalized = normalized
      .replace(/^setup\s+(clickmongrel\s+)?/i, '')
      .replace(/^(with|using|in|for)\s+/i, '')
      .replace(/^the\s+/i, '');
    
    // Pattern 1: "X workspace in Y space" or "X workspace in the Y space"
    let match = normalized.match(/^(.+?)\s+workspace\s+(?:in|into|to)\s+(?:the\s+)?(.+?)(?:\s+space)?$/);
    if (match && match[1] && match[2]) {
      result.workspace = this.cleanWorkspaceName(match[1] + ' workspace');
      result.space = this.cleanSpaceName(match[2]);
      return result;
    }
    
    // Pattern 2: "X in Y space" (X is workspace, Y is space)
    match = normalized.match(/^(.+?)\s+(?:in|into|to)\s+(?:the\s+)?(.+?)(?:\s+space)?$/);
    if (match && match[1] && match[2] && !match[1].includes('space')) {
      result.workspace = this.cleanWorkspaceName(match[1]);
      result.space = this.cleanSpaceName(match[2]);
      return result;
    }
    
    // Pattern 3: "workspace X in space Y" or "workspace called X in space Y"
    match = normalized.match(/workspace\s+(?:called\s+|named\s+)?(.+?)\s+(?:in|into|to)\s+(?:the\s+)?(?:space\s+)?(.+)$/);
    if (match && match[1] && match[2]) {
      result.workspace = this.cleanWorkspaceName(match[1]);
      result.space = this.cleanSpaceName(match[2]);
      return result;
    }
    
    // Pattern 4: Just workspace (no space specified)
    // Could be "X workspace" or "workspace X" or just "X"
    if (normalized.includes('workspace')) {
      // Remove the word workspace and use what's left
      const workspaceName = normalized.replace(/\s*workspace\s*/g, ' ').trim();
      if (workspaceName) {
        result.workspace = this.cleanWorkspaceName(workspaceName + ' workspace');
      }
    } else {
      // No 'workspace' keyword - assume entire input is workspace name
      result.workspace = this.cleanWorkspaceName(normalized);
    }
    
    return result;
  }
  
  /**
   * Clean and format workspace name
   */
  private static cleanWorkspaceName(name: string): string {
    // Remove extra whitespace
    let cleaned = name.trim().replace(/\s+/g, ' ');
    
    // Remove trailing 's from possessives if followed by workspace
    cleaned = cleaned.replace(/(['']s)\s+workspace$/i, ' workspace');
    
    // Ensure it ends with 'workspace' for consistency (unless it already does)
    if (!cleaned.toLowerCase().endsWith('workspace')) {
      cleaned = cleaned + ' workspace';
    }
    
    // Capitalize properly (title case)
    return cleaned.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Clean and format space name
   */
  private static cleanSpaceName(name: string): string {
    // Remove extra whitespace
    let cleaned = name.trim().replace(/\s+/g, ' ');
    
    // Remove the word 'space' if it's at the end
    cleaned = cleaned.replace(/\s+space$/i, '');
    
    // Remove possessives
    cleaned = cleaned.replace(/(['']s)(\s|$)/g, '$2');
    
    // Capitalize properly (title case)
    return cleaned.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Test the parser with various inputs
   */
  static test(): void {
    const testCases = [
      'ghost codes workspace',
      'ghost codes workspace in the test space',
      'setup clickmongrel with ghost codes workspace',
      'setup clickmongrel in ghost codes workspace in the test space',
      'ohriv workspace in agentic development',
      'workspace gridflux in space production',
      'my workspace called soundways in the music space',
      'setup in ghost codes workspace',
      'ghost codes in test environment',
      'just ghost codes',
    ];
    
    console.log('Natural Language Parser Test Results:\n');
    testCases.forEach(input => {
      const result = this.parseSetupCommand(input);
      console.log(`Input:  "${input}"`);
      console.log(`Result: workspace="${result.workspace}", space="${result.space}"`);
      console.log('---');
    });
  }
}

// Allow testing directly
if (process.argv[1]?.endsWith('nl-parser.ts') || process.argv[1]?.endsWith('nl-parser.js')) {
  NaturalLanguageParser.test();
}