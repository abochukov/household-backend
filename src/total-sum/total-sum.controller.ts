import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { TotalSumService } from './total-sum.service';
import type { SaveMonthlySumsPayload, MonthColumn } from './total-sum.service';

interface SaveMonthlySumsRequest extends SaveMonthlySumsPayload {
  username: string;
}

interface PayMonthRequest {
  username: string;
  address_id: number;
  property_id: number;
  year: number;
  month: MonthColumn;
  paid_by?: string;
  note?: string;
}

@Controller('api/total-sum')
export class TotalSumController {
  private readonly monthColumns: MonthColumn[] = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];

  constructor(private readonly totalSumService: TotalSumService) {}

  @Post('save-month')
  async saveMonth(@Body() body: SaveMonthlySumsRequest): Promise<{ success: boolean }> {
    const { username, month, address_id, year, rows, charges } = body;

    if (!username) {
      throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
    }

    if (!address_id || !year || !rows || !charges) {
      throw new HttpException('address_id, year, rows and charges are required', HttpStatus.BAD_REQUEST);
    }

    if (!this.monthColumns.includes(month)) {
      throw new HttpException('Invalid month value', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.totalSumService.saveMonthlySums(username, {
        address_id,
        year,
        month,
        rows,
        charges,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error';
      if (message === 'Property not found or access denied') {
        throw new HttpException(message, HttpStatus.FORBIDDEN);
      }

      if (message === 'Address not found or access denied') {
        throw new HttpException(message, HttpStatus.FORBIDDEN);
      }

      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('month-charges')
  async getMonthCharges(
    @Query('username') username: string,
    @Query('address_id') addressIdRaw: string,
    @Query('year') yearRaw: string,
    @Query('month') month: MonthColumn,
  ) {
    if (!username) {
      throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
    }

    const address_id = Number(addressIdRaw);
    const year = Number(yearRaw);

    if (!address_id || !year) {
      throw new HttpException('address_id and year are required', HttpStatus.BAD_REQUEST);
    }

    if (!this.monthColumns.includes(month)) {
      throw new HttpException('Invalid month value', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.totalSumService.getMonthCharges(username, address_id, year, month);
    } catch {
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('yearly')
  async getYearly(
    @Query('username') username: string,
    @Query('address_id') addressIdRaw: string,
    @Query('year') yearRaw: string,
  ) {
    if (!username) {
      throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
    }

    const address_id = Number(addressIdRaw);
    const year = Number(yearRaw);

    if (!address_id || !year) {
      throw new HttpException('address_id and year are required', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.totalSumService.getYearlySums(username, address_id, year);
    } catch {
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('pay-month')
  async payMonth(@Body() body: PayMonthRequest) {
    const { username, address_id, property_id, year, month, paid_by, note } = body;

    if (!username) {
      throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
    }

    if (!address_id || !property_id || !year) {
      throw new HttpException('address_id, property_id and year are required', HttpStatus.BAD_REQUEST);
    }

    if (!this.monthColumns.includes(month)) {
      throw new HttpException('Invalid month value', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.totalSumService.payMonthForProperty({
        username,
        address_id,
        property_id,
        year,
        month,
        paid_by,
        note,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error';

      if (message === 'Property not found or access denied') {
        throw new HttpException(message, HttpStatus.FORBIDDEN);
      }

      if (message === 'Address not found or access denied') {
        throw new HttpException(message, HttpStatus.FORBIDDEN);
      }

      if (message === 'No saved monthly charge found') {
        throw new HttpException(message, HttpStatus.BAD_REQUEST);
      }

      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
