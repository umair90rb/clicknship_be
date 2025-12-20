import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { FeedbackService } from '../services/feedback.service';
import { SupportCaseService } from '../services/support-case.service';
import { FeatureRequestService } from '../services/feature-request.service';
import { AttachmentService } from '../services/attachment.service';
import { ListFeedbackDto } from '../dtos/feedback.dto';
import {
  ListSupportCasesDto,
  UpdateSupportCaseStatusDto,
} from '../dtos/support-case.dto';
import {
  ListFeatureRequestsDto,
  UpdateFeatureRequestStatusDto,
} from '../dtos/feature-request.dto';

@Controller('admin/support')
@UseGuards(AuthenticationGuard)
export class AdminSupportController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly supportCaseService: SupportCaseService,
    private readonly featureRequestService: FeatureRequestService,
    private readonly attachmentService: AttachmentService,
  ) {}

  // === Feedback Admin APIs ===
  @Post('feedback/list')
  async listFeedback(@Body() body: ListFeedbackDto) {
    return this.feedbackService.list(body);
  }

  @Get('feedback/stats')
  async feedbackStats() {
    return this.feedbackService.getStats();
  }

  // === Support Cases Admin APIs ===
  @Post('cases/list')
  async listCases(@Body() body: ListSupportCasesDto) {
    return this.supportCaseService.list(body);
  }

  @Get('cases/:id')
  async getCase(@Param('id') id: string) {
    return this.supportCaseService.get(id);
  }

  @Patch('cases/:id/status')
  async updateCaseStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSupportCaseStatusDto,
  ) {
    return this.supportCaseService.updateStatus(id, dto);
  }

  @Delete('cases/:id')
  async deleteCase(@Param('id') id: string) {
    return this.supportCaseService.delete(id);
  }

  // === Feature Requests Admin APIs ===
  @Post('feature-requests/list')
  async listFeatureRequests(@Body() body: ListFeatureRequestsDto) {
    return this.featureRequestService.list(body);
  }

  @Get('feature-requests/:id')
  async getFeatureRequest(@Param('id') id: string) {
    return this.featureRequestService.get(id);
  }

  @Patch('feature-requests/:id/status')
  async updateFeatureRequestStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureRequestStatusDto,
  ) {
    return this.featureRequestService.updateStatus(id, dto);
  }

  @Delete('feature-requests/:id')
  async deleteFeatureRequest(@Param('id') id: string) {
    return this.featureRequestService.delete(id);
  }

  // === Attachment Admin APIs ===
  @Delete('attachments/:id')
  async deleteAttachment(@Param('id') id: string) {
    return this.attachmentService.deleteAttachment(id);
  }
}
