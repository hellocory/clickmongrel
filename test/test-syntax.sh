#!/bin/bash

# Test the problematic section
cleanup() {
    echo "In cleanup"
    read -p "Do you want to clean up test data? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleaning up..."
    fi
}

cleanup