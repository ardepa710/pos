# React Best Practices

**Alias:** This skill maps to the installed `vercel-react-best-practices` skill. Apply that skill's full guidance.

## Quick reference

- Server Components by default — `"use client"` only when state/effects strictly required
- Co-locate state as close to where it's used as possible
- Derive state with `useMemo`/computed values — never `useEffect` to sync state
- Extract business logic to `lib/` — not inside components
- Keep components under 150 lines; split if larger
- Use `Suspense` + `error.tsx` boundaries for async data
- Prefer composition over prop drilling (use Context sparingly)
- Icons: Lucide React exclusively
- Loading: skeleton screens for content, spinners for point actions
