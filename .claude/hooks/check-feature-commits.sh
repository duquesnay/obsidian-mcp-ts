#!/bin/bash

# Claude Code hook to track feature commits and trigger quality review
# This runs after git commit commands executed through Claude

# Configuration
COUNTER_FILE="$CLAUDE_PROJECT_DIR/.claude/hooks/feature-commit-counter"
FEATURE_PREFIX="feat:"

# Debug output
echo "[Feature Commit Hook] Checking last commit..."

# Get the most recent commit message
COMMIT_MSG=$(cd "$CLAUDE_PROJECT_DIR" && git log -1 --pretty=%B 2>/dev/null)

# Check if we got a commit message
if [ -z "$COMMIT_MSG" ]; then
    echo "[Feature Commit Hook] No recent commit found"
    exit 0
fi

# Check if this is a feature commit
if [[ "$COMMIT_MSG" == $FEATURE_PREFIX* ]]; then
    echo "[Feature Commit Hook] Feature commit detected: $COMMIT_MSG"
    
    # Initialize counter file if it doesn't exist
    if [ ! -f "$COUNTER_FILE" ]; then
        echo "0" > "$COUNTER_FILE"
    fi
    
    # Read current count
    COUNT=$(cat "$COUNTER_FILE")
    
    # Increment counter
    COUNT=$((COUNT + 1))
    echo "$COUNT" > "$COUNTER_FILE"
    
    echo "[Feature Commit Hook] Feature commit count: $COUNT"
    
    # Check if we've reached 3 feature commits
    if [ $((COUNT % 3)) -eq 0 ]; then
        echo "🎯 [Feature Commit Hook] Reached 3 feature commits! Time for quality review!"
        echo ""
        echo "Suggested quality review actions:"
        echo "1. Run code quality analysis: Task(subagent_type='code-quality-analyst')"
        echo "2. Review architecture: Task(subagent_type='architecture-reviewer')"
        echo "3. Check performance: Task(subagent_type='performance-optimizer')"
        echo "4. Validate test coverage: Task(subagent_type='test-engineer')"
        echo ""
        echo "Feature commits since last review:"
        cd "$CLAUDE_PROJECT_DIR" && git log --oneline --grep="^feat:" -3
    fi
else
    echo "[Feature Commit Hook] Not a feature commit: $COMMIT_MSG"
fi

exit 0