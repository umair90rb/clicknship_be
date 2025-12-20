import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import {
  CreateSupportCaseDto,
  UpdateSupportCaseStatusDto,
  ListSupportCasesDto,
} from '../dtos/support-case.dto';
import { AttachmentService } from './attachment.service';
import { Tenant } from '@/src/types/tenant';
import { SupportCaseStatus } from '../enums/support-case-status.enum';

interface UserInfo {
  id: number;
  email: string;
  phone?: string;
}

@Injectable()
export class SupportCaseService {
  private select = {
    id: true,
    tenantId: true,
    userId: true,
    userEmail: true,
    userPhone: true,
    title: true,
    description: true,
    priority: true,
    status: true,
    adminNotes: true,
    resolvedAt: true,
    createdAt: true,
    updatedAt: true,
    attachments: {
      select: {
        id: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        fileSize: true,
      },
    },
  };

  constructor(
    private prismaMaster: PrismaMasterClient,
    private attachmentService: AttachmentService,
  ) {}

  async create(tenant: Tenant, user: UserInfo, dto: CreateSupportCaseDto) {
    const { attachments, ...caseData } = dto;

    let attachmentUrls = [];
    if (attachments?.length) {
      attachmentUrls = await Promise.all(
        attachments.map((a) =>
          this.attachmentService.generateUploadUrl('support-cases', a),
        ),
      );
    }

    const supportCase = await this.prismaMaster.supportCase.create({
      data: {
        tenantId: tenant.tenantId,
        userId: user.id,
        userEmail: user.email,
        userPhone: user.phone,
        title: caseData.title,
        description: caseData.description,
        priority: caseData.priority,
      },
      select: this.select,
    });

    return {
      data: supportCase,
      attachmentUploadUrls: attachmentUrls,
    };
  }

  async confirmAttachments(caseId: string, attachments: any[]) {
    const supportCase = await this.prismaMaster.supportCase.findUnique({
      where: { id: caseId },
    });

    if (!supportCase) {
      throw new NotFoundException('Support case not found');
    }

    await this.attachmentService.createAttachments(
      attachments,
      caseId,
      'supportCase',
    );

    return this.get(caseId);
  }

  async get(id: string) {
    const supportCase = await this.prismaMaster.supportCase.findUnique({
      where: { id },
      select: this.select,
    });

    if (!supportCase) {
      throw new NotFoundException('Support case not found');
    }

    const attachmentsWithUrls = await Promise.all(
      supportCase.attachments.map(async (a) => ({
        ...a,
        downloadUrl: await this.attachmentService.generateDownloadUrl(a.id),
      })),
    );

    return {
      data: {
        ...supportCase,
        attachments: attachmentsWithUrls,
      },
    };
  }

  async list(body: ListSupportCasesDto) {
    const { skip, take, ...filters } = body;
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters.title) {
      where.title = { contains: filters.title, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prismaMaster.supportCase.count({ where }),
      this.prismaMaster.supportCase.findMany({
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

  async listByTenant(tenantId: string, body: ListSupportCasesDto) {
    return this.list({ ...body, tenantId });
  }

  async updateStatus(id: string, dto: UpdateSupportCaseStatusDto) {
    const supportCase = await this.prismaMaster.supportCase.findUnique({
      where: { id },
    });

    if (!supportCase) {
      throw new NotFoundException('Support case not found');
    }

    const updateData: any = {
      status: dto.status,
    };

    if (dto.adminNotes) {
      updateData.adminNotes = dto.adminNotes;
    }

    if (dto.status === SupportCaseStatus.resolved) {
      updateData.resolvedAt = new Date();
    }

    const updated = await this.prismaMaster.supportCase.update({
      where: { id },
      data: updateData,
      select: this.select,
    });

    return { data: updated };
  }

  async delete(id: string) {
    const supportCase = await this.prismaMaster.supportCase.findUnique({
      where: { id },
    });

    if (!supportCase) {
      throw new NotFoundException('Support case not found');
    }

    await this.prismaMaster.supportCase.delete({ where: { id } });

    return { message: 'Support case deleted successfully' };
  }
}
