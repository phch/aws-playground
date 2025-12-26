import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { s3Service } from '../services/s3Service';
import { S3Object, S3ListResponse } from '../types';

interface S3State {
  objects: S3Object[];
  currentPrefix: string;
  userPrefix: string;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  continuationToken?: string;
  selectedObjects: string[];
}

const initialState: S3State = {
  objects: [],
  currentPrefix: '',
  userPrefix: '',
  loading: false,
  error: null,
  hasMore: false,
  continuationToken: undefined,
  selectedObjects: [],
};

export const listObjects = createAsyncThunk(
  's3/listObjects',
  async (
    { prefix, continuationToken }: { prefix?: string; continuationToken?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await s3Service.listObjects(prefix, continuationToken);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to list objects');
    }
  }
);

export const uploadFile = createAsyncThunk(
  's3/uploadFile',
  async ({ file, key }: { file: File; key: string }, { rejectWithValue }) => {
    try {
      await s3Service.uploadFile(file, key);
      return { key };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload file');
    }
  }
);

export const deleteObject = createAsyncThunk(
  's3/deleteObject',
  async (key: string, { rejectWithValue }) => {
    try {
      await s3Service.deleteObject(key);
      return key;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete object');
    }
  }
);

export const deleteMultipleObjects = createAsyncThunk(
  's3/deleteMultipleObjects',
  async (keys: string[], { rejectWithValue }) => {
    try {
      const response = await s3Service.deleteMultipleObjects(keys);
      return response.deleted;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete objects');
    }
  }
);

export const createFolder = createAsyncThunk(
  's3/createFolder',
  async (prefix: string, { rejectWithValue }) => {
    try {
      await s3Service.createFolder(prefix);
      return prefix;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create folder');
    }
  }
);

export const getUserPrefix = createAsyncThunk('s3/getUserPrefix', async (_, { rejectWithValue }) => {
  try {
    const response = await s3Service.getUserPrefix();
    return response.prefix;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to get user prefix');
  }
});

const s3Slice = createSlice({
  name: 's3',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPrefix: (state, action: PayloadAction<string>) => {
      state.currentPrefix = action.payload;
    },
    toggleObjectSelection: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      const index = state.selectedObjects.indexOf(key);
      if (index > -1) {
        state.selectedObjects.splice(index, 1);
      } else {
        state.selectedObjects.push(key);
      }
    },
    clearSelection: (state) => {
      state.selectedObjects = [];
    },
    selectAll: (state) => {
      state.selectedObjects = state.objects.filter((obj) => !obj.isFolder).map((obj) => obj.key);
    },
  },
  extraReducers: (builder) => {
    // List objects
    builder.addCase(listObjects.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(listObjects.fulfilled, (state, action) => {
      state.loading = false;
      const response = action.payload as S3ListResponse;
      state.objects = response.objects;
      state.currentPrefix = response.prefix;
      state.hasMore = response.hasMore;
      state.continuationToken = response.continuationToken;
      state.error = null;
    });
    builder.addCase(listObjects.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Upload file
    builder.addCase(uploadFile.fulfilled, (state) => {
      state.error = null;
    });
    builder.addCase(uploadFile.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Delete object
    builder.addCase(deleteObject.fulfilled, (state, action) => {
      const deletedKey = action.payload;
      state.objects = state.objects.filter((obj) => obj.key !== deletedKey);
      state.selectedObjects = state.selectedObjects.filter((key) => key !== deletedKey);
      state.error = null;
    });
    builder.addCase(deleteObject.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Delete multiple objects
    builder.addCase(deleteMultipleObjects.fulfilled, (state, action) => {
      const deletedKeys = action.payload;
      state.objects = state.objects.filter((obj) => !deletedKeys.includes(obj.key));
      state.selectedObjects = [];
      state.error = null;
    });
    builder.addCase(deleteMultipleObjects.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Create folder
    builder.addCase(createFolder.fulfilled, (state) => {
      state.error = null;
    });
    builder.addCase(createFolder.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Get user prefix
    builder.addCase(getUserPrefix.fulfilled, (state, action) => {
      state.userPrefix = action.payload;
      state.currentPrefix = action.payload;
    });
  },
});

export const { clearError, setCurrentPrefix, toggleObjectSelection, clearSelection, selectAll } =
  s3Slice.actions;
export default s3Slice.reducer;
