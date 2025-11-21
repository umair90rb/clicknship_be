import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequestUser } from '@/src/types/auth';
import { RequestUser as RequestUserDeco } from '@/src/decorators/user.decorator';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { CourierService } from '../services/courier.service';
import { AVAILABLE_COURIER_INTEGRATION_LIST } from '../constants/available-courier';
import {
  CreateCourierIntegrationDto,
  ListCourierIntegrationDto,
  UpdateCourierIntegrationDto,
} from '../dtos/courier.dto';

@Controller('couriers')
@UseGuards(AuthenticationGuard)
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  @Get('available-integrations')
  async availableIntegrations() {
    return AVAILABLE_COURIER_INTEGRATION_LIST;
  }

  @Post()
  async list(@Body() body: ListCourierIntegrationDto) {
    return this.courierService.list(body);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.courierService.get(id);
  }

  @Post('create')
  async create(
    @RequestUserDeco() user: RequestUser,
    @Body() createDto: CreateCourierIntegrationDto,
  ) {
    return this.courierService.create(createDto, user);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCourierIntegrationDto,
  ) {
    return this.courierService.update(id, updateDto, user);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.courierService.delete(id, user);
  }
}
