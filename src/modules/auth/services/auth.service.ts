import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as uuid from 'uuid';
import { JwtTokenPayload, IRequestWithUser } from 'src/types/auth';
import decrypt from 'src/utils/dcrypt';
import { LoginDto, RefreshDto } from '../dtos/auth.dto';
import { TENANT_CONNECTION_PROVIDER } from '../../../constants/common';
import { RoleService } from './role.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private roleService: RoleService,
  ) {}

  async login(
    credentials: LoginDto,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const { email, password } = credentials;
    const user = await this.prismaTenant.user.findFirst({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatched = await bcrypt.compare(password, user.password);

    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const access_token = await this.generateAccessToken({
      id: user.id,
    });
    const refresh_token = await this.generateRefreshToken(user.id);

    return { access_token, refresh_token };
  }

  async refresh(body: RefreshDto) {
    const { refreshToken } = body;
    const token = await this.prismaTenant.refreshToken.findFirst({
      where: { token: refreshToken, expiry: { gte: new Date() } },
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const access_token = await this.generateAccessToken({
      id: token.userId,
    });
    const refresh_token = await this.generateRefreshToken(token.userId);

    return { access_token, refresh_token };
  }

  async generateAccessToken(payload: JwtTokenPayload): Promise<string> {
    const secret = await this.getTenantJwtSecret();
    const token = this.jwtService.sign(payload, {
      expiresIn: '12h',
      secret,
    });
    return token;
  }

  async generateRefreshToken(userId: number): Promise<string> {
    const token = uuid.v4();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 3);
    await this.prismaTenant.refreshToken.upsert({
      where: { userId },
      create: { token, userId, expiry },
      update: { token, expiry },
    });
    return token;
  }

  async verifyToken(token: string): Promise<JwtTokenPayload> {
    const secret = await this.getTenantJwtSecret();
    return this.jwtService.verify<JwtTokenPayload>(token, { secret });
  }

  async getTenantJwtSecret(): Promise<string> {
    const { value } = await this.prismaTenant.secret.findFirst({
      where: { key: 'jwt_secret' },
      select: { value: true },
    });
    if (!value) {
      throw new NotFoundException('jwt secret not found');
    }
    return decrypt(value, process.env.ENCRYPTION_KEY);
  }

  async getUserPermissions(userId: number) {
    const user = await this.prismaTenant.user.findFirst({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userRoleId = user.roleId;
    if (!userRoleId) {
      return [];
    }

    return this.roleService.getRolePermissions(userRoleId);
  }

  async profile(user: IRequestWithUser) {
    return user;
  }
}
