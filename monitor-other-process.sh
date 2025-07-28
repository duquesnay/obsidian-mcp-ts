#!/bin/bash

echo "Starting monitor for sleep process (not Claude)..."
echo "Time | CPU% | MEM(MB) | STATE"
echo "--------------------------------"

# Start a long-running sleep process to monitor
sleep 300 &
SLEEP_PID=$!
echo "Monitoring sleep process PID: $SLEEP_PID"

COUNT=0
while true; do
    # Get process info
    INFO=$(ps -p $SLEEP_PID -o %cpu,rss,state 2>/dev/null | tail -1)
    
    if [ -z "$INFO" ]; then
        echo "Process $SLEEP_PID no longer exists"
        break
    fi
    
    CPU=$(echo $INFO | awk '{print $1}')
    MEM_KB=$(echo $INFO | awk '{print $2}')
    MEM_MB=$((MEM_KB / 1024))
    STATE=$(echo $INFO | awk '{print $3}')
    
    TIMESTAMP=$(date +"%H:%M:%S")
    
    echo "$TIMESTAMP | $CPU% | ${MEM_MB}MB | $STATE"
    
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge 50 ]; then
        echo "Reached 50 iterations (100 seconds), stopping test"
        kill $SLEEP_PID 2>/dev/null
        break
    fi
    
    sleep 2
done

echo "Monitor test completed"