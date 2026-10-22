import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Request } from 'express';
import { WorkspaceMembershipService } from '../../workspace-membership.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

@Injectable()
export class WorkspaceMembershipGuard implements CanActivate {
  constructor(private readonly membershipService: WorkspaceMembershipService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.id;
    const workspaceId = request.params?.workspaceId;

    if (typeof workspaceId !== 'string' || !workspaceId) {
      throw new ForbiddenException('Workspace context is required');
    }

    if (!userId) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (!isUUID(workspaceId)) {
      throw new BadRequestException('Invalid workspace ID format');
    }

    const membership = await this.membershipService.findMembership(
      userId,
      workspaceId,
    );

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return true;
  }
}
