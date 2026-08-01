import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FavoritesState {
  pharmacies: string[];
  medications: string[];
}

const load = (): FavoritesState => {
  try {
    const raw = localStorage.getItem('pharma_favorites');
    return raw ? JSON.parse(raw) : { pharmacies: [], medications: [] };
  } catch {
    return { pharmacies: [], medications: [] };
  }
};

const save = (state: FavoritesState) => {
  localStorage.setItem('pharma_favorites', JSON.stringify(state));
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: load(),
  reducers: {
    toggleFavoritePharmacy(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.pharmacies.indexOf(id);
      if (idx >= 0) state.pharmacies.splice(idx, 1);
      else state.pharmacies.push(id);
      save(state);
    },
    toggleFavoriteMedication(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.medications.indexOf(id);
      if (idx >= 0) state.medications.splice(idx, 1);
      else state.medications.push(id);
      save(state);
    },
    clearFavorites(state) {
      state.pharmacies = [];
      state.medications = [];
      save(state);
    },
  },
});

export const { toggleFavoritePharmacy, toggleFavoriteMedication, clearFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;
