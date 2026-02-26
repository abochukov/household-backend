import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PropertyService, Property } from './property.service';

@Controller('api/property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post('create')
  async createProperty(@Body() body: {
    address_id: number;
    property_number: string;
    floor: number;
    area: number;
    member_amount: number;
    elevator: boolean;
    pets?: boolean;
    rent?: boolean;
    username?: string;
    created_by: string;
  }): Promise<Property> {
    console.log('🏠 Creating property:', body);
    
    try {
      const property = await this.propertyService.createProperty(body);
      console.log('✅ Property created:', property.property_id);
      return property;
    } catch (error) {
      if (error.message === 'This property already exists at this address') {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      console.error('❌ Error creating property:', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user')
  async getPropertiesForUser(@Query('username') username: string): Promise<Property[]> {
    console.log('🔵 Backend received request for properties, user:', username);
    
    if (!username) {
      throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const properties = await this.propertyService.getPropertiesForUser(username);
      console.log('✅ Backend found properties:', properties.length);
      return properties;
    } catch (error) {
      console.error('❌ Backend error:', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getPropertyById(@Param('id') id: string): Promise<Property> {
    console.log('🔍 Getting property by ID:', id);
    
    try {
      const property = await this.propertyService.getPropertyById(parseInt(id));
      if (!property) {
        throw new HttpException('Property not found', HttpStatus.NOT_FOUND);
      }
      return property;
    } catch (error) {
      console.error('❌ Error getting property:', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateProperty(
    @Param('id') id: string,
    @Body() body: Partial<Property>
  ): Promise<Property> {
    console.log('✏️ Updating property:', id);
    
    try {
      const property = await this.propertyService.updateProperty(parseInt(id), body);
      console.log('✅ Property updated');
      return property;
    } catch (error) {
      console.error('❌ Error updating property:', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteProperty(@Param('id') id: string): Promise<{ success: boolean }> {
    console.log('🗑️ Deleting property:', id);
    
    try {
      await this.propertyService.deleteProperty(parseInt(id));
      console.log('✅ Property deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting property:', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
