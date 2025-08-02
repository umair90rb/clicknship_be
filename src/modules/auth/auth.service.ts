import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthPayload } from 'src/types/auth';
import decrypt from 'src/utils/dcrypt';
import { RoleService } from '../role/role.service';
import { LoginDto } from './dtos/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject('TENANT_CONNECTION') private prisma: PrismaClient,
    private roleService: RoleService,
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
    return this.generateToken({ email: user.email, id: user.id });
  }

  async generateToken(payload: AuthPayload): Promise<{ access_token: string }> {
    const secret = await this.getTenantJwtSecret();
    const access_token = this.jwtService.sign(payload, {
      expiresIn: '12h',
      secret,
    });
    return { access_token };
  }

  async verifyToken(token: string): Promise<AuthPayload> {
    const secret = await this.getTenantJwtSecret();
    return this.jwtService.verify<AuthPayload>(token, { secret });
  }

  async getTenantJwtSecret(): Promise<string> {
    const { value } = await this.prisma.secret.findFirst({
      where: { key: 'jwt_secret' },
      select: { value: true },
    });
    if (!value) {
      throw new NotFoundException('jwt secret not found');
    }
    return decrypt(value, process.env.ENCRYPTION_KEY);
  }

  async getUserPermissions(userId: number) {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userRoleId = user.roleId;
    if (!userRoleId) {
      return [];
    }

    return this.roleService.getRolePermissions(userRoleId);
  }
}
