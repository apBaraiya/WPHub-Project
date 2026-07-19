# WPHub SaaS - Monorepo Foundation Setup

Establish a production-ready, clean, and scalable foundation for the WPHub SaaS cloud WordPress hosting platform. This setup configures the monorepo framework, typescript sharing, styling standards, git hooks, and folder structure for development.

## User Review Required

We are using a **pnpm workspaces monorepo** structure. Please review the planned directory layout and shared configuration approach before proceeding.

> [!IMPORTANT]
> The foundation includes husky and lint-staged hooks. Upon completion of Step 1, a `git init` and setup step will be run so husky is properly registered in the local git hook configuration.

## Open Questions

There are no blockers or open questions at this stage. We will structure the backend with TypeScript/Express and the frontend with React/Vite/TailwindCSS, using `@wphub/*` workspace namespace aliases.

## Proposed Changes

We will create a multi-package workspace structure as detailed below:

### Workspace Configurations

#### [NEW] [pnpm-workspace.yaml](file:///d:/Akshay/Hosting/pnpm-workspace.yaml)

Defines the packages and apps workspaces for pnpm:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### [NEW] [package.json](file:///d:/Akshay/Hosting/package.json)

Root package.json containing workspaces development scripts, prettier, eslint, husky, and lint-staged configs.

#### [NEW] [.prettierrc](file:///d:/Akshay/Hosting/.prettierrc)

Shared Prettier formatting standards.

#### [NEW] [.eslintrc.json](file:///d:/Akshay/Hosting/.eslintrc.json)

Workspace-wide ESLint configuration.

#### [NEW] [.env.example](file:///d:/Akshay/Hosting/.env.example)

Example environment configurations for frontend, backend, database, Redis, MinIO, and Traefik.

#### [NEW] [README.md](file:///d:/Akshay/Hosting/README.md)

Monorepo documentation outlining installation, project structure, script execution, and architecture.

---

### Shared Packages (`/packages`)

Shared components, configurations, and utilities imported into applications using workspace protocols.

#### [NEW] [packages/tsconfig](file:///d:/Akshay/Hosting/packages/tsconfig)

Hosts base `tsconfig.json` files for standard node and react/vite configurations.

- `tsconfig.base.json`: Base TS options.
- `tsconfig.node.json`: Options for Backend/Node tasks.
- `tsconfig.react.json`: Options for Frontend/Vite tasks.

#### [NEW] [packages/types](file:///d:/Akshay/Hosting/packages/types)

Hosts shared TypeScript definitions for domain models, API requests/responses, and config structures.

- `package.json`
- `tsconfig.json`
- `src/index.ts`: Shared types entry.

#### [NEW] [packages/ui](file:///d:/Akshay/Hosting/packages/ui)

React components and theme styling configuration.

- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/components/button.tsx` (Example base UI element)

#### [NEW] [packages/utils](file:///d:/Akshay/Hosting/packages/utils)

Shared helper utilities (e.g. logger, string formatting, validations).

- `package.json`
- `tsconfig.json`
- `src/index.ts`

---

### Applications (`/apps`)

#### [NEW] [apps/frontend](file:///d:/Akshay/Hosting/apps/frontend)

React application scaffolded with Vite and TailwindCSS.

- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`

#### [NEW] [apps/backend](file:///d:/Akshay/Hosting/apps/backend)

Express API server scaffolded with TypeScript and Prisma initialization framework.

- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/app.ts`
- `prisma/schema.prisma` (Base Prisma framework, schema is empty per requirements)

---

### Infrastructure and Scripts

#### [NEW] [/docker](file:///d:/Akshay/Hosting/docker)

Hosts boilerplate environment configurations:

- `docker/docker-compose.yml` (Configures Traefik, PostgreSQL, Redis, MinIO)
- `docker/traefik.yml` (Traefik static configuration)

#### [NEW] [/scripts](file:///d:/Akshay/Hosting/scripts)

Development helper scripts.

- `scripts/setup.sh` (Initial project setup automation helper)

---

## Verification Plan

### Automated Verification

We will verify configuration validity and compiling capabilities:

- Run formatting and linting: `pnpm run lint` & `pnpm run format`
- Compile types and codebases: `pnpm run build` or `pnpm -r exec tsc --noEmit`
- Run backend and frontend type checking.

### Manual Verification

- Verify that standard workspaces resolve configurations correctly.
- Verify directory structure matches the plan.
