# WPHub SaaS - Monorepo Foundation

WPHub SaaS is a production-ready cloud WordPress hosting platform designed for maximum speed, security, and scalability. It behaves similarly to modern services like InstaWP, RunCloud, and Hostinger, offering full cloud backend-driven WordPress instance provisioning.

---

## 🛠 Tech Stack

### Frontend (`/apps/frontend`)

- **Core**: React, TypeScript, Vite
- **Styling**: TailwindCSS, Vanilla CSS
- **Routing**: React Router
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **API Client**: Axios

### Backend (`/apps/backend`)

- **Core**: Node.js, Express, TypeScript
- **ORM**: Prisma (PostgreSQL connector)
- **Cache/Queue**: Redis

### Infrastructure (`/docker`)

- **Reverse Proxy**: Traefik (v2.10)
- **Database**: PostgreSQL (v16)
- **Object Storage**: MinIO (S3-compatible bucket backup storage)

---

## 📂 Project Structure

```text
/apps
  ├── frontend              # React + Vite + Tailwind dashboard application
  └── backend               # Node.js + Express + Prisma API application

/packages
  ├── tsconfig              # Base and environment-specific TSConfigs
  ├── eslint-config         # Shared ESLint configuration
  ├── types                 # Shared type definitions for API and models
  ├── ui                    # Shared design system elements (React / tailwind)
  └── utils                 # Shared library helpers (logger, validators)

/docker                     # Orchestration setups for Postgres, Redis, MinIO, Traefik
/scripts                    # Automation and setup helper utilities
/docs                       # Documentation archives
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org) (v18 or higher recommended)
- [pnpm](https://pnpm.io) (v8 or higher)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)

### Installation

1. Clone the repository and navigate into the folder:

   ```bash
   cd wphub-saas
   ```

2. Copy the environment variables template and customize details:

   ```bash
   cp .env.example .env
   ```

3. Install all dependencies across workspaces:

   ```bash
   pnpm install
   ```

4. Compile workspace packages (builds `@wphub/tsconfig`, `@wphub/types`, `@wphub/utils`, `@wphub/ui`):
   ```bash
   pnpm build
   ```

### Running the Services

- **Run Dev Servers (Frontend + Backend)**:

  ```bash
  pnpm dev
  ```
  - Frontend: [http://localhost:3000](http://localhost:3000)
  - Backend: [http://localhost:5000](http://localhost:5000)

- **Start Infrastructure Services (Docker)**:

  ```bash
  docker-compose -f docker/docker-compose.yml up -d
  ```

- **Run Linting**:

  ```bash
  pnpm lint
  ```

- **Run Format**:
  ```bash
  pnpm format
  ```
