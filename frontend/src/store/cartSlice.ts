import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartService } from '../services/order.service';
import { Cart } from '../types';

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  cart: null,
  loading: false,
  error: null,
};

export const fetchCart = createAsyncThunk('cart/fetch', async () => {
  return cartService.getCart();
});

export const addToCart = createAsyncThunk(
  'cart/addItem',
  async ({ medicationId, quantity }: { medicationId: string; quantity: number }, { rejectWithValue }) => {
    try {
      return await cartService.addItem(medicationId, quantity);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      return rejectWithValue({ message: Array.isArray(msg) ? msg.join(', ') : (msg || 'Erreur lors de l\'ajout au panier') });
    }
  },
);

export const updateCartItem = createAsyncThunk(
  'cart/updateItem',
  async ({ medicationId, quantity }: { medicationId: string; quantity: number }, { rejectWithValue }) => {
    try {
      return await cartService.updateItem(medicationId, quantity);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      return rejectWithValue({ message: Array.isArray(msg) ? msg.join(', ') : (msg || 'Erreur') });
    }
  },
);

export const removeFromCart = createAsyncThunk(
  'cart/removeItem',
  async (medicationId: string) => {
    return cartService.removeItem(medicationId);
  },
);

export const clearCartAsync = createAsyncThunk('cart/clear', async () => {
  await cartService.clearCart();
  return null;
});

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCartState: (state) => {
      state.cart = null;
    },
  },
  extraReducers: (builder) => {
    const setLoading = (state: CartState) => { state.loading = true; state.error = null; };
    const setCart = (state: CartState, action: any) => {
      state.cart = action.payload;
      state.loading = false;
    };
    const setError = (state: CartState, action: any) => {
      state.error = action.payload?.message || 'Erreur';
      state.loading = false;
    };

    builder
      .addCase(fetchCart.pending, setLoading)
      .addCase(fetchCart.fulfilled, setCart)
      .addCase(fetchCart.rejected, setError)
      .addCase(addToCart.pending, setLoading)
      .addCase(addToCart.fulfilled, setCart)
      .addCase(addToCart.rejected, setError)
      .addCase(updateCartItem.fulfilled, setCart)
      .addCase(removeFromCart.fulfilled, setCart)
      .addCase(clearCartAsync.fulfilled, (state) => {
        state.cart = null;
        state.loading = false;
      });
  },
});

export const { clearCartState } = cartSlice.actions;
export default cartSlice.reducer;
