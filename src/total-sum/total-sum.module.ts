import { Module } from '@nestjs/common';
import { TotalSumController } from './total-sum.controller';
import { TotalSumService } from './total-sum.service';

@Module({
  controllers: [TotalSumController],
  providers: [TotalSumService],
})
export class TotalSumModule {}
