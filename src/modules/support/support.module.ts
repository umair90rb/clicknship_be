import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { S3Service } from '@/src/services/s3.service';

import { FeedbackController } from './controllers/feedback.controller';
import { SupportCaseController } from './controllers/support-case.controller';
import { FeatureRequestController } from './controllers/feature-request.controller';
import { AdminSupportController } from './controllers/admin-support.controller';

import { FeedbackService } from './services/feedback.service';
import { SupportCaseService } from './services/support-case.service';
import { FeatureRequestService } from './services/feature-request.service';
import { AttachmentService } from './services/attachment.service';

@Module({
  imports: [AuthModule],
  controllers: [
    FeedbackController,
    SupportCaseController,
    FeatureRequestController,
    AdminSupportController,
  ],
  providers: [
    tenantConnectionProvider,
    PrismaMasterClient,
    S3Service,
    FeedbackService,
    SupportCaseService,
    FeatureRequestService,
    AttachmentService,
  ],
  exports: [FeedbackService, SupportCaseService, FeatureRequestService],
})
export class SupportModule {}
