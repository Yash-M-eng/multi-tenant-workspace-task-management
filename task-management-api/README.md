# Task Management API (Backend)

A multi-tenant, enterprise task management backend built with **NestJS 11, TypeScript, Prisma ORM 6, PostgreSQL, and Socket.IO**.

---

## Features

- **Authentication & Authorization**: User registration, login with bcrypt password hashing, and stateless JWT token issuance (`/auth/login`, `/auth/register`, `/auth/me`, `/auth/profile`).
- **Multi-Tenant Workspace Isolation**: Strict tenant scoping across all workspace and task queries with `WorkspaceMembershipGuard`.
- **Workspace Member Management**: `POST /workspaces/:workspaceId/members` allowing workspace `OWNER` to add `ADMIN` or `MEMBER`, and `ADMIN` to add `MEMBER` users. Includes lowercase email normalization, existing user lookup, and duplicate prevention.
- **Task CRUD with Deterministic Pagination**: Search by title, filter by status (`TODO`, `IN_PROGRESS`, `DONE`) and priority (`LOW`, `MEDIUM`, `HIGH`), deterministic secondary sorting (`[{ createdAt: 'desc' }, { id: 'asc' }]`).
- **Optimistic Concurrency Control**: Safe conditional atomic updates using `version` query parameter (`PATCH /workspaces/:workspaceId/tasks/:taskId?version=X`), preventing lost updates and returning `409 Conflict` on stale writes.
- **Real-Time Task Editing Locks (Socket.IO)**: In-memory task lock gateway (`TaskLocksGateway`) with JWT authentication on handshake, workspace rooms (`workspace:${workspaceId}`), 60-second TTL, and auto-release on save, cancel, or socket disconnect.
- **Information Leak Prevention**: Global `PrismaClientExceptionFilter` mapping database constraint codes (`P2002`, `P2025`, `P2023`, `P2003`) to safe HTTP statuses without leaking internal schema or connection strings.

---

## Tech Stack

- **Framework**: NestJS 11 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`)
- **Language**: TypeScript 5.7
- **Database & ORM**: PostgreSQL (Cloud-hosted Neon) & Prisma ORM 6
- **Real-Time WebSockets**: Socket.IO (`@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`)
- **Validation**: `class-validator`, `class-transformer`
- **Testing**: Jest, Supertest

---

## Prerequisites

- **Node.js**: v20 or v22+ (LTS)
- **npm**: v10+
- **Database**: Cloud-hosted PostgreSQL instance (e.g. Neon)

---

## Environment Configuration

Create a `.env` file in `task-management-api/`:

```env
# Cloud-hosted Neon PostgreSQL Connection String
DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Direct URL for Prisma Migrations (optional / same as DATABASE_URL for Neon)
DIRECT_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT Secret (minimum 32 characters recommended)
JWT_SECRET="your-super-secure-random-jwt-secret-key-12345"

# Server Port (default 3000)
PORT=3000
```

---

## Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Run Database Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

---

## Running the Application

### Development Mode (with hot-reload)
```bash
npm run start:dev
```
The API server will listen on `http://localhost:3000`.

### Production Mode
```bash
# 1. Compile TypeScript to dist/
npm run build

# 2. Start production server
npm run start:prod
```

### Debug Mode
```bash
npm run start:debug
```

---

## Running Tests & Quality Checks

### 1. Unit Tests (9 suites, 62 tests)
```bash
npm test -- --runInBand
```

### 2. End-to-End Tests (50 tests)
```bash
NODE_OPTIONS=--experimental-vm-modules npm run test:e2e -- --runInBand
```

### 3. Code Linting (ESLint)
```bash
npm run lint
```

### 4. Build Check
```bash
npm run build
```

---

## API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user account | No |
| `POST` | `/auth/login` | Authenticate user & return Bearer token | No |
| `GET` | `/auth/me` | Get current user's ID | Yes |
| `GET` | `/auth/profile` | Get full current user profile | Yes |
| `GET` | `/workspaces` | List all workspaces user belongs to | Yes |
| `POST` | `/workspaces` | Create workspace (atomic `OWNER` role) | Yes |
| `GET` | `/workspaces/:workspaceId` | Get workspace details | Yes (Member) |
| `GET` | `/workspaces/:workspaceId/members` | List workspace members with profiles | Yes (Member) |
| `POST` | `/workspaces/:workspaceId/members` | Add existing registered user as member | Yes (Owner/Admin) |
| `GET` | `/workspaces/:workspaceId/tasks` | List tasks (search, filter, paginate) | Yes (Member) |
| `POST` | `/workspaces/:workspaceId/tasks` | Create task in workspace | Yes (Member) |
| `GET` | `/workspaces/:workspaceId/tasks/:taskId` | Get task details | Yes (Member) |
| `PATCH` | `/workspaces/:workspaceId/tasks/:taskId?version=X` | Update task with optimistic locking | Yes (Member) |
| `DELETE` | `/workspaces/:workspaceId/tasks/:taskId` | Delete task | Yes (Member) |

---

## Real-Time Socket.IO Events

Connect socket with Bearer token in handshake auth: `io('http://localhost:3000', { auth: { token } })`.

| Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join:workspace` | Client → Server | `{ workspaceId }` | Joins room and receives active locks |
| `leave:workspace` | Client → Server | `{ workspaceId }` | Leaves workspace room |
| `locks:current` | Server → Client | `TaskLock[]` | Emits active locks upon joining |
| `task:lock:acquire` | Client → Server | `{ taskId, workspaceId }` | Requests edit lock on task (60s TTL) |
| `task:locked` | Server → Room | `TaskLock` | Broadcasts acquired lock |
| `task:lock:rejected` | Server → Client | `{ taskId, lockedBy, message }` | Sent if task is locked by someone else |
| `task:lock:release` | Client → Server | `{ taskId, workspaceId }` | Releases lock manually on save/cancel |
| `task:unlocked` | Server → Room | `{ taskId, workspaceId }` | Broadcasts lock release |

---

## Docker Build

```bash
# Build Docker image
docker build -t task-management-api:latest .

# Run container with external Neon database
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require" \
  -e JWT_SECRET="your-jwt-secret" \
  task-management-api:latest
```
