import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import s3Reducer from './s3Slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    s3: s3Reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['s3/uploadFile/pending'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.file'],
        // Ignore these paths in the state
        ignoredPaths: ['s3.uploadingFiles'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
