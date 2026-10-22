import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const prismaMock = {
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should atomically create workspace and owner membership in a transaction', async () => {
      const createdWorkspace = {
        id: 'workspace-uuid-1',
        name: 'Engineering Team',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const txMock = {
        workspace: {
          create: jest.fn().mockResolvedValue(createdWorkspace),
        },
        membership: {
          create: jest.fn().mockResolvedValue({
            id: 'membership-uuid-1',
            userId: 'user-uuid-1',
            workspaceId: 'workspace-uuid-1',
            role: 'OWNER',
          }),
        },
      };

      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof txMock) => Promise<unknown>) => {
          return callback(txMock);
        },
      );

      const result = await service.create('user-uuid-1', {
        name: '  Engineering Team  ',
      });

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.workspace.create).toHaveBeenCalledWith({
        data: { name: 'Engineering Team' },
      });
      expect(txMock.membership.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-1',
          workspaceId: 'workspace-uuid-1',
          role: 'OWNER',
        },
      });
      expect(result).toEqual({
        ...createdWorkspace,
        role: 'OWNER',
      });
    });
  });
});
