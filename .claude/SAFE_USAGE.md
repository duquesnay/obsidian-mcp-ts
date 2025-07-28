# Safe Usage Guidelines to Prevent Freezes

## The Problem
Claude can freeze when:
1. Processing very large responses (>10MB)
2. Self-monitoring (processes monitoring themselves)
3. Circular references in data structures
4. Team coordinator processing entire large backlogs

## Safe Patterns

### For Team Coordinator

❌ **DON'T DO THIS:**
```
"team coordinator to implement the rest of the backlog"
```

✅ **DO THIS INSTEAD:**
```
"team coordinator to implement the next 5 tasks from the backlog"
```

Or even better:
```
"What are the next 5 incomplete tasks in the backlog?"
(review the list)
"team coordinator to implement tasks T1.1 through T1.5"
```

### For Background Processes

❌ **DON'T DO THIS:**
```bash
./monitor-script.sh > output.log &
```

✅ **DO THIS INSTEAD:**
```bash
timeout 60 ./monitor-script.sh > output.log &
```

### For Long-Running Tasks

Break them into chunks:
```
"Process items 1-50"
"Process items 51-100"
"Process items 101-150"
```

## Emergency Recovery

If Claude freezes:
1. The session will be terminated after ~90 seconds
2. You'll need to restart Claude
3. Check for any background processes: `ps aux | grep claude`

## Prevention Checklist

Before running commands:
- [ ] Is the task processing a large amount of data?
- [ ] Could it create self-referential loops?
- [ ] Are you asking for "everything" or "all"?
- [ ] Is there a background process without timeout?

If yes to any, break it down or add constraints!