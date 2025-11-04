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
import { UnitService } from '../services/unit.service';
import { CreateUnitDto, UpdateUnitDto } from '../dto/unit.dto';

@Controller('unit')
@UseGuards(AuthenticationGuard)
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post()
  async list() {
    return this.unitService.list();
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.unitService.get(id);
  }

  @Post('create')
  async create(
    @RequestUserDeco() user: RequestUser,
    @Body() createDto: CreateUnitDto,
  ) {
    return this.unitService.create(user, createDto);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUnitDto,
  ) {
    return this.unitService.update(user, id, updateDto);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.unitService.delete(user, id);
  }
}
