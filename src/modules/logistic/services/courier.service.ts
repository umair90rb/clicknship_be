import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { RequestUser } from '@/src/types/auth';
import {
  CreateCourierIntegrationDto,
  ListCourierIntegrationDto,
  UpdateCourierIntegrationDto,
} from '../dtos/courier.dto';

@Injectable()
export class CourierService {
  private select = {
    id: true,
    name: true,
    courier: true,
    active: true,
    courierServiceFields: false,
    returnAddress: true,
    dispatchAddress: true,
  };
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  async list(body: ListCourierIntegrationDto) {
    const { skip, take, active, courier } = body;
    const where: any = { active: active === 'false' ? false : true };

    if (courier) {
      where.courier = courier;
    }

    const [total, data] = await Promise.all([
      this.prismaTenant.courierService.count({ where }),
      this.prismaTenant.courierService.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        select: this.select,
      }),
    ]);

    return {
      data,
      meta: { total, skip, take, active, courier },
    };
  }

  get(id: number) {
    return this.prismaTenant.courierService.findFirst({
      where: { id },
      select: { ...this.select, courierServiceFields: true },
    });
  }

  async create(body: CreateCourierIntegrationDto, user: RequestUser) {
    const { fields, ...integrationData } = body;
    return this.prismaTenant.courierService.create({
      data: {
        ...integrationData,
        courierServiceFields: {
          createMany: {
            data: fields.map((f) => ({ field: f.name, value: f.value })),
          },
        },
      },
      select: this.select,
    });
  }

  async update(
    id: number,
    body: UpdateCourierIntegrationDto,
    user: RequestUser,
  ) {
    // const { fields, ...integrationData } = body;
    // if (fields && fields.length) {
    //   const currentFields = await this.prismaTenant.courierServiceField.findMany({
    //     where: {
    //       courierService: { id },
    //       field: { in: fields.map((f) => f.name) },
    //     },
    //   });
    //   Promise.all(
    //     fields.map((f) =>
    //       this.prismaTenant.courierServiceField.update({
    //         where: { courierService: { id }, field: f.name },
    //         data: { field: f.name, value: f.value },
    //       }),
    //     ),
    //   );
    // }
    // return this.prismaTenant.courierService.update({
    //   where: { id },
    //   data: {
    //     ...integrationData,
    //     courierServiceFields: {
    //       update: {
    //         where: {
    //           id: 1,
    //         },
    //         data: fields.map((f) => ({ field: f.name, value: f.value })),
    //       },
    //     },
    //   },
    //   select: this.select,
    // });
  }
  delete(id: number, user: RequestUser) {
    return this.prismaTenant.courierService.update({
      where: { id },
      data: { active: false },
      select: this.select,
    });
  }
}
