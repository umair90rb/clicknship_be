import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import {
  CreateFeatureRequestDto,
  UpdateFeatureRequestStatusDto,
  ListFeatureRequestsDto,
} from '../dtos/feature-request.dto';
import { AttachmentService } from './attachment.service';
import { Tenant } from '@/src/types/tenant';

interface UserInfo {
  id: number;
  email: string;
  phone?: string;
}

@Injectable()
export class FeatureRequestService {
  private select = {
    id: true,
    tenantId: true,
    userId: true,
    userEmail: true,
    userPhone: true,
    title: true,
    description: true,
    status: true,
    adminNotes: true,
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

  async create(tenant: Tenant, user: UserInfo, dto: CreateFeatureRequestDto) {
    const { attachments, ...requestData } = dto;

    let attachmentUrls = [];
    if (attachments?.length) {
      attachmentUrls = await Promise.all(
        attachments.map((a) =>
          this.attachmentService.generateUploadUrl('feature-requests', a),
        ),
      );
    }

    const featureRequest = await this.prismaMaster.featureRequest.create({
      data: {
        tenantId: tenant.tenantId,
        userId: user.id,
        userEmail: user.email,
        userPhone: user.phone,
        title: requestData.title,
        description: requestData.description,
      },
      select: this.select,
    });

    return {
      data: featureRequest,
      attachmentUploadUrls: attachmentUrls,
    };
  }

  async confirmAttachments(requestId: string, attachments: any[]) {
    const featureRequest = await this.prismaMaster.featureRequest.findUnique({
      where: { id: requestId },
    });

    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }

    await this.attachmentService.createAttachments(
      attachments,
      requestId,
      'featureRequest',
    );

    return this.get(requestId);
  }

  async get(id: string) {
    const featureRequest = await this.prismaMaster.featureRequest.findUnique({
      where: { id },
      select: this.select,
    });

    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }

    const attachmentsWithUrls = await Promise.all(
      featureRequest.attachments.map(async (a) => ({
        ...a,
        downloadUrl: await this.attachmentService.generateDownloadUrl(a.id),
      })),
    );

    return {
      data: {
        ...featureRequest,
        attachments: attachmentsWithUrls,
      },
    };
  }

  async list(body: ListFeatureRequestsDto) {
    const { skip, take, ...filters } = body;
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters.title) {
      where.title = { contains: filters.title, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prismaMaster.featureRequest.count({ where }),
      this.prismaMaster.featureRequest.findMany({
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

  async listByTenant(tenantId: string, body: ListFeatureRequestsDto) {
    return this.list({ ...body, tenantId });
  }

  async updateStatus(id: string, dto: UpdateFeatureRequestStatusDto) {
    const featureRequest = await this.prismaMaster.featureRequest.findUnique({
      where: { id },
    });

    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }

    const updateData: any = {
      status: dto.status,
    };

    if (dto.adminNotes) {
      updateData.adminNotes = dto.adminNotes;
    }

    const updated = await this.prismaMaster.featureRequest.update({
      where: { id },
      data: updateData,
      select: this.select,
    });

    return { data: updated };
  }

  async delete(id: string) {
    const featureRequest = await this.prismaMaster.featureRequest.findUnique({
      where: { id },
    });

    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }

    await this.prismaMaster.featureRequest.delete({ where: { id } });

    return { message: 'Feature request deleted successfully' };
  }
}
