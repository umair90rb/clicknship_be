import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CreateUserDto,
  ListUserBodyDto,
  UpdateUserDto,
} from '../dtos/user.dto';
import { RequestUser } from '@/src/types/auth';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private select = {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: { select: { id: true, name: true } },
  };
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  async list(body: ListUserBodyDto) {
    const { skip, take, ...filters } = body;
    const where: any = {};

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    if (filters.phone) {
      where.phone = { contains: filters.phone, mode: 'insensitive' };
    }

    const [total, users] = await Promise.all([
      this.prismaTenant.user.count({ where }),
      this.prismaTenant.user.findMany({
        where,
        skip,
        take,
        select: this.select,
      }),
    ]);

    return {
      data: users,
      meta: { total, skip, take, ...filters },
    };
  }

  get(id: number) {}

  async create(data: CreateUserDto, user: RequestUser) {
    const { email, password } = data;
    const existed = await this.prismaTenant.user.findFirst({
      where: { email },
    });

    if (existed) {
      throw new BadRequestException('User with this email already exist');
    }

    data.password = await bcrypt.hash(password, 10);
    return this.prismaTenant.user.create({ data, select: this.select });
  }

  update(id: number, body: UpdateUserDto, user: RequestUser) {}
  delete(id: number, user: RequestUser) {}
}
