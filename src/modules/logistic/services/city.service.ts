import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { RequestUser } from '@/src/types/auth';
import { ListCityDto } from '../dtos/city.dto';

@Injectable()
export class CityService {
  private select = {
    id: true,
    city: true,
  };
  constructor(private prismaMaster: PrismaMasterClient) {}

  async list(body: ListCityDto) {
    const { skip, take, city } = body;
    const where: any = {};

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prismaMaster.city.count({ where }),
      this.prismaMaster.city.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        select: this.select,
        relationLoadStrategy: 'join',
      }),
    ]);

    return {
      data,
      meta: { total, skip, take, city },
    };
  }

  get(id: number) {
    return this.prismaMaster.city.findFirst({
      where: { id },
      select: {
        ...this.select,
        courierMappedCities: {
          select: {
            code: true,
            courier: true,
            courierCityId: true,
            mapped: true,
          },
        },
      },
    });
  }

  create(data: any, user: RequestUser) {}
  update(id: number, body: any, user: RequestUser) {}
  delete(id: number, user: RequestUser) {}
}
