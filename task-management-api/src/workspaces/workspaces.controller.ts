import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddMemberDto } from '../workspace-membership/dto/add-member.dto';
import { WorkspaceMembershipGuard } from '../workspace-membership/guards/workspace-membership/workspace-membership.guard';
import { WorkspaceMembershipService } from '../workspace-membership/workspace-membership.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly workspaceMembershipService: WorkspaceMembershipService,
  ) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.workspacesService.findAllForUser(request.user.id);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceMembershipGuard)
  findOne(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workspacesService.findById(workspaceId, request.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(request.user.id, dto);
  }

  @Get(':workspaceId/members')
  @UseGuards(WorkspaceMembershipGuard)
  getMembers(@Param('workspaceId', new ParseUUIDPipe()) workspaceId: string) {
    return this.workspaceMembershipService.listMembers(workspaceId);
  }

  @Post(':workspaceId/members')
  @UseGuards(WorkspaceMembershipGuard)
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaceMembershipService.addMember(
      request.user.id,
      workspaceId,
      dto,
    );
  }
}
