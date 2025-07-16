import { Controller, Get, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { AuthenticationGuard } from 'src/guards/authentication.guard';

@UseGuards(AuthenticationGuard)
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('all')
  getAllProducts() {
    return this.productService.getAllProducts();
  }
}
