import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  })),
}));
jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const jwtMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user with normalized email and hashed password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pwd');

      const createdUser = {
        id: 'user-uuid-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };
      prismaMock.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        email: '  TEST@EXAMPLE.COM  ',
        password: 'Password123!',
        name: '  Test User  ',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed_pwd',
          name: 'Test User',
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(createdUser);
    });

    it('should set name to null when omitted or whitespace only', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pwd');
      prismaMock.user.create.mockResolvedValue({ id: 'user-1' });

      await service.register({
        email: 'user@example.com',
        password: 'Password123!',
        name: '   ',
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          passwordHash: 'hashed_pwd',
          name: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });
    });

    it('should throw ConflictException on Prisma P2002 error', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pwd');
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '6.0.0',
        },
      );
      prismaMock.user.create.mockRejectedValue(p2002Error);

      await expect(
        service.register({
          email: 'duplicate@example.com',
          password: 'Password123!',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pwd');
      prismaMock.user.create.mockRejectedValue(new Error('DB failure'));

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'Password123!',
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'unknown@example.com' },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
        },
      });
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pwd',
        name: 'User',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should return access token and user info on successful login', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pwd',
        name: 'User',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtMock.signAsync.mockResolvedValue('jwt_token_xyz');

      const result = await service.login({
        email: '  USER@EXAMPLE.COM  ',
        password: 'CorrectPassword!',
      });

      expect(jwtMock.signAsync).toHaveBeenCalledWith({
        sub: 'user-uuid-1',
      });
      expect(result).toEqual({
        accessToken: 'jwt_token_xyz',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: {
          id: 'user-uuid-1',
          email: 'user@example.com',
          name: 'User',
        },
      });
    });
  });
});
