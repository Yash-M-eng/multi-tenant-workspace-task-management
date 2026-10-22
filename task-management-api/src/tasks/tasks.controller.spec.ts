import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../workspace-membership/guards/workspace-membership/workspace-membership.guard';
import { WorkspaceMembershipService } from '../workspace-membership/workspace-membership.service';
import { TaskPriority, TaskStatus } from './dto/create-task.dto';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    verifyAsync: jest.fn(),
  })),
}));

jest.mock('@nestjs/mapped-types', () => ({
  PartialType: (classRef: new () => unknown) => classRef,
}));

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;
  let createSpy: jest.SpyInstance;
  let findAllSpy: jest.SpyInstance;
  let findOneSpy: jest.SpyInstance;
  let updateSpy: jest.SpyInstance;
  let removeSpy: jest.SpyInstance;

  const mockTasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: WorkspaceMembershipService,
          useValue: { findMembership: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WorkspaceMembershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
    createSpy = jest.spyOn(tasksService, 'create');
    findAllSpy = jest.spyOn(tasksService, 'findAll');
    findOneSpy = jest.spyOn(tasksService, 'findOne');
    updateSpy = jest.spyOn(tasksService, 'update');
    removeSpy = jest.spyOn(tasksService, 'remove');
    jest.clearAllMocks();
  });

  const workspaceId = '00000000-0000-4000-8000-000000000001';
  const taskId = '00000000-0000-4000-8000-000000000002';
  const mockReq = {
    user: { id: 'user-1' },
  } as unknown as AuthenticatedRequest;

  describe('create', () => {
    it('should delegate create call to TasksService', async () => {
      const dto = {
        title: 'New Task',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      };
      mockTasksService.create.mockResolvedValue({ id: taskId, ...dto });

      const result = await controller.create(workspaceId, mockReq, dto);

      expect(createSpy).toHaveBeenCalledWith(workspaceId, 'user-1', dto);
      expect(result).toEqual({ id: taskId, ...dto });
    });
  });

  describe('findAll', () => {
    it('should delegate findAll call to TasksService', async () => {
      const query = { page: 1, limit: 10 };
      const expected = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockTasksService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(workspaceId, query);

      expect(findAllSpy).toHaveBeenCalledWith(workspaceId, query);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should delegate findOne call to TasksService', async () => {
      mockTasksService.findOne.mockResolvedValue({
        id: taskId,
        title: 'Task 1',
      });

      const result = await controller.findOne(workspaceId, taskId);

      expect(findOneSpy).toHaveBeenCalledWith(workspaceId, taskId);
      expect(result).toEqual({ id: taskId, title: 'Task 1' });
    });
  });

  describe('update', () => {
    it('should throw BadRequestException when version parameter is missing or empty', () => {
      expect(() =>
        controller.update(workspaceId, taskId, { title: 'Updated' }, ''),
      ).toThrow(BadRequestException);

      expect(() =>
        controller.update(
          workspaceId,
          taskId,
          { title: 'Updated' },
          undefined as unknown as string,
        ),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when version is not a safe integer', () => {
      expect(() =>
        controller.update(workspaceId, taskId, { title: 'Updated' }, 'abc'),
      ).toThrow(BadRequestException);

      expect(() =>
        controller.update(workspaceId, taskId, { title: 'Updated' }, '1.5'),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when version is less than 1', () => {
      expect(() =>
        controller.update(workspaceId, taskId, { title: 'Updated' }, '0'),
      ).toThrow(BadRequestException);

      expect(() =>
        controller.update(workspaceId, taskId, { title: 'Updated' }, '-2'),
      ).toThrow(BadRequestException);
    });

    it('should delegate to service when valid version is provided', async () => {
      const updated = { id: taskId, title: 'Updated', version: 2 };
      mockTasksService.update.mockResolvedValue(updated);

      const result = await controller.update(
        workspaceId,
        taskId,
        { title: 'Updated' },
        '1',
      );

      expect(updateSpy).toHaveBeenCalledWith(
        workspaceId,
        taskId,
        { title: 'Updated' },
        1,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should delegate remove call to TasksService', async () => {
      mockTasksService.remove.mockResolvedValue({
        message: 'Task deleted successfully',
      });

      const result = await controller.remove(workspaceId, taskId);

      expect(removeSpy).toHaveBeenCalledWith(workspaceId, taskId);
      expect(result).toEqual({ message: 'Task deleted successfully' });
    });
  });
});
