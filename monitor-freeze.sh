#!/bin/bash

echo "Starting process monitor..."
echo "Will check CPU usage every 2 seconds"
echo "Press Ctrl+C to stop"
echo ""

# Get the PID of the claude process
CLAUDE_PID=$(pgrep -f "claude.*code" | head -1)

if [ -z "$CLAUDE_PID" ]; then
    echo "Claude process not found"
    exit 1
fi

echo "Monitoring Claude process PID: $CLAUDE_PID"
echo "Time | CPU% | MEM(MB) | STATE"
echo "--------------------------------"

while true; do
    # Get process info
    INFO=$(ps -p $CLAUDE_PID -o %cpu,rss,state | tail -1)
    
    if [ -z "$INFO" ]; then
        echo "Process $CLAUDE_PID no longer exists"
        break
    fi
    
    CPU=$(echo $INFO | awk '{print $1}')
    MEM_KB=$(echo $INFO | awk '{print $2}')
    MEM_MB=$((MEM_KB / 1024))
    STATE=$(echo $INFO | awk '{print $3}')
    
    TIMESTAMP=$(date +"%H:%M:%S")
    
    # Check for high CPU
    if (( $(echo "$CPU > 90" | bc -l) )); then
        echo -e "\033[91m$TIMESTAMP | $CPU% | ${MEM_MB}MB | $STATE ⚠️  HIGH CPU\033[0m"
    else
        echo "$TIMESTAMP | $CPU% | ${MEM_MB}MB | $STATE"
    fi
    
    sleep 2
done