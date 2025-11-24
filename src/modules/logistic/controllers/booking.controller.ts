import { Controller, Post, Body, Get, UseGuards, Param } from '@nestjs/common';
import { RequestUser } from '@/src/types/auth';
import { RequestUser as RequestUserDeco } from '@/src/decorators/user.decorator';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dtos/booking.dto';

@Controller('booking')
@UseGuards(AuthenticationGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('status/:cn')
  async status(@RequestUserDeco() user: RequestUser, @Param('cn') cn: string) {
    return this.bookingService.status(cn, user);
  }

  @Post('create')
  async create(
    @RequestUserDeco() user: RequestUser,
    @Body() createDto: CreateBookingDto,
  ) {
    return this.bookingService.create(createDto, user);
  }

  @Post('cancel')
  async cancel(
    @RequestUserDeco() user: RequestUser,
    @Body('cns') cns: string[],
  ) {
    return this.bookingService.cancel(cns, user);
  }

  @Post('download-receipt')
  async receipt(@RequestUserDeco() user: RequestUser, @Body() createDto: any) {
    return this.bookingService.downloadReceipt(createDto, user);
  }

  @Get('shipper-advice/:cn')
  async getShipperAdvice(
    @RequestUserDeco() user: RequestUser,
    @Body() createDto: any,
  ) {
    return this.bookingService.getShipperAdvice(createDto, user);
  }

  @Post('shipper-advice')
  async addShipperAdvice(
    @RequestUserDeco() user: RequestUser,
    @Body() createDto: any,
  ) {
    return this.bookingService.addShipperAdvice(createDto, user);
  }
}
