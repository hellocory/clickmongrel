#!/bin/bash

# Full automated setup for Ghost Codes's Workspace
# Arrow down twice to select Ghost Codes's Workspace
# Enter to accept default "Agentic Development" name
# y to create folders
# y to create lists

printf "\033[B\033[B\n\ny\ny\n" | node dist/setup-workspace.js