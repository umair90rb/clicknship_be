import { Body, Controller, Post } from '@nestjs/common';
import { OnboardService } from './onboard.service';
import { OnboardTenantDto } from './dtos/onboard.dto';

@Controller('onboard')
export class OnboardController {
  constructor(private readonly onboardService: OnboardService) {}

  @Post()
  onboard(@Body() body: OnboardTenantDto) {
    return this.onboardService.onboard(body);
  }
}
