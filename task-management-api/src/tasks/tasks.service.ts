import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        workspaceId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
      },
    });
  }

  async findAll(workspaceId: string, query: ListTasksDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const trimmedSearch = query.search?.trim();
    const status = query.status;
    const priority = query.priority;

    const where = {
      workspaceId,
      ...(trimmedSearch
        ? {
            title: {
              contains: trimmedSearch,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    };

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(workspaceId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        workspaceId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found in this workspace');
    }

    return task;
  }

  async update(
    workspaceId: string,
    taskId: string,
    dto: UpdateTaskDto,
    expectedVersion: number,
  ) {
    const result = await this.prisma.task.updateMany({
      where: {
        id: taskId,
        workspaceId,
        version: expectedVersion,
      },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const task = await this.prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        select: { id: true },
      });

      if (!task) {
        throw new NotFoundException('Task not found in this workspace');
      }

      throw new ConflictException(
        'Task was modified by another request. Fetch the latest version and retry.',
      );
    }

    return this.prisma.task.findFirstOrThrow({
      where: { id: taskId, workspaceId },
    });
  }

  async remove(workspaceId: string, taskId: string) {
    const result = await this.prisma.task.deleteMany({
      where: {
        id: taskId,
        workspaceId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Task not found in this workspace');
    }

    return {
      message: 'Task deleted successfully',
    };
  }
}
