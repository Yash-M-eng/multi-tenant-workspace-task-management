import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceMembershipService } from './workspace-membership.service';

describe('WorkspaceMembershipService', () => {
  let service: WorkspaceMembershipService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceMembershipService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<WorkspaceMembershipService>(
      WorkspaceMembershipService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMembership', () => {
    it("should find a user's workspace membership", async () => {
      const membership = {
        userId: 'user-123',
        workspaceId: 'workspace-123',
        role: WorkspaceRole.OWNER,
      };

      prismaMock.membership.findUnique.mockResolvedValue(membership);

      await expect(
        service.findMembership('user-123', 'workspace-123'),
      ).resolves.toEqual(membership);

      expect(prismaMock.membership.findUnique).toHaveBeenCalledWith({
        where: {
          userId_workspaceId: {
            userId: 'user-123',
            workspaceId: 'workspace-123',
          },
        },
        select: {
          userId: true,
          workspaceId: true,
          role: true,
        },
      });
    });

    it('should return null when the user is not a member', async () => {
      prismaMock.membership.findUnique.mockResolvedValue(null);

      await expect(
        service.findMembership('user-123', 'workspace-456'),
      ).resolves.toBeNull();
    });
  });

  describe('addMember', () => {
    const requesterId = 'requester-uuid-1';
    const workspaceId = 'workspace-uuid-1';
    const targetUserId = 'target-user-uuid-2';
    const targetEmail = 'newmember@example.com';

    it('should disallow assigning the OWNER role with BadRequestException', async () => {
      await expect(
        service.addMember(requesterId, workspaceId, {
          email: targetEmail,
          role: WorkspaceRole.OWNER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw ForbiddenException if requester has no membership in workspace', async () => {
      prismaMock.membership.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(requesterId, workspaceId, {
          email: targetEmail,
          role: WorkspaceRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException if requester is a regular MEMBER', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        userId: requesterId,
        workspaceId,
        role: WorkspaceRole.MEMBER,
      });

      await expect(
        service.addMember(requesterId, workspaceId, {
          email: targetEmail,
          role: WorkspaceRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException if requester is an ADMIN trying to add an ADMIN', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        userId: requesterId,
        workspaceId,
        role: WorkspaceRole.ADMIN,
      });

      await expect(
        service.addMember(requesterId, workspaceId, {
          email: targetEmail,
          role: WorkspaceRole.ADMIN,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw NotFoundException if target user email does not exist', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        userId: requesterId,
        workspaceId,
        role: WorkspaceRole.OWNER,
      });
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(requesterId, workspaceId, {
          email: 'nonexistent@example.com',
          role: WorkspaceRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    });

    it('should throw ConflictException if target user is already a member', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          userId: requesterId,
          workspaceId,
          role: WorkspaceRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'existing-membership-id',
        });

      prismaMock.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: targetEmail,
        name: 'Target User',
      });

      await expect(
        service.addMember(requesterId, workspaceId, {
          email: targetEmail,
          role: WorkspaceRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should throw ConflictException when Prisma throws P2002 on concurrent duplicate', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          userId: requesterId,
          workspaceId,
          role: WorkspaceRole.OWNER,
        })
        .mockResolvedValueOnce(null);

      prismaMock.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: targetEmail,
        name: 'Target User',
      });

      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.0.0' },
      );
      prismaMock.membership.create.mockRejectedValue(p2002Error);

      await expect(
        service.addMember(requesterId, workspaceId, {
          email: targetEmail,
          role: WorkspaceRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('owner can successfully add user with role ADMIN', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          userId: requesterId,
          workspaceId,
          role: WorkspaceRole.OWNER,
        })
        .mockResolvedValueOnce(null);

      prismaMock.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: targetEmail,
        name: 'Target User',
      });

      const createdDate = new Date();
      prismaMock.membership.create.mockResolvedValue({
        id: 'new-membership-id',
        userId: targetUserId,
        workspaceId,
        role: WorkspaceRole.ADMIN,
        createdAt: createdDate,
        user: {
          id: targetUserId,
          email: targetEmail,
          name: 'Target User',
        },
      });

      const result = await service.addMember(requesterId, workspaceId, {
        email: '  NEWMEMBER@example.com  ',
        role: WorkspaceRole.ADMIN,
      });

      expect(prismaMock.membership.create).toHaveBeenCalledWith({
        data: {
          userId: targetUserId,
          workspaceId,
          role: WorkspaceRole.ADMIN,
        },
        select: {
          id: true,
          userId: true,
          workspaceId: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: 'new-membership-id',
        workspaceId,
        role: WorkspaceRole.ADMIN,
        createdAt: createdDate,
        user: {
          id: targetUserId,
          email: targetEmail,
          name: 'Target User',
        },
      });
    });

    it('admin can successfully add user with role MEMBER', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          userId: requesterId,
          workspaceId,
          role: WorkspaceRole.ADMIN,
        })
        .mockResolvedValueOnce(null);

      prismaMock.user.findUnique.mockResolvedValue({
        id: targetUserId,
        email: targetEmail,
        name: 'Target User',
      });

      const createdDate = new Date();
      prismaMock.membership.create.mockResolvedValue({
        id: 'new-membership-id-2',
        userId: targetUserId,
        workspaceId,
        role: WorkspaceRole.MEMBER,
        createdAt: createdDate,
        user: {
          id: targetUserId,
          email: targetEmail,
          name: 'Target User',
        },
      });

      const result = await service.addMember(requesterId, workspaceId, {
        email: targetEmail,
        role: WorkspaceRole.MEMBER,
      });

      expect(result.role).toBe(WorkspaceRole.MEMBER);
    });
  });
});
