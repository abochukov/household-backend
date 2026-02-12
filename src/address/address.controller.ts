import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AddressService, Address } from './address.service';

@Controller('api/address')
// @UseGuards(SessionAuthGuard) - Temporarily disabled for testing
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post('create')
  async createAddress(@Body() body: {
    city: string;
    neighbourhood?: string;
    address: string;
    entranceId: string;
    floors?: number;
    created_by: string;
  }): Promise<Address> {
    try {
      const address = await this.addressService.createAddress(body);
      return address;
    } catch (error) {
      if (error.message === 'This address already exists') {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user')
  async getAddressesForUser(@Query('username') username: string): Promise<Address[]> {
    console.log('🔵 Backend received request for user:', username);
    
    if (!username) {
      throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const addresses = await this.addressService.getAddressesForUser(username);
      console.log('✅ Backend found addresses:', addresses.length);
      return addresses;
    } catch (error) {
      console.error('❌ Backend error:', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateAddress(
    @Param('id') id: string,
    @Body() body: {
      city: string;
      neighbourhood?: string;
      address: string;
      entranceId: string;
      floors?: number;
    }
  ): Promise<Address> {
    try {
      const address = await this.addressService.updateAddress(parseInt(id), body);
      return address;
    } catch (error) {
      if (error.message === 'Address not found') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteAddress(@Param('id') id: string): Promise<Address> {
    try {
      const address = await this.addressService.deleteAddress(parseInt(id));
      return address;
    } catch (error) {
      if (error.message === 'Address not found') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
