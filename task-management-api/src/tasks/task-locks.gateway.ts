import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SocketUserData {
  id: string;
  email: string;
  name: string | null;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user?: SocketUserData;
  };
}

interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

interface LockRecord {
  taskId: string;
  workspaceId: string;
  userId: string;
  name: string;
  email: string;
  expiresAt: number;
  timer: NodeJS.Timeout;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TaskLocksGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TaskLocksGateway.name);
  private readonly locks = new Map<string, LockRecord>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const auth = client.handshake.auth as Record<string, unknown> | undefined;
      let token: string | undefined =
        typeof auth?.token === 'string' ? auth.token : undefined;

      if (!token) {
        const authHeader = client.handshake.headers.authorization;
        if (
          typeof authHeader === 'string' &&
          authHeader.startsWith('Bearer ')
        ) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        this.logger.warn(`Client ${client.id} missing token, disconnecting`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;
      this.logger.log(`Client ${client.id} connected for user ${user.email}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Auth failed for client ${client.id}: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user: SocketUserData | undefined = client.data.user;
    if (!user) return;

    this.logger.log(`Client ${client.id} disconnected (${user.email})`);

    for (const [taskId, lock] of this.locks.entries()) {
      if (lock.userId === user.id) {
        clearTimeout(lock.timer);
        this.locks.delete(taskId);
        this.server.to(`workspace:${lock.workspaceId}`).emit('task:unlocked', {
          taskId,
          workspaceId: lock.workspaceId,
        });
      }
    }
  }

  @SubscribeMessage('join:workspace')
  handleJoinWorkspace(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (!data?.workspaceId) return;
    const room = `workspace:${data.workspaceId}`;
    void client.join(room);

    const now = Date.now();
    const activeLocks: Array<{
      taskId: string;
      workspaceId: string;
      userId: string;
      name: string;
      email: string;
      expiresAt: number;
    }> = [];

    for (const lock of this.locks.values()) {
      if (lock.workspaceId === data.workspaceId && lock.expiresAt > now) {
        activeLocks.push({
          taskId: lock.taskId,
          workspaceId: lock.workspaceId,
          userId: lock.userId,
          name: lock.name,
          email: lock.email,
          expiresAt: lock.expiresAt,
        });
      }
    }

    client.emit('locks:current', activeLocks);
  }

  @SubscribeMessage('leave:workspace')
  handleLeaveWorkspace(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (!data?.workspaceId) return;
    void client.leave(`workspace:${data.workspaceId}`);
  }

  @SubscribeMessage('task:lock:acquire')
  handleAcquireLock(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { taskId: string; workspaceId: string },
  ) {
    const user: SocketUserData | undefined = client.data.user;
    if (!user || !data?.taskId || !data?.workspaceId) return;

    const { taskId, workspaceId } = data;
    const now = Date.now();
    const existing = this.locks.get(taskId);

    if (existing && existing.expiresAt > now && existing.userId !== user.id) {
      client.emit('task:lock:rejected', {
        taskId,
        lockedBy: {
          userId: existing.userId,
          name: existing.name,
          email: existing.email,
        },
        message: `Task is currently being edited by ${existing.name || existing.email}`,
      });
      return;
    }

    if (existing) {
      clearTimeout(existing.timer);
    }

    const ttlMs = 60 * 1000;
    const expiresAt = now + ttlMs;

    const timer = setTimeout(() => {
      this.locks.delete(taskId);
      this.server.to(`workspace:${workspaceId}`).emit('task:unlocked', {
        taskId,
        workspaceId,
      });
    }, ttlMs);

    const lockData: LockRecord = {
      taskId,
      workspaceId,
      userId: user.id,
      name: user.name ?? 'User',
      email: user.email,
      expiresAt,
      timer,
    };

    this.locks.set(taskId, lockData);

    const broadcastPayload = {
      taskId,
      workspaceId,
      userId: user.id,
      name: user.name ?? 'User',
      email: user.email,
      expiresAt,
    };

    this.server
      .to(`workspace:${workspaceId}`)
      .emit('task:locked', broadcastPayload);
  }

  @SubscribeMessage('task:lock:release')
  handleReleaseLock(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { taskId: string; workspaceId: string },
  ) {
    const user: SocketUserData | undefined = client.data.user;
    if (!user || !data?.taskId) return;

    const { taskId, workspaceId } = data;
    const existing = this.locks.get(taskId);

    if (existing && existing.userId === user.id) {
      clearTimeout(existing.timer);
      this.locks.delete(taskId);
      this.server
        .to(`workspace:${workspaceId || existing.workspaceId}`)
        .emit('task:unlocked', {
          taskId,
          workspaceId: workspaceId || existing.workspaceId,
        });
    }
  }
}
