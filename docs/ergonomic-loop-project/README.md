# Ergonomic Improvement Loop Project

## Overview

The Ergonomic Improvement Loop is a multi-agent AI system designed to systematically analyze and improve the ergonomics of LLM tools. This project was developed to understand how AI agents prefer to interact with tools and what makes a tool interface truly ergonomic for LLM usage.

## What This Project Does

This system uses a 5-step iterative process where different Claude agents:
1. **Analyze** existing tool interfaces and identify pain points
2. **Design** improved, more ergonomic interfaces
3. **Implement** the new interfaces as working code
4. **Test** the implementations in real-world scenarios
5. **Synthesize** learnings and provide recommendations

The key innovation is using AI agents themselves to evaluate what makes tools ergonomic for AI usage, rather than relying on human assumptions.

## Directory Structure

```
ergonomic-loop-project/
├── README.md                    # This file
├── prompts/                     # Step-by-step prompts for the loop
│   ├── step1-prompt.txt        # Analysis prompt
│   ├── step2-prompt.txt        # Design prompt
│   ├── step3-prompt.txt        # Implementation prompt
│   ├── step4-prompt.txt        # Testing prompt
│   └── step5-prompt.txt        # Synthesis prompt
├── scripts/                     # Execution scripts
│   ├── ergonomics-loop.sh      # Main orchestration script
│   ├── claude-wrapper.sh       # Claude execution wrapper
│   └── resume-wrapper.sh       # Resume from specific step
├── logs/                        # Execution logs from all runs
│   ├── ergonomics-cycle.log    # Main cycle log
│   └── step*-debug-*.jsonl     # Individual step debug logs
├── results/                     # Analysis results and findings
│   ├── llm-ergonomics-analysis.md      # Final analysis
│   └── llm-ergonomic-migration-guide.md # Migration guide
└── docs/                        # Documentation
    ├── ergonomics-cycle-prompt.md      # Original cycle prompt
    └── retrospective-analysis.md       # Learnings from the process
```

## How to Use

### Running the Full Cycle

```bash
cd docs/ergonomic-loop-project/scripts
./ergonomics-loop.sh
```

### Resuming from a Specific Step

```bash
./resume-wrapper.sh 3  # Resume from step 3
```

### Prerequisites

- Claude CLI (`claude`) installed and configured
- Appropriate permissions for the tools being analyzed
- The target codebase available (e.g., obsidian-mcp-ts)

## Key Findings

### What Makes Tools Ergonomic for LLMs

1. **Reliability Over Features**: Simple tools that work reliably are preferred over complex tools that fail
2. **Clear Parameter Names**: Intuitive, self-documenting parameter names reduce errors
3. **Minimal Validation**: Overly strict validation creates friction
4. **Single-Purpose Tools**: Tools that do one thing well are easier to use correctly

### Tools That Worked Well

- `obsidian_simple_replace` - 100% success rate
- `obsidian_simple_append` - Straightforward and reliable
- `obsidian_converse_with_doc` - Natural language interface with high success

### Tools That Struggled

- Complex validation schemas that rejected valid inputs
- Tools with ambiguous parameter requirements
- Overlapping tools that created selection confusion

## Implementation Details

### The 5-Step Process

1. **Step 1: Analysis**
   - Reviews existing tool implementations
   - Identifies ergonomic issues
   - Documents pain points

2. **Step 2: Design**
   - Proposes improved interfaces
   - Creates implementation plans
   - Focuses on LLM-friendly patterns

3. **Step 3: Implementation**
   - Builds the proposed improvements
   - Creates working code
   - Maintains backward compatibility

4. **Step 4: Testing**
   - Tests tools in realistic scenarios
   - Documents success/failure rates
   - Identifies remaining issues

5. **Step 5: Synthesis**
   - Analyzes results across all steps
   - Provides actionable recommendations
   - Documents learnings

### Technical Architecture

The system uses:
- **Single Agent Orchestration**: One main agent delegates to sub-tasks
- **Prompt Inclusion System**: Separate prompt files enable easy restarts
- **Task Tool Delegation**: Maintains context while allowing focused work
- **Explicit Path Resolution**: Handles execution from different directories

## Lessons Learned

1. **Subprocess vs. Delegation**: Task delegation works better than subprocess spawning
2. **Unbiased Testing Critical**: Promotional bias in testing invalidates results
3. **Permission Management**: Tool permissions are a critical bottleneck
4. **Implementation Must Match Promise**: Tools that fail on first use are abandoned

See `docs/retrospective-analysis.md` for detailed technical and methodological insights.

## Future Improvements

- Automated permission configuration
- Continuous monitoring of tool usage patterns
- Integration with tool development workflows
- Expansion to other tool ecosystems

## Contributing

This project serves as a template for ergonomic analysis of any LLM tool ecosystem. To adapt it:

1. Replace the tool-specific prompts with your domain
2. Update the test scenarios in step 4
3. Run the cycle and analyze results
4. Iterate based on findings