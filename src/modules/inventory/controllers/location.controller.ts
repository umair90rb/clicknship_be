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
import { ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { LocationService } from '../services/location.service';
import { CreateLocationDto, UpdateLocationDto } from '../dtos/inventory.dto';

@ApiTags('Inventory - Locations')
@Controller('inventory/location')
@UseGuards(AuthenticationGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  async list() {
    return this.locationService.list();
  }

  @Get('default')
  async getDefault() {
    return this.locationService.getDefaultLocation();
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.get(id);
  }

  @Post('create')
  async create(@Body() createDto: CreateLocationDto) {
    return this.locationService.create(createDto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLocationDto,
  ) {
    return this.locationService.update(id, updateDto);
  }

  @Patch(':id/set-default')
  async setDefault(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.setDefaultLocation(id);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.delete(id);
  }
}
