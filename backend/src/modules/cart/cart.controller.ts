import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@CurrentUser('_id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Get('total')
  getTotal(@CurrentUser('_id') userId: string) {
    return this.cartService.getCartTotal(userId);
  }

  @Post('add')
  addItem(
    @CurrentUser('_id') userId: string,
    @Body('medicationId') medicationId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.addItem(userId, medicationId, quantity || 1);
  }

  @Put('item/:medicationId')
  updateItem(
    @CurrentUser('_id') userId: string,
    @Param('medicationId') medicationId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.updateItemQuantity(userId, medicationId, quantity);
  }

  @Delete('item/:medicationId')
  removeItem(
    @CurrentUser('_id') userId: string,
    @Param('medicationId') medicationId: string,
  ) {
    return this.cartService.removeItem(userId, medicationId);
  }

  @Delete()
  clearCart(@CurrentUser('_id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
