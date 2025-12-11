import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaMasterClient } from '@/src/services/master-connection.service';

@Injectable()
export class OrderTrackingJob {
  private readonly logger = new Logger(OrderTrackingJob.name);

  constructor(private prisma: PrismaMasterClient) {}

  @Cron(CronExpression.EVERY_10_SECONDS, {waitForCompletion: true, timeZone: "Asia/Karachi", name: "trackingJob"})
  handleCron() {
    // get 1 tenant whose order is not tracked
    // get all of its orders that eligible to track
    // group them by courier 
    // put them into queue 
    // for failed jobs save them into db
    this.logger.debug('Called when the current second is 10 Sec');
  }
}
