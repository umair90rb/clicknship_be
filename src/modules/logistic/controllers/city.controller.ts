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
import { CityService } from '../services/city.service';

@Controller('cities')
@UseGuards(AuthenticationGuard)
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Post()
  async list(@Body() body: any) {
    return this.cityService.list(body);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.cityService.get(id);
  }

  @Post('create')
  async create(@RequestUserDeco() user: RequestUser, @Body() createDto: any) {
    return this.cityService.create(createDto, user);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
  ) {
    return this.cityService.update(id, updateDto, user);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cityService.delete(id, user);
  }
}
