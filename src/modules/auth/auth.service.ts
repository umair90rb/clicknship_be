import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dtos/auth.dto';
import { PrismaClient } from '@prisma/client';
import decrypt from 'src/utils/dcrypt';

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
    console.log('Password matched:', passwordMatched);
    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateToken({ email: user.email, userId: user.id });
  }

  async generateToken(payload: {
    email: string;
    userId: number | string;
  }): Promise<{ access_token: string }> {
    const { value } = await this.prisma.secret.findFirst({
      where: { key: 'jwt_secret' },
      select: { value: true },
    });
    const secret = decrypt(value, process.env.ENCRYPTION_KEY);
    const access_token = this.jwtService.sign(payload, {
      expiresIn: '4h',
      secret,
    });
    return { access_token };
  }
}
