# Project Rules & Guidelines

## Package Management

- **ALWAYS use `pnpm`** for package management.
- Do NOT use `npm` or `yarn`.
- Install dependencies: `pnpm add [package]` or `pnpm add -D [package]`.
- install all dependencies: `pnpm install`.
- Run scripts: `pnpm run [script]`.

## Tech Stack

- **Framework**: React + Vite
- **Language**: TypeScript (Migrating from JavaScript)
- **Styling**: TailwindCSS (inferred from package.json)

## Routing

- New features/migration work goes under `/faddit/*` route prefix.
- Use `react-router-dom`.
