import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { PAK_TIMEZONE, TRACKING_JOB } from '../constants';

@Injectable()
export class OrderTrackingJob {
  private readonly logger = new Logger(OrderTrackingJob.name);

  constructor(private prisma: PrismaMasterClient) {}

  @Cron(CronExpression.EVERY_10_SECONDS, {waitForCompletion: true, timeZone: PAK_TIMEZONE, name: TRACKING_JOB})
  async handleCron() {
    // get 1 tenant whose order is not tracked
    const start = new Date();
    start.setHours(0,0,0,0);

    const end = new Date();
    end.setHours(23,59,59,999);

    // 1) Find tenants that DO NOT have a record today
    const tenants = await this.prisma.tenant.findMany({
      where: {
        trackingLogs: {
          none: {
            startedAt: {
              gte: start,
              lte: end
            }
          }
        }
      }
    });

    if (!tenants.length) return;

    this.logger.log(`Tracking required for tenants: ${tenants.length}`);

    
    // get all of its orders that eligible to track
    // group them by courier 
    // put them into queue 
    // for failed jobs save them into db
    this.logger.debug('Called when the current second is 10 Sec');
  }
}
