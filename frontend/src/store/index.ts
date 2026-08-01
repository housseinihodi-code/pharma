import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import cartReducer from './cartSlice'
import pharmacyReducer from './pharmacySlice'
import favoritesReducer from './favoritesSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    pharmacy: pharmacyReducer,
    favorites: favoritesReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
