import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Param,
  Req,
} from '@nestjs/common';
import { RequestWithTenantAndUser } from '@/src/types/auth';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { BookingService } from '../services/booking.service';
import { CancelBookingDto, CreateBookingDto } from '../dtos/booking.dto';

@Controller('booking')
@UseGuards(AuthenticationGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('status/:cn')
  async status(@Req() req: RequestWithTenantAndUser, @Param('cn') cn: string) {
    return this.bookingService.status(cn, req);
  }

  @Post('create')
  async create(
    @Req() req: RequestWithTenantAndUser,
    @Body() createDto: CreateBookingDto,
  ) {
    return this.bookingService.create(createDto, req);
  }

  @Post('cancel')
  async cancel(
    @Req() req: RequestWithTenantAndUser,
    @Body() body: CancelBookingDto,
  ) {
    return this.bookingService.cancel(body.orderIds, req);
  }

  @Post('download-receipt')
  async receipt(
    @Req() req: RequestWithTenantAndUser,
    @Body('cns') cns: string[],
  ) {
    return this.bookingService.downloadReceipt(cns, req);
  }

  @Get('shipper-advice/:cn')
  async getShipperAdvice(
    @Req() req: RequestWithTenantAndUser,
    @Param('cn') cn: string,
  ) {
    return this.bookingService.getShipperAdvice(cn, req);
  }

  @Post('shipper-advice/create')
  async addShipperAdvice(
    @Req() req: RequestWithTenantAndUser,
    @Body() createDto: any,
  ) {
    return this.bookingService.addShipperAdvice(createDto, req);
  }
}
