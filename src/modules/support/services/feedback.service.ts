import { Injectable } from '@nestjs/common';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { CreateFeedbackDto, ListFeedbackDto } from '../dtos/feedback.dto';
import { Tenant } from '@/src/types/tenant';

interface UserInfo {
  id: number;
  email: string;
  phone?: string;
}

@Injectable()
export class FeedbackService {
  constructor(private prismaMaster: PrismaMasterClient) {}

  private select = {
    id: true,
    tenantId: true,
    userId: true,
    userEmail: true,
    userPhone: true,
    stars: true,
    description: true,
    category: true,
    createdAt: true,
    updatedAt: true,
  };

  async create(tenant: Tenant, user: UserInfo, dto: CreateFeedbackDto) {
    const feedback = await this.prismaMaster.feedback.create({
      data: {
        tenantId: tenant.tenantId,
        userId: user.id,
        userEmail: user.email,
        userPhone: user.phone,
        stars: dto.stars,
        description: dto.description,
        category: dto.category,
      },
      select: this.select,
    });

    return { data: feedback };
  }

  async list(body: ListFeedbackDto) {
    const { skip, take, ...filters } = body;
    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.stars) {
      where.stars = filters.stars;
    }

    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    }

    const [total, data] = await Promise.all([
      this.prismaMaster.feedback.count({ where }),
      this.prismaMaster.feedback.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: this.select,
      }),
    ]);

    return {
      data,
      meta: { total, skip, take, ...filters },
    };
  }

  async listByTenant(tenantId: string, body: ListFeedbackDto) {
    return this.list({ ...body, tenantId });
  }

  async getStats(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};

    const [total, avgStars, byCategory] = await Promise.all([
      this.prismaMaster.feedback.count({ where }),
      this.prismaMaster.feedback.aggregate({
        where,
        _avg: { stars: true },
      }),
      this.prismaMaster.feedback.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
    ]);

    return {
      data: {
        total,
        averageStars: avgStars._avg.stars,
        byCategory,
      },
    };
  }
}
