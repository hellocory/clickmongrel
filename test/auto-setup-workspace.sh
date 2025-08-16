#!/bin/bash

# Navigate to Ghost Codes's Workspace and create/configure Agentic Development space
# Using printf to send arrow keys and enter to select Ghost Codes's Workspace

# Arrow down twice to get to Ghost Codes's Workspace, then Enter
# Then select "Create new space" or use existing if prompted
echo -e "\033[B\033[B\n" | node dist/setup-workspace.js