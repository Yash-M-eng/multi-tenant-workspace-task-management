import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TaskPriority, TaskStatus } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;

  const prismaMock = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task within the given workspace', async () => {
      const dto = { title: 'Test task' };
      const task = {
        id: 'task-1',
        workspaceId: 'workspace-1',
        createdById: 'user-1',
        title: 'Test task',
      };

      prismaMock.task.create.mockResolvedValue(task);

      await expect(
        service.create('workspace-1', 'user-1', dto),
      ).resolves.toEqual(task);

      expect(prismaMock.task.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace-1',
          createdById: 'user-1',
          title: 'Test task',
          description: undefined,
          status: undefined,
          priority: undefined,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should scope listing to the workspace and return pagination metadata with deterministic sort', async () => {
      const tasks = [{ id: 'task-1', title: 'Test task' }];

      prismaMock.$transaction.mockResolvedValue([tasks, 1]);

      const result = await service.findAll('workspace-1', {
        page: 1,
        limit: 10,
      });

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        data: tasks,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should return totalPages 0 when there are no tasks', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      const result = await service.findAll('workspace-1', {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });

    it('should combine search, status, and priority filters properly', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      await service.findAll('workspace-1', {
        search: '  urgent bug  ',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        page: 2,
        limit: 5,
      });

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a task in the requested workspace', async () => {
      const task = { id: 'task-1', workspaceId: 'workspace-1' };
      prismaMock.task.findFirst.mockResolvedValue(task);

      await expect(service.findOne('workspace-1', 'task-1')).resolves.toEqual(
        task,
      );

      expect(prismaMock.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-1', workspaceId: 'workspace-1' },
      });
    });

    it('should throw NotFoundException when the task is absent', async () => {
      prismaMock.task.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('workspace-1', 'missing-task'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw NotFoundException when task belongs to another workspace', async () => {
      prismaMock.task.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('workspace-2', 'task-in-workspace-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-in-workspace-1', workspaceId: 'workspace-2' },
      });
    });
  });

  describe('update', () => {
    it('should update a task and increment version when the expected version matches', async () => {
      prismaMock.task.updateMany.mockResolvedValue({ count: 1 });

      const updatedTask = {
        id: 'task-1',
        workspaceId: 'workspace-1',
        version: 2,
      };
      prismaMock.task.findFirstOrThrow.mockResolvedValue(updatedTask);

      await expect(
        service.update('workspace-1', 'task-1', { title: 'Updated task' }, 1),
      ).resolves.toEqual(updatedTask);

      expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'task-1',
          workspaceId: 'workspace-1',
          version: 1,
        },
        data: {
          title: 'Updated task',
          version: { increment: 1 },
        },
      });
    });

    it('should throw NotFoundException when the task is absent', async () => {
      prismaMock.task.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.task.findFirst.mockResolvedValue(null);

      await expect(
        service.update('workspace-1', 'missing-task', { title: 'Update' }, 1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw NotFoundException when updating a task belonging to another workspace', async () => {
      prismaMock.task.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.task.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          'workspace-2',
          'task-in-workspace-1',
          { title: 'Update' },
          1,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'task-in-workspace-1',
          workspaceId: 'workspace-2',
          version: 1,
        },
        data: {
          title: 'Update',
          version: { increment: 1 },
        },
      });
    });

    it('should throw ConflictException for a stale version without mutating the task', async () => {
      prismaMock.task.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.task.findFirst.mockResolvedValue({ id: 'task-1', version: 2 });

      await expect(
        service.update('workspace-1', 'task-1', { title: 'Update' }, 1),
      ).rejects.toBeInstanceOf(ConflictException);

      // Verify findFirstOrThrow was NOT called since updateMany matched 0 rows
      expect(prismaMock.task.findFirstOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('concurrency simulation', () => {
    it('simulates concurrent updates with the same expected version: exactly one succeeds and one receives 409 conflict', async () => {
      // In PostgreSQL, atomic conditional update UPDATE ... WHERE version = 1 executes with row locks.
      // We simulate atomic DB state where the first update wins and updates version to 2, causing the second to match 0 rows.
      let simulatedDbTask = {
        id: 'task-concurrent-1',
        workspaceId: 'workspace-1',
        title: 'Original Title',
        version: 1,
      };

      prismaMock.task.updateMany.mockImplementation(
        ({
          where,
          data,
        }: {
          where: { id: string; workspaceId: string; version: number };
          data: { title?: string };
        }) => {
          if (
            where.id === simulatedDbTask.id &&
            where.workspaceId === simulatedDbTask.workspaceId &&
            where.version === simulatedDbTask.version
          ) {
            simulatedDbTask = {
              ...simulatedDbTask,
              ...data,
              version: simulatedDbTask.version + 1,
            };
            return Promise.resolve({ count: 1 });
          }
          return Promise.resolve({ count: 0 });
        },
      );

      prismaMock.task.findFirst.mockImplementation(
        ({ where }: { where: { id: string; workspaceId: string } }) => {
          if (
            where.id === simulatedDbTask.id &&
            where.workspaceId === simulatedDbTask.workspaceId
          ) {
            return Promise.resolve(simulatedDbTask);
          }
          return Promise.resolve(null);
        },
      );

      prismaMock.task.findFirstOrThrow.mockImplementation(
        ({ where }: { where: { id: string; workspaceId: string } }) => {
          if (
            where.id === simulatedDbTask.id &&
            where.workspaceId === simulatedDbTask.workspaceId
          ) {
            return Promise.resolve(simulatedDbTask);
          }
          return Promise.reject(new NotFoundException());
        },
      );

      // Both requests attempt update with expectedVersion = 1
      const update1 = service.update(
        'workspace-1',
        'task-concurrent-1',
        { title: 'Update A' },
        1,
      );
      const update2 = service.update(
        'workspace-1',
        'task-concurrent-1',
        { title: 'Update B' },
        1,
      );

      const results = await Promise.allSettled([update1, update2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one succeeds
      expect(fulfilled).toHaveLength(1);
      // Losing update receives 409 Conflict
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);

      // Final version in database incremented exactly once (from 1 to 2)
      expect(simulatedDbTask.version).toBe(2);
    });
  });

  describe('remove', () => {
    it('should delete a task in the requested workspace', async () => {
      prismaMock.task.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.remove('workspace-1', 'task-1')).resolves.toEqual({
        message: 'Task deleted successfully',
      });

      expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
        where: { id: 'task-1', workspaceId: 'workspace-1' },
      });
    });

    it('should throw NotFoundException when no task was deleted', async () => {
      prismaMock.task.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.remove('workspace-1', 'missing-task'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw NotFoundException when attempting to delete a task belonging to another workspace', async () => {
      prismaMock.task.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.remove('workspace-2', 'task-in-workspace-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
        where: { id: 'task-in-workspace-1', workspaceId: 'workspace-2' },
      });
    });
  });
});
