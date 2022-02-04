import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit';
import {
  getFirebase,
  getFirestore,
  firebaseReducer,
  firestoreReducer,
} from 'read-write';
import thunk from 'redux-thunk';

export const store = configureStore({
  reducer: {
    firestore: firestoreReducer,
    firebase: firebaseReducer,
  },
  middleware: [
    thunk.withExtraArgument({
      getFirestore,
      getFirebase,
    }),
  ],
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
