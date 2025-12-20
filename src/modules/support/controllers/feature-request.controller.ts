import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { RequestUser } from '@/src/decorators/user.decorator';
import { Tenant } from '@/src/decorators/tenant.decorator';
import { Tenant as TenantType } from '@/src/types/tenant';
import { JwtTokenPayload } from '@/src/types/auth';
import { FeatureRequestService } from '../services/feature-request.service';
import {
  CreateFeatureRequestDto,
  ListFeatureRequestsDto,
} from '../dtos/feature-request.dto';
import { ConfirmAttachmentsBodyDto } from '../dtos/attachment.dto';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';

@Controller('support/feature-requests')
@UseGuards(AuthenticationGuard)
export class FeatureRequestController {
  constructor(
    private readonly featureRequestService: FeatureRequestService,
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  @Post('create')
  async create(
    @Tenant() tenant: TenantType,
    @RequestUser() requestUser: JwtTokenPayload,
    @Body() dto: CreateFeatureRequestDto,
  ) {
    const user = await this.prismaTenant.user.findUnique({
      where: { id: requestUser.id },
      select: { id: true, email: true, phone: true },
    });

    return this.featureRequestService.create(tenant, user, dto);
  }

  @Post(':id/confirm-attachments')
  async confirmAttachments(
    @Param('id') id: string,
    @Body() body: ConfirmAttachmentsBodyDto,
  ) {
    return this.featureRequestService.confirmAttachments(id, body.attachments);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.featureRequestService.get(id);
  }

  @Post('list')
  async list(
    @Tenant() tenant: TenantType,
    @Body() body: ListFeatureRequestsDto,
  ) {
    return this.featureRequestService.listByTenant(tenant.tenantId, body);
  }
}
