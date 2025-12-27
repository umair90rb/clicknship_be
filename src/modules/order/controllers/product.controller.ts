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
  CreateProductAttributeDto,
  CreateProductAttributeValueDto,
  CreateProductDto,
  CreateProductVariantDto,
  ListProductAttributeBodyDto,
  ListProductAttributeValueBodyDto,
  ListProductBodyDto,
  ListProductVariantBodyDto,
  SearchProductDto,
  UpdateProductAttributeDto,
  UpdateProductAttributeValueDto,
  UpdateProductDto,
  UpdateProductVariantDto,
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

  // Product Attribute Endpoints
  @Post('attributes')
  async listAttributes(@Body() body: ListProductAttributeBodyDto) {
    return this.productService.listAttributes(body);
  }

  @Get('attributes/:id')
  async getAttribute(@Param('id', ParseIntPipe) id: number) {
    return this.productService.getAttribute(id);
  }

  @Post('attributes/create')
  async createAttribute(@Body() body: CreateProductAttributeDto) {
    return this.productService.createAttribute(body);
  }

  @Patch('attributes/:id')
  async updateAttribute(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductAttributeDto,
  ) {
    return this.productService.updateAttribute(id, body);
  }

  @Delete('attributes/:id')
  async deleteAttribute(@Param('id', ParseIntPipe) id: number) {
    return this.productService.deleteAttribute(id);
  }

  // Product Attribute Value Endpoints
  @Post('attribute-values')
  async listAttributeValues(@Body() body: ListProductAttributeValueBodyDto) {
    return this.productService.listAttributeValues(body);
  }

  @Get('attribute-values/:id')
  async getAttributeValue(@Param('id', ParseIntPipe) id: number) {
    return this.productService.getAttributeValue(id);
  }

  @Post('attribute-values/create')
  async createAttributeValue(@Body() body: CreateProductAttributeValueDto) {
    return this.productService.createAttributeValue(body);
  }

  @Patch('attribute-values/:id')
  async updateAttributeValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductAttributeValueDto,
  ) {
    return this.productService.updateAttributeValue(id, body);
  }

  @Delete('attribute-values/:id')
  async deleteAttributeValue(@Param('id', ParseIntPipe) id: number) {
    return this.productService.deleteAttributeValue(id);
  }

  // Product Variant Endpoints
  @Post('variants')
  async listVariants(@Body() body: ListProductVariantBodyDto) {
    return this.productService.listVariants(body);
  }

  @Get('variants/:id')
  async getVariant(@Param('id', ParseIntPipe) id: number) {
    return this.productService.getVariant(id);
  }

  @Post('variants/create')
  async createVariant(@Body() body: CreateProductVariantDto) {
    return this.productService.createVariant(body);
  }

  @Patch('variants/:id')
  async updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductVariantDto,
  ) {
    return this.productService.updateVariant(id, body);
  }

  @Delete('variants/:id')
  async deleteVariant(@Param('id', ParseIntPipe) id: number) {
    return this.productService.deleteVariant(id);
  }
}
