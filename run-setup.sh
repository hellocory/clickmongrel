#!/bin/bash
# Run setup with Ghost Codes's Workspace

# Create a temporary expect script
cat > /tmp/setup_expect.exp << 'EOF'
#!/usr/bin/expect -f
set timeout 30

spawn node dist/cli.js setup

# Select Ghost Codes's Workspace (option 3)
expect "Select your workspace:"
send "\033\[B\033\[B\r"

# Select first space or create new one
expect "Select a space:"
send "\r"

# If asked to select a list
expect {
    "Select default list" {
        send "\r"
    }
    timeout {
        puts "Timeout or completed"
    }
}

expect eof
EOF

chmod +x /tmp/setup_expect.exp

# Check if expect is installed
if ! command -v expect &> /dev/null; then
    echo "Installing expect..."
    sudo apt-get update && sudo apt-get install -y expect
fi

# Run the expect script
cd /home/cory-ubuntu/coding/mcps/clickmongrel
expect /tmp/setup_expect.exp

# Clean up
rm /tmp/setup_expect.exp