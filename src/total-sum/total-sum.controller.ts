import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { TotalSumService, SaveMonthlySumsPayload, MonthColumn } from './total-sum.service';

interface SaveMonthlySumsRequest extends SaveMonthlySumsPayload {
  username: string;
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
    const { username, month, address_id, year, rows } = body;

    if (!username) {
      throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
    }

    if (!address_id || !year || !rows) {
      throw new HttpException('address_id, year and rows are required', HttpStatus.BAD_REQUEST);
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server error';
      if (message === 'Property not found or access denied') {
        throw new HttpException(message, HttpStatus.FORBIDDEN);
      }

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
}
