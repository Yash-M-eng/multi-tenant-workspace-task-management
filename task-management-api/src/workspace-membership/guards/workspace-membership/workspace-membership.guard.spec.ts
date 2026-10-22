import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceMembershipService } from '../../workspace-membership.service';
import { WorkspaceMembershipGuard } from './workspace-membership.guard';

describe('WorkspaceMembershipGuard', () => {
  let guard: WorkspaceMembershipGuard;
  let membershipService: jest.Mocked<WorkspaceMembershipService>;
  let findMembershipSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceMembershipGuard,
        {
          provide: WorkspaceMembershipService,
          useValue: {
            findMembership: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<WorkspaceMembershipGuard>(WorkspaceMembershipGuard);
    membershipService = module.get(WorkspaceMembershipService);
    findMembershipSpy = jest.spyOn(membershipService, 'findMembership');
  });

  function createMockExecutionContext(
    params: Record<string, string | undefined>,
    user?: { id: string },
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ params, user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should throw ForbiddenException when workspaceId is missing in params', async () => {
    const context = createMockExecutionContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Workspace context is required'),
    );
  });

  it('should throw UnauthorizedException when request.user is missing', async () => {
    const context = createMockExecutionContext(
      { workspaceId: '11111111-1111-4111-8111-111111111111' },
      undefined,
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication is required'),
    );
  });

  it('should throw BadRequestException when workspaceId is not a valid UUID', async () => {
    const context = createMockExecutionContext(
      { workspaceId: 'invalid-workspace-uuid' },
      { id: 'user-uuid-1' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      new BadRequestException('Invalid workspace ID format'),
    );
  });

  it('should throw ForbiddenException when user is not a member of the workspace', async () => {
    membershipService.findMembership.mockResolvedValue(null);
    const validWorkspaceId = '00000000-0000-4000-8000-000000000001';

    const context = createMockExecutionContext(
      { workspaceId: validWorkspaceId },
      { id: 'user-uuid-1' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('You do not have access to this workspace'),
    );
    expect(findMembershipSpy).toHaveBeenCalledWith(
      'user-uuid-1',
      validWorkspaceId,
    );
  });

  it('should return true when user is a member of the workspace', async () => {
    const validWorkspaceId = '00000000-0000-4000-8000-000000000001';
    membershipService.findMembership.mockResolvedValue({
      userId: 'user-uuid-1',
      workspaceId: validWorkspaceId,
      role: 'MEMBER',
    });

    const context = createMockExecutionContext(
      { workspaceId: validWorkspaceId },
      { id: 'user-uuid-1' },
    );

    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(findMembershipSpy).toHaveBeenCalledWith(
      'user-uuid-1',
      validWorkspaceId,
    );
  });
});
