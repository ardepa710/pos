---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples."
---

# UI/UX Pro Max - Design Intelligence

Comprehensive design guide for web and mobile applications. Contains 50+ styles, 161 color palettes, 57 font pairings, 161 product types with reasoning rules, 99 UX guidelines, and 25 chart types across 10 technology stacks. Searchable database with priority-based recommendations.

## When to Apply

This Skill should be used when the task involves **UI structure, visual design decisions, interaction patterns, or user experience quality control**.

### Must Use

- Designing new pages (POS screen, cashier view, admin dashboard, reports)
- Creating or refactoring UI components (buttons, modals, forms, tables, numeric keypad)
- Choosing color schemes, typography systems, spacing standards, or layout systems
- Reviewing UI code for user experience, accessibility, or visual consistency
- Implementing navigation structures, animations, or responsive behavior

### Skip

- Pure backend logic (FastAPI routes, DB queries)
- Migration files or schema changes
- CI/CD or infrastructure work

## Quick Reference — Rule Categories by Priority

| Priority | Category            | Impact   | Key Checks                                            |
| -------- | ------------------- | -------- | ----------------------------------------------------- |
| 1        | Accessibility       | CRITICAL | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels   |
| 2        | Touch & Interaction | CRITICAL | Min size 44×44px, 8px+ spacing, Loading feedback      |
| 3        | Performance         | HIGH     | WebP/AVIF, Lazy loading, Reserve space (CLS < 0.1)    |
| 4        | Style Selection     | HIGH     | Match product type, Consistency, SVG icons (no emoji) |
| 5        | Layout & Responsive | HIGH     | Mobile-first breakpoints, No horizontal scroll        |
| 6        | Typography & Color  | MEDIUM   | Base 16px, Line-height 1.5, Semantic color tokens     |
| 7        | Animation           | MEDIUM   | Duration 150–300ms, Motion conveys meaning            |
| 8        | Forms & Feedback    | MEDIUM   | Visible labels, Error near field, Helper text         |
| 9        | Navigation Patterns | HIGH     | Predictable back, Bottom nav ≤5, Deep linking         |
| 10       | Charts & Data       | LOW      | Legends, Tooltips, Accessible colors                  |

## POS-Specific UI Rules

- **Cashier screen**: optimize for speed — large touch targets, numeric keypad prominent, no confirmation dialogs for common actions
- **Currency display**: always show MXN and USD amounts when applicable; use monospaced font for numbers
- **Color for status**: green=completed, yellow=pending, red=error/void — never use color as the only indicator
- **Accessibility**: high contrast (minimum 4.5:1) — POS environments often have variable lighting

## How to Use the Search Tool

```bash
# Generate complete design system recommendation
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "POS retail cashier dashboard" --design-system -p "POS"

# Domain-specific searches
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "form validation error" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "dark mode retail" --domain style
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "nextjs dashboard" --stack nextjs

# Available domains: style, color, chart, landing, product, ux, typography, icons, react, web, google-fonts
# Available stacks: react, nextjs, vue, svelte, astro, swiftui, react-native, flutter, nuxtjs, html-tailwind, shadcn
```

## Pre-Delivery Checklist

- [ ] No emojis as icons (use Lucide React)
- [ ] All interactive elements have cursor-pointer
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast 4.5:1 minimum in both light and dark themes
- [ ] Focus states visible for keyboard navigation
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] Touch targets 44x44px minimum
- [ ] No horizontal scroll on mobile
- [ ] Currency amounts use tabular/monospaced figures
