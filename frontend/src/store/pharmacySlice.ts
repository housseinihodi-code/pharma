import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { pharmacyService } from '../services/pharmacy.service';
import { Pharmacy } from '../types';

interface PharmacyState {
  pharmacies: Pharmacy[];
  nearbyPharmacies: Pharmacy[];
  selectedPharmacy: Pharmacy | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
}

const initialState: PharmacyState = {
  pharmacies: [],
  nearbyPharmacies: [],
  selectedPharmacy: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
};

export const fetchPharmacies = createAsyncThunk(
  'pharmacy/fetchAll',
  async ({ page, limit }: { page: number; limit: number }) => {
    return pharmacyService.getAll(page, limit);
  },
);

export const fetchNearbyPharmacies = createAsyncThunk(
  'pharmacy/fetchNearby',
  async ({ longitude, latitude, radius }: { longitude: number; latitude: number; radius?: number }) => {
    return pharmacyService.getNearby(longitude, latitude, radius);
  },
);

export const fetchPharmacyById = createAsyncThunk(
  'pharmacy/fetchById',
  async (id: string) => {
    return pharmacyService.getById(id);
  },
);

export const searchPharmacies = createAsyncThunk(
  'pharmacy/search',
  async ({ query, page }: { query: string; page: number }) => {
    return pharmacyService.search(query, page);
  },
);

const pharmacySlice = createSlice({
  name: 'pharmacy',
  initialState,
  reducers: {
    clearSelectedPharmacy: (state) => {
      state.selectedPharmacy = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPharmacies.pending, (state) => { state.loading = true; })
      .addCase(fetchPharmacies.fulfilled, (state, action) => {
        state.pharmacies = action.payload.pharmacies;
        state.total = action.payload.total;
        state.loading = false;
      })
      .addCase(fetchPharmacies.rejected, (state, action) => {
        state.error = action.error.message || 'Erreur';
        state.loading = false;
      })
      .addCase(fetchNearbyPharmacies.fulfilled, (state, action) => {
        state.nearbyPharmacies = action.payload;
        state.loading = false;
      })
      .addCase(fetchPharmacyById.fulfilled, (state, action) => {
        state.selectedPharmacy = action.payload;
        state.loading = false;
      })
      .addCase(searchPharmacies.fulfilled, (state, action) => {
        state.pharmacies = action.payload.pharmacies;
        state.total = action.payload.total;
        state.loading = false;
      });
  },
});

export const { clearSelectedPharmacy } = pharmacySlice.actions;
export default pharmacySlice.reducer;
