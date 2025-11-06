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
import { BrandService } from '../services/brand.service';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';

@Controller('brand')
@UseGuards(AuthenticationGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get('all')
  async list() {
    return this.brandService.list();
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.brandService.get(id);
  }

  @Post('create')
  async create(
    @RequestUserDeco() user: RequestUser,
    @Body() createDto: CreateBrandDto,
  ) {
    return this.brandService.create(user, createDto);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBrandDto,
  ) {
    return this.brandService.update(user, id, updateDto);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.brandService.delete(user, id);
  }
}
