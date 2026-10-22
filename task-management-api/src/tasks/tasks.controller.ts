import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMembershipGuard } from '../workspace-membership/guards/workspace-membership/workspace-membership.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('workspaces/:workspaceId/tasks')
@UseGuards(JwtAuthGuard, WorkspaceMembershipGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(workspaceId, request.user.id, dto);
  }

  @Get()
  findAll(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Query() query: ListTasksDto,
  ) {
    return this.tasksService.findAll(workspaceId, query);
  }

  @Get(':taskId')
  findOne(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
  ) {
    return this.tasksService.findOne(workspaceId, taskId);
  }

  @Patch(':taskId')
  update(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: UpdateTaskDto,
    @Query('version') version: string,
  ) {
    if (typeof version !== 'string' || !version.trim()) {
      throw new BadRequestException(
        'A valid positive version query parameter is required',
      );
    }

    const expectedVersion = Number(version);

    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(
        'A valid positive version query parameter is required',
      );
    }

    return this.tasksService.update(workspaceId, taskId, dto, expectedVersion);
  }

  @Delete(':taskId')
  remove(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
  ) {
    return this.tasksService.remove(workspaceId, taskId);
  }
}
