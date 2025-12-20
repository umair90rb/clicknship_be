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
import { SupportCaseService } from '../services/support-case.service';
import {
  CreateSupportCaseDto,
  ListSupportCasesDto,
} from '../dtos/support-case.dto';
import { ConfirmAttachmentsBodyDto } from '../dtos/attachment.dto';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';

@Controller('support/cases')
@UseGuards(AuthenticationGuard)
export class SupportCaseController {
  constructor(
    private readonly supportCaseService: SupportCaseService,
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  @Post('create')
  async create(
    @Tenant() tenant: TenantType,
    @RequestUser() requestUser: JwtTokenPayload,
    @Body() dto: CreateSupportCaseDto,
  ) {
    const user = await this.prismaTenant.user.findUnique({
      where: { id: requestUser.id },
      select: { id: true, email: true, phone: true },
    });

    return this.supportCaseService.create(tenant, user, dto);
  }

  @Post(':id/confirm-attachments')
  async confirmAttachments(
    @Param('id') id: string,
    @Body() body: ConfirmAttachmentsBodyDto,
  ) {
    return this.supportCaseService.confirmAttachments(id, body.attachments);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.supportCaseService.get(id);
  }

  @Post('list')
  async list(@Tenant() tenant: TenantType, @Body() body: ListSupportCasesDto) {
    return this.supportCaseService.listByTenant(tenant.tenantId, body);
  }
}
