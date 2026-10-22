import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    verifyAsync: jest.fn(),
  })),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get(JwtService);
  });

  function createMockExecutionContext(headers: Record<string, string>): {
    context: ExecutionContext;
    request: Record<string, unknown>;
  } {
    const request: Record<string, unknown> = { headers };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  it('should throw UnauthorizedException when authorization header is missing', async () => {
    const { context } = createMockExecutionContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Access token is required'),
    );
  });

  it('should throw UnauthorizedException when authorization header does not start with Bearer', async () => {
    const { context } = createMockExecutionContext({
      authorization: 'Basic dXNlcjpwYXNz',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Access token is required'),
    );
  });

  it('should throw UnauthorizedException when token after Bearer is empty', async () => {
    const { context } = createMockExecutionContext({
      authorization: 'Bearer   ',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Access token is required'),
    );
  });

  it('should throw UnauthorizedException when jwt verification fails', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
    const { context } = createMockExecutionContext({
      authorization: 'Bearer invalid.token.jwt',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired access token'),
    );
  });

  it('should throw UnauthorizedException when payload sub is missing or non-string', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 123 });
    const { context } = createMockExecutionContext({
      authorization: 'Bearer valid.jwt.token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid access token'),
    );
  });

  it('should set request.user and return true for valid token', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-123' });
    const { context, request } = createMockExecutionContext({
      authorization: 'Bearer valid.jwt.token',
    });

    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({ id: 'user-uuid-123' });
  });
});
