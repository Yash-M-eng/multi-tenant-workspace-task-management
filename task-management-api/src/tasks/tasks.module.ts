import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskLocksGateway } from './task-locks.gateway';
import { AuthModule } from '../auth/auth.module';
import { WorkspaceMembershipModule } from '../workspace-membership/workspace-membership.module';

@Module({
  imports: [AuthModule, WorkspaceMembershipModule],
  controllers: [TasksController],
  providers: [TasksService, TaskLocksGateway],
})
export class TasksModule {}
