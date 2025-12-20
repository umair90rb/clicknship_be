import { Controller, Post, Body, Get, UseGuards, Inject } from '@nestjs/common';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { RequestUser } from '@/src/decorators/user.decorator';
import { Tenant } from '@/src/decorators/tenant.decorator';
import { Tenant as TenantType } from '@/src/types/tenant';
import { JwtTokenPayload } from '@/src/types/auth';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto, ListFeedbackDto } from '../dtos/feedback.dto';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';

@Controller('support/feedback')
@UseGuards(AuthenticationGuard)
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  @Post('create')
  async create(
    @Tenant() tenant: TenantType,
    @RequestUser() requestUser: JwtTokenPayload,
    @Body() dto: CreateFeedbackDto,
  ) {
    const user = await this.prismaTenant.user.findUnique({
      where: { id: requestUser.id },
      select: { id: true, email: true, phone: true },
    });

    return this.feedbackService.create(tenant, user, dto);
  }

  @Post('list')
  async list(@Tenant() tenant: TenantType, @Body() body: ListFeedbackDto) {
    return this.feedbackService.listByTenant(tenant.tenantId, body);
  }

  @Get('stats')
  async stats(@Tenant() tenant: TenantType) {
    return this.feedbackService.getStats(tenant.tenantId);
  }
}
