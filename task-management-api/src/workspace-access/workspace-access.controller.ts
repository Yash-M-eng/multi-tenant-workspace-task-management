import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../workspace-membership/guards/workspace-membership/workspace-membership.guard';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('workspaces/:workspaceId/access')
@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
export class WorkspaceAccessController {
  @Get()
  checkAccess(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      message: 'Workspace access granted',
      workspaceId,
      userId: request.user.id,
    };
  }
}
