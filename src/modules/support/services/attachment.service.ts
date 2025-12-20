import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { S3Service } from '@/src/services/s3.service';
import {
  CreateAttachmentMetadataDto,
  ConfirmAttachmentUploadDto,
} from '../dtos/attachment.dto';

@Injectable()
export class AttachmentService {
  constructor(
    private prismaMaster: PrismaMasterClient,
    private s3Service: S3Service,
  ) {}

  async generateUploadUrl(
    folder: string,
    metadata: CreateAttachmentMetadataDto,
  ) {
    const result = await this.s3Service.generateUploadUrl(folder, {
      fileName: metadata.fileName,
      fileType: metadata.fileType,
      mimeType: metadata.mimeType,
      fileSize: metadata.fileSize,
    });

    return {
      ...result,
      metadata,
    };
  }

  async generateDownloadUrl(attachmentId: string): Promise<string> {
    const attachment = await this.prismaMaster.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return this.s3Service.generateDownloadUrl(attachment.s3Key);
  }

  async createAttachments(
    attachments: ConfirmAttachmentUploadDto[],
    parentId: string,
    parentType: 'supportCase' | 'featureRequest',
  ) {
    const data = attachments.map((a) => ({
      fileName: a.fileName,
      fileType: a.fileType,
      mimeType: a.mimeType,
      s3Key: a.key,
      s3Bucket: this.s3Service.getBucket(),
      fileSize: a.fileSize,
      ...(parentType === 'supportCase'
        ? { supportCaseId: parentId }
        : { featureRequestId: parentId }),
    }));

    await this.prismaMaster.attachment.createMany({ data });
  }

  async deleteAttachment(id: string) {
    const attachment = await this.prismaMaster.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.s3Service.deleteFile(attachment.s3Key);
    await this.prismaMaster.attachment.delete({ where: { id } });

    return { message: 'Attachment deleted successfully' };
  }
}
