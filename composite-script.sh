#!/bin/bash
# Verify all tools have metadata
echo "Tools without metadata:"
grep -L 'metadata:' src/tools/*Tool.ts | grep -v BaseTool | xargs basename -a 2>/dev/null | sort
echo ""
echo "Tools with metadata:"
grep -l 'metadata:' src/tools/*Tool.ts | wc -l
echo ""
echo "Total tools:"
ls src/tools/*Tool.ts | grep -v BaseTool | wc -l