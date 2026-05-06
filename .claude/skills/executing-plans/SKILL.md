# Executing Plans

**Alias:** This skill maps to the installed `plan-implementation` skill. Apply that skill's full guidance.

## When to use

Invoke when a written plan exists and the user says "proceed", "implement", "go ahead", or similar.

## Core steps

1. Read the plan document fully before writing any code
2. Work through each step in order — do not skip or reorder
3. Mark each step complete (in the plan doc or todo list) as you finish it
4. After each file change, verify it compiles / passes lint before moving on
5. Run verification-before-completion at the end

## Rules

- Never start implementing without a plan document
- If the plan is ambiguous, clarify before coding — not during
- If a step reveals the plan is wrong, stop and update the plan before continuing
- Keep the plan doc updated with actual outcomes vs expected
