import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { TaskPriority, TaskStatus } from '../src/tasks/dto/create-task.dto';
import { AppModule } from './../src/app.module';

describe('Task Management API (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const validWorkspaceId = '00000000-0000-4000-8000-000000000001';
  const validTaskId = '00000000-0000-4000-8000-000000000010';
  const ownerUserId = '00000000-0000-4000-8000-000000000050';
  const adminUserId = '00000000-0000-4000-8000-000000000060';
  const memberUserId = '00000000-0000-4000-8000-000000000100';
  const nonMemberUserId = '00000000-0000-4000-8000-000000000200';
  const targetUserId = '00000000-0000-4000-8000-000000000300';

  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let nonMemberToken: string;

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    workspace: {
      create: jest.fn(),
    },
    membership: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    jwtService = app.get(JwtService);
    ownerToken = jwtService.sign({ sub: ownerUserId });
    adminToken = jwtService.sign({ sub: adminUserId });
    memberToken = jwtService.sign({ sub: memberUserId });
    nonMemberToken = jwtService.sign({ sub: nonMemberUserId });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    prismaMock.membership.findUnique.mockImplementation(
      ({
        where,
      }: {
        where: { userId_workspaceId: { userId: string; workspaceId: string } };
      }) => {
        const { userId, workspaceId } = where.userId_workspaceId;
        if (workspaceId === validWorkspaceId) {
          if (userId === ownerUserId) {
            return Promise.resolve({
              id: 'membership-uuid-owner',
              userId: ownerUserId,
              workspaceId: validWorkspaceId,
              role: 'OWNER',
            });
          }
          if (userId === adminUserId) {
            return Promise.resolve({
              id: 'membership-uuid-admin',
              userId: adminUserId,
              workspaceId: validWorkspaceId,
              role: 'ADMIN',
            });
          }
          if (userId === memberUserId) {
            return Promise.resolve({
              id: 'membership-uuid-1',
              userId: memberUserId,
              workspaceId: validWorkspaceId,
              role: 'MEMBER',
            });
          }
        }
        return Promise.resolve(null);
      },
    );
  });

  describe('Health & Root', () => {
    it('/ (GET) returns 200', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });

    it('/health (GET) returns ok when DB is connected', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect({ status: 'ok', database: 'connected' });
    });
  });

  describe('Authentication & User Management', () => {
    it('rejects unknown properties in registration with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'StrongPassword123!',
          unexpected: 'should be rejected',
        })
        .expect(400);
    });

    it('rejects weak/short password with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
        })
        .expect(400);
    });

    it('normalizes email and creates user without exposing password hash', async () => {
      const createdUser = {
        id: memberUserId,
        email: 'test@example.com',
        name: 'Test Member',
        createdAt: new Date().toISOString(),
      };
      prismaMock.user.create.mockResolvedValue(createdUser);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: '  TEST@EXAMPLE.COM  ',
          password: 'StrongPassword123!',
          name: '  Test Member  ',
        })
        .expect(201);

      const body = res.body as { passwordHash?: string };
      expect(res.body).toEqual(createdUser);
      expect(body.passwordHash).toBeUndefined();
    });

    it('returns 409 Conflict when registering duplicate email', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.0.0' },
      );
      prismaMock.user.create.mockRejectedValue(p2002Error);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'StrongPassword123!',
        })
        .expect(409);
    });

    it('login returns 401 for non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'Password123!',
        })
        .expect(401);
    });

    it('login returns 401 for wrong password', async () => {
      const hash = await bcrypt.hash('CorrectPassword123!', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: memberUserId,
        email: 'test@example.com',
        passwordHash: hash,
        name: 'Test Member',
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('login returns access token on valid credentials', async () => {
      const hash = await bcrypt.hash('CorrectPassword123!', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: memberUserId,
        email: 'test@example.com',
        passwordHash: hash,
        name: 'Test Member',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: '  TEST@EXAMPLE.COM ',
          password: 'CorrectPassword123!',
        })
        .expect(200);

      const body = res.body as {
        accessToken: string;
        tokenType: string;
        user: { id: string; email: string; name: string | null };
      };
      expect(body.accessToken).toBeDefined();
      expect(body.tokenType).toBe('Bearer');
      expect(body.user).toEqual({
        id: memberUserId,
        email: 'test@example.com',
        name: 'Test Member',
      });
    });

    it('/auth/me rejects unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('/auth/me returns user details for valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body).toEqual({ userId: memberUserId });
    });
  });

  describe('Workspaces', () => {
    it('rejects unauthenticated workspace creation with 401', async () => {
      await request(app.getHttpServer())
        .post('/workspaces')
        .send({ name: 'Acme Corp' })
        .expect(401);
    });

    it('rejects whitespace-only workspace name with 400', async () => {
      await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: '   ' })
        .expect(400);
    });

    it('creates workspace and OWNER membership atomically in transaction', async () => {
      const createdWorkspace = {
        id: validWorkspaceId,
        name: 'Acme Corp',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      prismaMock.$transaction.mockImplementation(
        (
          callback: (tx: {
            workspace: { create: jest.Mock };
            membership: { create: jest.Mock };
          }) => Promise<unknown>,
        ) => {
          const txMock = {
            workspace: {
              create: jest.fn().mockResolvedValue(createdWorkspace),
            },
            membership: {
              create: jest.fn().mockResolvedValue({ id: 'm1', role: 'OWNER' }),
            },
          };
          return callback(txMock);
        },
      );

      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: '  Acme Corp  ' })
        .expect(201);

      expect(res.body).toEqual({
        ...createdWorkspace,
        role: 'OWNER',
      });
    });
  });

  describe('Workspace Member Management (POST /workspaces/:workspaceId/members)', () => {
    it('rejects unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .send({ email: 'newuser@example.com', role: 'MEMBER' })
        .expect(401);
    });

    it('rejects invalid workspace UUID format with 400', async () => {
      await request(app.getHttpServer())
        .post('/workspaces/invalid-workspace-uuid/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newuser@example.com', role: 'MEMBER' })
        .expect(400);
    });

    it('rejects non-member with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ email: 'newuser@example.com', role: 'MEMBER' })
        .expect(403);
    });

    it('rejects member with role MEMBER attempting to add users with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'newuser@example.com', role: 'MEMBER' })
        .expect(403);
    });

    it('rejects admin attempting to add an ADMIN with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'newuser@example.com', role: 'ADMIN' })
        .expect(403);
    });

    it('rejects request attempting to assign OWNER role with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newuser@example.com', role: 'OWNER' })
        .expect(400);
    });

    it('rejects invalid role value with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newuser@example.com', role: 'SUPERUSER' })
        .expect(400);
    });

    it('returns 404 Not Found when email does not belong to any registered user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'nonexistent@example.com', role: 'MEMBER' })
        .expect(404);

      const body = res.body as { message: string };
      expect(body.message).toContain('Please have the user register first');
    });

    it('returns 409 Conflict when user is already a member', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: 'newuser@example.com',
        name: 'New User',
      });
      prismaMock.membership.findUnique.mockImplementation(
        ({
          where,
        }: {
          where: {
            userId_workspaceId: { userId: string; workspaceId: string };
          };
        }) => {
          const { userId, workspaceId } = where.userId_workspaceId;
          if (workspaceId === validWorkspaceId) {
            if (userId === ownerUserId) {
              return Promise.resolve({
                id: 'membership-uuid-owner',
                userId: ownerUserId,
                workspaceId: validWorkspaceId,
                role: 'OWNER',
              });
            }
            if (userId === targetUserId) {
              return Promise.resolve({
                id: 'existing-membership-id',
                userId: targetUserId,
                workspaceId: validWorkspaceId,
                role: 'MEMBER',
              });
            }
          }
          return Promise.resolve(null);
        },
      );

      await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newuser@example.com', role: 'MEMBER' })
        .expect(409);
    });

    it('admin can successfully add an existing user as MEMBER', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: 'newuser@example.com',
        name: 'New User',
      });

      const createdDate = new Date().toISOString();
      prismaMock.membership.create.mockResolvedValue({
        id: 'new-membership-uuid',
        userId: targetUserId,
        workspaceId: validWorkspaceId,
        role: 'MEMBER',
        createdAt: createdDate,
        user: {
          id: targetUserId,
          email: 'newuser@example.com',
          name: 'New User',
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: '  NEWUSER@EXAMPLE.COM  ', role: 'MEMBER' })
        .expect(201);

      const body = res.body as {
        id: string;
        workspaceId: string;
        role: string;
        createdAt: string;
        user: {
          id: string;
          email: string;
          name: string;
          passwordHash?: string;
        };
        passwordHash?: string;
      };

      expect(body.role).toBe('MEMBER');
      expect(body.user.email).toBe('newuser@example.com');
      expect(body.passwordHash).toBeUndefined();
      expect(body.user.passwordHash).toBeUndefined();
    });

    it('owner can successfully add an existing user as ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: 'newuser@example.com',
        name: 'New User',
      });

      const createdDate = new Date().toISOString();
      prismaMock.membership.create.mockResolvedValue({
        id: 'new-membership-admin-uuid',
        userId: targetUserId,
        workspaceId: validWorkspaceId,
        role: 'ADMIN',
        createdAt: createdDate,
        user: {
          id: targetUserId,
          email: 'newuser@example.com',
          name: 'New User',
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/workspaces/${validWorkspaceId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newuser@example.com', role: 'ADMIN' })
        .expect(201);

      const body = res.body as { role: string; user: { email: string } };
      expect(body.role).toBe('ADMIN');
      expect(body.user.email).toBe('newuser@example.com');
    });
  });

  describe('Workspace Access & Tenant Boundaries', () => {
    it('rejects unauthenticated workspace access with 401', async () => {
      await request(app.getHttpServer())
        .get(`/workspaces/${validWorkspaceId}/access`)
        .expect(401);
    });

    it('rejects invalid workspace UUID format with 400', async () => {
      await request(app.getHttpServer())
        .get('/workspaces/not-a-valid-uuid/access')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(400);
    });

    it('rejects non-member with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/workspaces/${validWorkspaceId}/access`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);
    });

    it('grants access to authorized workspace member with 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/workspaces/${validWorkspaceId}/access`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Workspace access granted',
        workspaceId: validWorkspaceId,
        userId: memberUserId,
      });
    });
  });

  describe('Task CRUD and Validation', () => {
    describe('POST /workspaces/:workspaceId/tasks', () => {
      it('rejects unauthenticated request with 401', async () => {
        await request(app.getHttpServer())
          .post(`/workspaces/${validWorkspaceId}/tasks`)
          .send({ title: 'Task 1' })
          .expect(401);
      });

      it('rejects non-member with 403', async () => {
        await request(app.getHttpServer())
          .post(`/workspaces/${validWorkspaceId}/tasks`)
          .set('Authorization', `Bearer ${nonMemberToken}`)
          .send({ title: 'Task 1' })
          .expect(403);
      });

      it('rejects unknown properties in task body with 400', async () => {
        await request(app.getHttpServer())
          .post(`/workspaces/${validWorkspaceId}/tasks`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            title: 'Task 1',
            hackedField: 'malicious',
          })
          .expect(400);
      });

      it('rejects empty or whitespace title with 400', async () => {
        await request(app.getHttpServer())
          .post(`/workspaces/${validWorkspaceId}/tasks`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ title: '   ' })
          .expect(400);
      });

      it('rejects invalid status enum with 400', async () => {
        await request(app.getHttpServer())
          .post(`/workspaces/${validWorkspaceId}/tasks`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            title: 'Task 1',
            status: 'INVALID_STATUS',
          })
          .expect(400);
      });

      it('creates task with valid fields and sets creator from token', async () => {
        const createdTask = {
          id: validTaskId,
          workspaceId: validWorkspaceId,
          createdById: memberUserId,
          title: 'Implement Security Audit',
          description: 'Harden guards and pipes',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        prismaMock.task.create.mockResolvedValue(createdTask);

        const res = await request(app.getHttpServer())
          .post(`/workspaces/${validWorkspaceId}/tasks`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            title: '  Implement Security Audit  ',
            description: 'Harden guards and pipes',
            status: TaskStatus.TODO,
            priority: TaskPriority.HIGH,
          })
          .expect(201);

        expect(res.body).toEqual(createdTask);
        expect(prismaMock.task.create).toHaveBeenCalledWith({
          data: {
            workspaceId: validWorkspaceId,
            createdById: memberUserId,
            title: 'Implement Security Audit',
            description: 'Harden guards and pipes',
            status: TaskStatus.TODO,
            priority: TaskPriority.HIGH,
          },
        });
      });
    });

    describe('GET /workspaces/:workspaceId/tasks', () => {
      it('rejects unauthenticated task listing with 401', async () => {
        await request(app.getHttpServer())
          .get(`/workspaces/${validWorkspaceId}/tasks`)
          .expect(401);
      });

      it('rejects non-member task listing with 403', async () => {
        await request(app.getHttpServer())
          .get(`/workspaces/${validWorkspaceId}/tasks`)
          .set('Authorization', `Bearer ${nonMemberToken}`)
          .expect(403);
      });

      it('rejects invalid pagination parameters with 400', async () => {
        await request(app.getHttpServer())
          .get(`/workspaces/${validWorkspaceId}/tasks?limit=101`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);

        await request(app.getHttpServer())
          .get(`/workspaces/${validWorkspaceId}/tasks?page=0`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);
      });

      it('lists tasks with stable pagination structure scoped to workspace', async () => {
        const tasks = [
          {
            id: validTaskId,
            workspaceId: validWorkspaceId,
            title: 'Task A',
            version: 1,
          },
        ];
        prismaMock.$transaction.mockResolvedValue([tasks, 1]);

        const res = await request(app.getHttpServer())
          .get(
            `/workspaces/${validWorkspaceId}/tasks?page=1&limit=10&search=Task`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(res.body).toEqual({
          data: tasks,
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        });
      });
    });

    describe('GET /workspaces/:workspaceId/tasks/:taskId', () => {
      it('rejects invalid task UUID format with 400', async () => {
        await request(app.getHttpServer())
          .get(`/workspaces/${validWorkspaceId}/tasks/not-a-valid-uuid`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(400);
      });

      it('returns 404 when task is absent or belongs to another workspace', async () => {
        prismaMock.task.findFirst.mockResolvedValue(null);

        await request(app.getHttpServer())
          .get(`/workspaces/${validWorkspaceId}/tasks/${validTaskId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(404);

        expect(prismaMock.task.findFirst).toHaveBeenCalledWith({
          where: { id: validTaskId, workspaceId: validWorkspaceId },
        });
      });

      it('returns task for member when it exists in current workspace', async () => {
        const task = {
          id: validTaskId,
          workspaceId: validWorkspaceId,
          title: 'My Task',
          version: 1,
        };
        prismaMock.task.findFirst.mockResolvedValue(task);

        const res = await request(app.getHttpServer())
          .get(`/workspaces/${validWorkspaceId}/tasks/${validTaskId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(res.body).toEqual(task);
      });
    });

    describe('PATCH /workspaces/:workspaceId/tasks/:taskId', () => {
      it('rejects update without version query parameter with 400', async () => {
        await request(app.getHttpServer())
          .patch(`/workspaces/${validWorkspaceId}/tasks/${validTaskId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ title: 'New Title' })
          .expect(400);
      });

      it('rejects update with non-integer version query parameter with 400', async () => {
        await request(app.getHttpServer())
          .patch(
            `/workspaces/${validWorkspaceId}/tasks/${validTaskId}?version=1.5`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ title: 'New Title' })
          .expect(400);
      });

      it('returns 404 when updating non-existent or cross-workspace task', async () => {
        prismaMock.task.updateMany.mockResolvedValue({ count: 0 });
        prismaMock.task.findFirst.mockResolvedValue(null);

        await request(app.getHttpServer())
          .patch(
            `/workspaces/${validWorkspaceId}/tasks/${validTaskId}?version=1`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ title: 'Updated Title' })
          .expect(404);
      });

      it('returns 409 Conflict when expected version is stale', async () => {
        prismaMock.task.updateMany.mockResolvedValue({ count: 0 });
        prismaMock.task.findFirst.mockResolvedValue({ id: validTaskId });

        await request(app.getHttpServer())
          .patch(
            `/workspaces/${validWorkspaceId}/tasks/${validTaskId}?version=1`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ title: 'Updated Title' })
          .expect(409);
      });

      it('successfully updates task and increments version when expected version matches', async () => {
        prismaMock.task.updateMany.mockResolvedValue({ count: 1 });
        const updatedTask = {
          id: validTaskId,
          workspaceId: validWorkspaceId,
          title: 'Updated Title',
          version: 2,
        };
        prismaMock.task.findFirstOrThrow.mockResolvedValue(updatedTask);

        const res = await request(app.getHttpServer())
          .patch(
            `/workspaces/${validWorkspaceId}/tasks/${validTaskId}?version=1`,
          )
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ title: 'Updated Title' })
          .expect(200);

        expect(res.body).toEqual(updatedTask);
        expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
          where: {
            id: validTaskId,
            workspaceId: validWorkspaceId,
            version: 1,
          },
          data: {
            title: 'Updated Title',
            version: { increment: 1 },
          },
        });
      });
    });

    describe('DELETE /workspaces/:workspaceId/tasks/:taskId', () => {
      it('returns 404 when deleting task belonging to another workspace', async () => {
        prismaMock.task.deleteMany.mockResolvedValue({ count: 0 });

        await request(app.getHttpServer())
          .delete(`/workspaces/${validWorkspaceId}/tasks/${validTaskId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(404);

        expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
          where: { id: validTaskId, workspaceId: validWorkspaceId },
        });
      });

      it('successfully deletes task belonging to workspace and returns 200', async () => {
        prismaMock.task.deleteMany.mockResolvedValue({ count: 1 });

        const res = await request(app.getHttpServer())
          .delete(`/workspaces/${validWorkspaceId}/tasks/${validTaskId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200);

        expect(res.body).toEqual({ message: 'Task deleted successfully' });
      });

      it('repeat delete returns 404', async () => {
        prismaMock.task.deleteMany.mockResolvedValue({ count: 0 });

        await request(app.getHttpServer())
          .delete(`/workspaces/${validWorkspaceId}/tasks/${validTaskId}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(404);
      });
    });
  });
});
