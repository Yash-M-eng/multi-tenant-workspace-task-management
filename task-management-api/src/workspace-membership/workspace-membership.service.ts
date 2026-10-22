import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class WorkspaceMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async findMembership(userId: string, workspaceId: string) {
    return this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      select: {
        userId: true,
        workspaceId: true,
        role: true,
      },
    });
  }

  async addMember(requesterId: string, workspaceId: string, dto: AddMemberDto) {
    if (dto.role === WorkspaceRole.OWNER) {
      throw new BadRequestException(
        'Cannot assign OWNER role through this endpoint',
      );
    }

    const requesterMembership = await this.findMembership(
      requesterId,
      workspaceId,
    );

    if (!requesterMembership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (requesterMembership.role === WorkspaceRole.MEMBER) {
      throw new ForbiddenException(
        'Only workspace owners and admins can add members',
      );
    }

    if (
      requesterMembership.role === WorkspaceRole.ADMIN &&
      dto.role !== WorkspaceRole.MEMBER
    ) {
      throw new ForbiddenException(
        'Admins can only add users with the MEMBER role',
      );
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    const targetUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException(
        'User with this email was not found. Please have the user register first.',
      );
    }

    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUser.id,
          workspaceId,
        },
      },
      select: { id: true },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this workspace');
    }

    try {
      const membership = await this.prisma.membership.create({
        data: {
          userId: targetUser.id,
          workspaceId,
          role: dto.role,
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

      return {
        id: membership.id,
        workspaceId: membership.workspaceId,
        role: membership.role,
        createdAt: membership.createdAt,
        user: membership.user,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'User is already a member of this workspace',
        );
      }
      throw error;
    }
  }

  async listMembers(workspaceId: string) {
    return this.prisma.membership.findMany({
      where: { workspaceId },
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
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
}
