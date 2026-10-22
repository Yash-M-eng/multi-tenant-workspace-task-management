import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../workspace-membership/guards/workspace-membership/workspace-membership.guard';
import { WorkspaceMembershipService } from '../workspace-membership/workspace-membership.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    verifyAsync: jest.fn(),
  })),
}));

describe('WorkspacesController', () => {
  let controller: WorkspacesController;
  let workspacesService: jest.Mocked<WorkspacesService>;
  let workspaceMembershipService: jest.Mocked<WorkspaceMembershipService>;
  let createWorkspaceSpy: jest.SpyInstance;
  let addMemberSpy: jest.SpyInstance;

  const mockWorkspacesService = {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findById: jest.fn(),
  };

  const mockWorkspaceMembershipService = {
    addMember: jest.fn(),
    listMembers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        {
          provide: WorkspacesService,
          useValue: mockWorkspacesService,
        },
        {
          provide: WorkspaceMembershipService,
          useValue: mockWorkspaceMembershipService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(WorkspaceMembershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WorkspacesController>(WorkspacesController);
    workspacesService = module.get(WorkspacesService);
    workspaceMembershipService = module.get(WorkspaceMembershipService);
    createWorkspaceSpy = jest.spyOn(workspacesService, 'create');
    addMemberSpy = jest.spyOn(workspaceMembershipService, 'addMember');
    jest.clearAllMocks();
  });

  const userId = '00000000-0000-4000-8000-000000000001';
  const workspaceId = '00000000-0000-4000-8000-000000000002';
  const mockReq = {
    user: { id: userId },
  } as unknown as AuthenticatedRequest;

  describe('findAll', () => {
    it('should delegate listing workspaces to WorkspacesService', async () => {
      const workspaces = [
        {
          id: workspaceId,
          name: 'Engineering',
          role: WorkspaceRole.OWNER,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockWorkspacesService.findAllForUser.mockResolvedValue(workspaces);

      const result = await controller.findAll(mockReq);

      expect(mockWorkspacesService.findAllForUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(workspaces);
    });
  });

  describe('findOne', () => {
    it('should delegate finding a single workspace to WorkspacesService', async () => {
      const workspace = {
        id: workspaceId,
        name: 'Engineering',
        role: WorkspaceRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockWorkspacesService.findById.mockResolvedValue(workspace);

      const result = await controller.findOne(workspaceId, mockReq);

      expect(mockWorkspacesService.findById).toHaveBeenCalledWith(
        workspaceId,
        userId,
      );
      expect(result).toEqual(workspace);
    });
  });

  describe('create', () => {
    it('should delegate workspace creation to WorkspacesService', async () => {
      const dto = { name: 'Engineering' };
      const created = {
        id: workspaceId,
        name: 'Engineering',
        role: WorkspaceRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockWorkspacesService.create.mockResolvedValue(created);

      const result = await controller.create(mockReq, dto);

      expect(createWorkspaceSpy).toHaveBeenCalledWith(userId, dto);
      expect(result).toEqual(created);
    });
  });

  describe('getMembers', () => {
    it('should delegate listing members to WorkspaceMembershipService', async () => {
      const members = [
        {
          id: 'membership-1',
          userId,
          workspaceId,
          role: WorkspaceRole.OWNER,
          createdAt: new Date(),
          user: { id: userId, email: 'owner@example.com', name: 'Owner' },
        },
      ];
      mockWorkspaceMembershipService.listMembers.mockResolvedValue(members);

      const result = await controller.getMembers(workspaceId);

      expect(mockWorkspaceMembershipService.listMembers).toHaveBeenCalledWith(
        workspaceId,
      );
      expect(result).toEqual(members);
    });
  });

  describe('addMember', () => {
    it('should delegate adding member to WorkspaceMembershipService', async () => {
      const dto = { email: 'user@example.com', role: WorkspaceRole.MEMBER };
      const expected = {
        id: 'membership-1',
        workspaceId,
        role: WorkspaceRole.MEMBER,
        createdAt: new Date(),
        user: { id: 'u1', email: 'user@example.com', name: 'User' },
      };
      mockWorkspaceMembershipService.addMember.mockResolvedValue(expected);

      const result = await controller.addMember(workspaceId, mockReq, dto);

      expect(addMemberSpy).toHaveBeenCalledWith(userId, workspaceId, dto);
      expect(result).toEqual(expected);
    });
  });
});
