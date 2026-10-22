# TaskHQ Frontend

A modern, responsive task management frontend built with **Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, and Socket.IO**.

---

## Features

- **Authentication & Session Persistence**:
  - Registration and login forms with real-time validation via **Zod** and **React Hook Form**.
  - Automatic session hydration and bearer token authorization with **Axios** interceptors.
  - Automatic redirect and token cleanup on `401 Unauthorized`.
- **Multi-Tenant Workspace Navigation**:
  - Interactive workspace selector dropdown displaying current workspace and user role (`OWNER`, `ADMIN`, `MEMBER`).
  - Modal to create a new workspace with atomic `OWNER` assignment.
  - Dynamic route synchronization between `/workspaces/:workspaceId/tasks` and `/workspaces/:workspaceId/members`.
- **Task Management Dashboard**:
  - Title search input with live filtering.
  - Dropdown filters for status (`TODO`, `IN_PROGRESS`, `DONE`) and priority (`LOW`, `MEDIUM`, `HIGH`).
  - Paginated task card view with deterministic sorting.
  - Create and edit dialogs.
  - Optimistic concurrency control: updates send the expected `version` query parameter and display a user-friendly conflict warning if another user modified the task.
  - Delete task confirmation modal.
- **Workspace Member Management**:
  - Responsive member directory displaying name, email, role badge, and joined date.
  - "Add Member" modal enabled for `OWNER` and `ADMIN` users:
    - `OWNER` can select `ADMIN` or `MEMBER`.
    - `ADMIN` can select `MEMBER` only.
    - Role restrictions are enforced in the UI and validated on the backend.
    - Clear error feedback for unregistered users (`404`) and duplicate members (`409`).
- **Real-Time Task Locks (Socket.IO)**:
  - Connects to backend WebSocket gateway with Bearer token authentication.
  - Automatically joins the active workspace room (`workspace:${workspaceId}`).
  - When opening a task for editing, acquires a temporary 60-second lock.
  - If another team member is already editing, displays "Task is Locked by [Name]" and prevents duplicate simultaneous edits.
  - Automatically releases lock on save, cancel, modal dismissal, or socket disconnection.
  - Displays animated "🔒 Being edited by [Name]" status badge on task cards in real-time.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI & Components**: React 19, Tailwind CSS, Lucide React
- **Forms & Validation**: React Hook Form, Zod, `@hookform/resolvers`
- **HTTP Client**: Axios
- **Real-Time WebSockets**: Socket.IO Client (`socket.io-client`)
- **Language**: TypeScript 5

---

## Prerequisites

- **Node.js**: v20 or v22+ (LTS)
- **npm**: v10+
- **Backend API**: The NestJS backend server running on `http://localhost:3000` (or your deployed URL)

---

## Environment Configuration

Create a `.env.local` file in `frontend/`:

```env
# Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> [!NOTE]
> `NEXT_PUBLIC_*` variables are inlined into the client-side JavaScript bundle during build time. For production deployments (e.g. Render), ensure `NEXT_PUBLIC_API_URL` points to your deployed backend URL.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port specified by Next.js if 3000 is occupied by the backend, e.g. [http://localhost:3001](http://localhost:3001)) in your browser.

---

## Production Build & Run

### 1. Build Production Bundle (Standalone Output)
```bash
npm run build
```

### 2. Start Production Server
```bash
npm run start
```
By default, this serves the optimized production application on port 3000 (or `PORT=3001 npm run start`).

---

## Code Quality & Linting

Run ESLint checks:
```bash
npm run lint
```

---

## Project Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx         # Login page
│   │   │   └── register/page.tsx      # Register page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Authenticated shell layout (Sidebar + Header)
│   │   │   ├── page.tsx               # Root dashboard redirect
│   │   │   └── workspaces/[workspaceId]/
│   │   │       ├── layout.tsx         # Workspace provider context wrapper
│   │   │       ├── page.tsx           # Redirects to tasks
│   │   │       ├── tasks/page.tsx     # Tasks dashboard page
│   │   │       └── members/page.tsx   # Members management page
│   │   ├── layout.tsx                 # Root layout with AuthProvider
│   │   └── globals.css                # Tailwind styling
│   ├── components/
│   │   ├── layout/
│   │   │   ├── header.tsx             # Top bar with user profile & logout
│   │   │   ├── sidebar.tsx            # Navigation sidebar
│   │   │   └── workspace-selector.tsx # Workspace dropdown & creation
│   │   └── ui/                        # Reusable primitives (Button, Input, Badge, Dialog, Select, Skeleton)
│   ├── features/
│   │   ├── auth/                      # Auth API, types, useAuth hook
│   │   ├── workspaces/                # Workspaces API, types, create dialog
│   │   ├── members/                   # Members API, types, list & add dialog
│   │   └── tasks/                     # Tasks API, types, list, card, form, useTaskLocks
│   └── lib/
│       ├── api-client.ts              # Axios instance with auth interceptor
│       ├── socket-client.ts           # Socket.IO client factory
│       └── utils.ts                   # Class name merge utilities
├── Dockerfile                         # Production multi-stage Docker build
└── package.json
```

---

## Docker Build

```bash
# Build standalone Docker image
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:3000 -t task-management-frontend:latest .

# Run container
docker run -p 3001:3000 \
  -e PORT=3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3000 \
  task-management-frontend:latest
```
Access the containerized frontend at `http://localhost:3001`.
