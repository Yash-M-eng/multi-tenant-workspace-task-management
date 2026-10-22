import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

import { WorkspaceMembershipModule } from '../workspace-membership/workspace-membership.module';

@Module({
  imports: [AuthModule, WorkspaceMembershipModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, JwtAuthGuard],
})
export class WorkspacesModule {}
