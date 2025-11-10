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
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';

@Controller('categories')
@UseGuards(AuthenticationGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async list() {
    return this.categoryService.list();
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.get(id);
  }

  @Post('create')
  async create(
    @RequestUserDeco() user: RequestUser,
    @Body() createDto: CreateCategoryDto,
  ) {
    return this.categoryService.create(user, createDto);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(user, id, updateDto);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoryService.delete(user, id);
  }
}
