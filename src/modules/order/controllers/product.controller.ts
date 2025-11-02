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
import { ProductService } from '@/src/modules/order/services/product.service';
import {
  CreateProductDto,
  ListProductBodyDto,
  SearchProductDto,
  UpdateProductDto,
} from '../dto/product.dto';

@Controller('products')
@UseGuards(AuthenticationGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async list(@Body() body: ListProductBodyDto) {
    return this.productService.list(body);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.productService.get(id);
  }

  @Post('search')
  async search(@Body() body: SearchProductDto) {
    return this.productService.find(body);
  }

  @Post('create')
  async create(
    @RequestUserDeco() user: RequestUser,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productService.create(user, createProductDto);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductDto,
  ) {
    return this.productService.update(user, id, updateDto);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productService.delete(user, id);
  }
}
