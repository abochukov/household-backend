import { Module } from '@nestjs/common';
import { TotalSumController } from './total-sum.controller';
import { TotalSumService } from './total-sum.service';
import { NotificationService } from './notification.service';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  controllers: [TotalSumController],
  providers: [TotalSumService, NotificationService],
})
export class TotalSumModule {}
