import { Module } from '@nestjs/common';
import { WorkspaceMembershipService } from './workspace-membership.service';
import { WorkspaceMembershipGuard } from './guards/workspace-membership/workspace-membership.guard';
import { WorkspaceAccessController } from '../workspace-access/workspace-access.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [WorkspaceMembershipService, WorkspaceMembershipGuard],
  exports: [WorkspaceMembershipService, WorkspaceMembershipGuard],
  controllers: [WorkspaceAccessController],
})
export class WorkspaceMembershipModule {}
