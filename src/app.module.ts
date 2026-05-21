import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MeModule } from './me/me.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthInterceptor } from './common/interceptors/auth.interceptor';
import { AddressModule } from './address/address.module';
import { PropertyModule } from './property/property.module';
import { SmsModule } from './sms/sms.module';

@Module({
  imports: [AuthModule, MeModule, AddressModule, PropertyModule, SmsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthInterceptor,
    },
  ],
})
export class AppModule {}
