import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CityController } from './controllers/city.controller';
import { CourierController } from './controllers/courier.controller';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { CityService } from './services/city.service';
import { CourierService } from './services/courier.service';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { CourierFactory } from './factories/courier.factory';
import { AVAILABLE_COURIER_INTEGRATION_LIST } from './constants/available-courier';
import { BookingController } from './controllers/booking.controller';
import { BookingService } from './services/booking.service';
import { BullModule } from '@nestjs/bullmq';
import { CREATE_BOOKING_QUEUE, ORDER_TRACKING_QUEUE } from './constants';
import { OrderModule } from '../order/order.module';
import { CreateBookingQueueConsumer } from './processors/booking.processor';
import DevCourier from './integrations/dev.courier';
import { OrderTrackingJob } from './jobs/order-tracking.job';
import { TrackShipmentQueueConsumer } from './processors/tracking.processor';
// import TcsCourier from './integrations/tcs.courier';
// import LeopardCourier from './integrations/leopard.courier';

@Module({
  imports: [
    AuthModule,
    OrderModule,
    BullModule.registerQueue(
      {
        name: CREATE_BOOKING_QUEUE,
      },
      {
        name: ORDER_TRACKING_QUEUE,
      },
    ),
  ],
  controllers: [CityController, CourierController, BookingController],
  providers: [
    tenantConnectionProvider,
    CityService,
    CourierService,
    BookingService,
    PrismaMasterClient,
    CourierFactory,
    {
      provide: AVAILABLE_COURIER_INTEGRATION_LIST.dev.providerName,
      useClass: DevCourier,
    },
    // {
    //   provide: AVAILABLE_COURIER_INTEGRATION_LIST.tcs.providerName,
    //   useClass: TcsCourier,
    // },
    // {
    //   provide: AVAILABLE_COURIER_INTEGRATION_LIST.leopard.providerName,
    //   useClass: LeopardCourier,
    // },
    CreateBookingQueueConsumer,
    OrderTrackingJob,
    TrackShipmentQueueConsumer
  ],

  exports: [CourierFactory],
})
export class LogisticModule {}
