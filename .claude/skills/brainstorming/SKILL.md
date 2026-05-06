# Skill: brainstorming

## Purpose

Generate creative ideas, explore alternatives, and think divergently before committing to a solution. Use when the user wants options, is exploring architecture, or is stuck.

## When to activate

- User asks "what are my options", "how should I approach", "ideas for", or "alternatives to"
- Architecture decisions that have meaningful tradeoffs
- UX decisions where multiple valid approaches exist
- Performance or data model decisions where approach shapes future work

## Rules

1. **Generate at least 3 options** before evaluating any of them
   - Include the obvious approach, one creative alternative, and one "outside the box" option
   - For POS context: consider offline-first, multi-currency, and gift card implications for each

2. **Separate generation from evaluation**
   - List all options first (bullet points, no judgment)
   - Then evaluate: pros/cons, complexity, fit for POS domain
   - End with a concrete recommendation

3. **Anchor to project constraints**
   - Stack: Next.js 15 App Router + FastAPI + PostgreSQL
   - Domain: dual-currency (MXN/USD), gift cards, consignment, loyalty points
   - Users: cashiers (speed-critical), admins (report-heavy), managers (inventory)
   - Scale: single store, ~50-200 transactions/day

4. **For architecture decisions, always consider**
   - How it handles the offline/degraded-network scenario (POS must work without internet)
   - Impact on the cashier session model (open/close with cash count)
   - Whether gift card balance integrity is preserved (append-only ledger)

5. **Output format**

```
## Options

### Option A: [Name]
Description + tradeoffs

### Option B: [Name]
Description + tradeoffs

### Option C: [Name]
Description + tradeoffs

## Recommendation
[Option X] because [specific reason tied to POS constraints].
```

## Anti-patterns

- Do not pick an option before listing all alternatives
- Do not suggest approaches that require float arithmetic for money
- Do not suggest approaches that break the append-only ledger for gift cards or stock movements
