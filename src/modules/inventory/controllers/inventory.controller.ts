import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { RequestUser } from '@/src/decorators/user.decorator';
import { RequestUser as RequestUserType } from '@/src/types/auth';
import { InventoryService } from '../services/inventory.service';
import { MovementService } from '../services/movement.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  StockQueryDto,
  MovementQueryDto,
  ReserveStockDto,
  DeductStockDto,
  RestockDto,
  AdjustStockDto,
  ReleaseReservationDto,
} from '../dtos/inventory.dto';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(AuthenticationGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly movementService: MovementService,
  ) {}

  // ============ Inventory Items ============

  @Get('items')
  async listItems(@Query() query: StockQueryDto) {
    return this.inventoryService.listInventoryItems(query);
  }

  @Get('items/low-stock')
  async getLowStock(@Query('locationId') locationId?: number) {
    return this.inventoryService.getLowStockItems(locationId);
  }

  @Get('items/:id')
  async getItem(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.getInventoryItem(id);
  }

  @Post('items/create')
  async createItem(@Body() body: CreateInventoryItemDto) {
    return this.inventoryService.createInventoryItem(body);
  }

  @Patch('items/:id')
  async updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.updateInventoryItem(id, body);
  }

  // ============ Stock Level ============

  @Get('stock/:productId')
  async getStockLevel(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('locationId') locationId?: number,
  ) {
    return this.inventoryService.getStockLevel(productId, locationId);
  }

  // ============ Stock Operations ============

  @Post('reserve')
  async reserveStock(
    @RequestUser() user: RequestUserType,
    @Body() body: ReserveStockDto,
  ) {
    return this.inventoryService.reserveStock({
      ...body,
      userId: user.id,
    });
  }

  @Post('release')
  async releaseReservation(
    @RequestUser() user: RequestUserType,
    @Body() body: ReleaseReservationDto,
  ) {
    return this.inventoryService.releaseReservation({
      ...body,
      userId: user.id,
    });
  }

  @Post('deduct')
  async deductStock(
    @RequestUser() user: RequestUserType,
    @Body() body: DeductStockDto,
  ) {
    return this.inventoryService.deductStock({
      ...body,
      userId: user.id,
    });
  }

  @Post('restock')
  async restockFromReturn(
    @RequestUser() user: RequestUserType,
    @Body() body: RestockDto,
  ) {
    return this.inventoryService.restockFromReturn({
      ...body,
      userId: user.id,
    });
  }

  @Post('adjust')
  async adjustStock(
    @RequestUser() user: RequestUserType,
    @Body() body: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock({
      ...body,
      userId: user.id,
    });
  }

  // ============ Movements ============

  @Get('movements')
  async listMovements(@Query() query: MovementQueryDto) {
    return this.movementService.list(query);
  }

  @Get('movements/order/:orderId')
  async getMovementsByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.movementService.getByOrder(orderId);
  }

  @Get('movements/item/:inventoryItemId')
  async getMovementsByItem(
    @Param('inventoryItemId', ParseIntPipe) inventoryItemId: number,
  ) {
    return this.movementService.getByInventoryItem(inventoryItemId);
  }
}
