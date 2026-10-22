# Task Management System

A production-grade, multi-tenant task management application with real-time editing locks and workspace member management.

Built with **Next.js 16 (App Router), React 19, Tailwind CSS, NestJS 11, Prisma ORM 6, PostgreSQL (Neon), and Socket.IO**.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │       Neon Cloud PostgreSQL          │
                      │      (External Cloud Database)       │
                      └──────────────────▲───────────────────┘
                                         │
                                         │ DATABASE_URL
                                         │
┌─────────────────────────┐       ┌──────┴──────────────────┐
│   Next.js 16 Frontend   │ ───►  │  NestJS Backend API     │
│   (Port 3001)           │ HTTP  │  (Port 3000)            │
│                         │ + WS  │  - Prisma ORM           │
│  - App Router           │       │  - JWT Authentication   │
│  - Tailwind CSS         │       │  - Socket.IO Locks      │
│  - Real-Time Locks      │       │  - Multi-Tenant Guards  │
└─────────────────────────┘       └─────────────────────────┘
```

---

## Repository Structure

```text
.
├── docker-compose.yml        # Orchestrates Backend and Frontend containers
├── render.yaml               # Render Blueprint (Infrastructure-as-Code)
├── DEPLOYMENT.md             # Detailed cloud deployment guide
├── .env.docker.example       # Template for Docker Compose environment variables
│
├── task-management-api/      # Backend (NestJS, Prisma, Socket.IO)
│   ├── src/                  # Application controllers, services, guards, gateway
│   ├── prisma/               # Schema and migrations
│   ├── Dockerfile            # Multi-stage production backend Dockerfile
│   └── README.md             # Dedicated Backend README
│
└── frontend/                 # Frontend (Next.js 16, React 19, Tailwind CSS)
    ├── src/                  # App Router pages, components, features
    ├── Dockerfile            # Standalone output production Dockerfile
    └── README.md             # Dedicated Frontend README
```

---

## Running the Project with Docker Compose

The project is configured to use your **cloud-hosted Neon PostgreSQL** database directly, keeping containers lightweight and stateless.

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v20+ or Docker Desktop)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)
- A Neon PostgreSQL database connection string

### 2. Configure Environment Variables
Create a `.env` file at the root of the repository:

```bash
cp .env.docker.example .env
```

Open `.env` and set your credentials:

```env
# Cloud-hosted Neon Database Connection String (with ?sslmode=require)
DATABASE_URL=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require

# Backend JWT Secret
JWT_SECRET=supersecretjwtkeyforlocaldevelopment12345

# Frontend Backend API Endpoint
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Build and Start Containers
From the root directory, run:

```bash
docker compose up --build
```

Docker Compose will:
1. Build the **Backend** image, apply database migrations to Neon on startup via `docker-entrypoint.sh`, and start the NestJS server on port `3000`.
2. Build the **Frontend** standalone image, inject `NEXT_PUBLIC_API_URL=http://localhost:3000`, and start the Next.js server on port `3001`.

### 4. Access the Applications
- **Frontend Dashboard**: [http://localhost:3001](http://localhost:3001)
- **Backend REST API**: [http://localhost:3000](http://localhost:3000)

### 5. Stop Containers
To stop the running services:
```bash
docker compose down
```

---

## Running Locally Without Docker

If you wish to develop without containers:

### 1. Start the Backend API
```bash
cd task-management-api
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```
The backend will run on [http://localhost:3000](http://localhost:3000).

### 2. Start the Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on [http://localhost:3000](http://localhost:3000) (or [http://localhost:3001](http://localhost:3001) if port 3000 is taken).

---

## Deploying on Render

This repository includes a native [`render.yaml`](file:///home/developer/development/tasks/makeit%20-%20task%20/render.yaml) Blueprint for 1-click cloud deployment.

1. Push your code to GitHub or GitLab.
2. Log in to [Render](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select your repository.
5. Provide your Neon `DATABASE_URL` and your deployed backend URL for `NEXT_PUBLIC_API_URL`.
6. Click **Apply** to deploy both the Backend API and Frontend web services.

For detailed manual deployment steps, see [`DEPLOYMENT.md`](file:///home/developer/development/tasks/makeit%20-%20task%20/DEPLOYMENT.md).

---

## Testing & Quality Assurance

Run the automated test suites:

```bash
# Backend Unit Tests (62 tests passing)
cd task-management-api && npm test -- --runInBand

# Backend End-to-End Tests (50 tests passing)
cd task-management-api && NODE_OPTIONS=--experimental-vm-modules npm run test:e2e -- --runInBand

# Backend Linting
cd task-management-api && npm run lint

# Frontend Build & Linting
cd ../frontend && npm run lint && npm run build
```
