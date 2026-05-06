# Skill: writing-plans

## Purpose

Create structured, actionable implementation plans before writing any code. Activate when a feature touches 3+ files or involves architectural decisions.

## When to activate

- New feature that touches 3 or more files
- Any database schema change
- New API endpoint or router group
- Multi-step refactoring
- Any change that touches the currency, inventory, gift card, or session model

## Plan structure (required)

```markdown
## Plan: [Feature Name]

**Goal:** One sentence.
**Affected files:** List every file that will be created or modified.
**Skills to activate:** (e.g. pos-domain, react-best-practices, routing-middleware)

### Steps

1. [Step title] — [file(s)]
   - What: specific change
   - Why: reason / constraint
   - Test: how to verify this step is done

2. ...

### Dependencies

- Step N must complete before step M because: [reason]

### Risks / gotchas

- [Known edge case or POS-domain constraint to watch for]

### Definition of done

- [ ] All unit tests pass
- [ ] mypy + ruff clean
- [ ] Manual smoke test: [specific scenario]
- [ ] No float arithmetic for money
```

## Rules

1. Write the plan BEFORE touching any file
2. Every step must name the exact file(s) it touches
3. Steps that are independent SHOULD be marked as parallel-safe
4. Include a "Definition of done" section — vague plans produce vague results
5. For POS domain: always note whether the step touches currency logic, inventory, gift cards, or cashier sessions — these areas require extra care (see pos-domain skill)
6. Plans are living documents: update them as you discover new information during implementation

## Anti-patterns

- "Implement the feature" as a single step — break it down
- Plans that don't name files — every step needs a file
- Starting to code before the plan is written
- Forgetting to list the migration file when a DB change is involved
