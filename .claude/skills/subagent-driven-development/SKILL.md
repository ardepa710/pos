# Subagent-Driven Development

Use this skill when a task touches 4+ files or requires parallel work streams.

## When to activate

- Task touches 4+ files
- Multiple independent components need to be built simultaneously
- Research + implementation can run in parallel
- Multiple test suites need to run concurrently

## How to dispatch subagents

### Research agent

```
Agent({
  description: "Research X pattern in codebase",
  subagent_type: "Explore",
  prompt: "Find all instances of X in the codebase. Report file paths and line numbers. Under 200 words."
})
```

### Implementation agent (isolated)

```
Agent({
  description: "Implement feature Y",
  isolation: "worktree",
  prompt: "Implement [specific feature] in [specific files]. Context: [relevant details]. Do NOT touch [other files]."
})
```

## Rules

- Brief agents like a colleague who just walked in — include file paths, line numbers, decisions already made
- Never delegate understanding: include what you already know, not "figure it out"
- Independent work: send multiple Agent calls in one message to run concurrently
- Dependent work: wait for first agent to complete before briefing the next
- Trust but verify: check actual file changes, don't rely solely on agent summary
- Use `isolation: "worktree"` for implementation agents to prevent conflicts
- After all agents complete: run verification-before-completion

## Anti-patterns

- "Based on your findings, fix the bug" — synthesis stays with you, not the agent
- Sending sequential agents when they could be parallel
- Delegating without telling the agent what you already know
