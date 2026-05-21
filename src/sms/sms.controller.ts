import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { SmsService } from './sms.service';

@Controller('api/sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('test')
  async sendTestSms(@Body() body?: { message?: string }) {
    try {
      const sms = await this.smsService.sendTestSms(body?.message);

      return {
        success: true,
        sid: sms.sid,
        message: `SMS sent to ${sms.to}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send SMS.';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }
}
