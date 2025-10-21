import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { PostCommentDto } from '@/src/modules/order/dto/post-comment.dto';
import { RequestUser } from '@/src/types/auth';

@Injectable()
export class OrderCommentService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  create(orderId: number, body: PostCommentDto, user: RequestUser) {
    return this.prismaTenant.orderComment.create({
      data: { comment: body.comment, orderId, userId: user.id },
      relationLoadStrategy: 'join',
      select: {
        user: {
          select: { id: true, name: true },
        },
        userId: false,
        orderId: false,
        comment: true,
        createdAt: true,
        id: true,
      },
    });
  }
}
