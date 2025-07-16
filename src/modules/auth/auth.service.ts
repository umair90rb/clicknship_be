import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dtos/auth.dto';
import { PrismaClient } from '@prisma/client';
import decrypt from 'src/utils/dcrypt';
import { AuthPayload } from 'src/types/auth';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject('TENANT_CONNECTION') private prisma: PrismaClient,
  ) {}

  async login(credentials: LoginDto): Promise<{ access_token: string }> {
    const { email, password } = credentials;
    const user = await this.prisma.user.findFirst({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatched = await bcrypt.compare(password, user.password);

    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateToken({ email: user.email, userId: user.id });
  }

  async generateToken(payload: {
    email: string;
    userId: number | string;
  }): Promise<{ access_token: string }> {
    const secret = await this.getTenantJwtSecret();
    const access_token = this.jwtService.sign(payload, {
      expiresIn: '4h',
      secret,
    });
    return { access_token };
  }

  async verifyToken(token: string): Promise<AuthPayload> {
    const secret = await this.getTenantJwtSecret();
    try {
      const decoded = this.jwtService.verify<AuthPayload>(token, { secret });
      return decoded;
    } catch (error) {
      console.error('Token verification error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getTenantJwtSecret(): Promise<string> {
    const { value } = await this.prisma.secret.findFirst({
      where: { key: 'jwt_secret' },
      select: { value: true },
    });
    return decrypt(value, process.env.ENCRYPTION_KEY);
  }
}
