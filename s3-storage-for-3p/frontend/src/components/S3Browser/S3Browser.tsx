import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CreateNewFolder as CreateFolderIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { listObjects, getUserPrefix, setCurrentPrefix } from '../../store/s3Slice';
import { ObjectList } from './ObjectList';
import { UploadDialog } from './UploadDialog';
import { CreateFolderDialog } from './CreateFolderDialog';

export const S3Browser: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { objects, currentPrefix, userPrefix, loading, error } = useSelector(
    (state: RootState) => state.s3
  );

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(getUserPrefix());
  }, [dispatch]);

  useEffect(() => {
    if (userPrefix) {
      handleRefresh();
    }
  }, [userPrefix, currentPrefix]);

  const handleRefresh = () => {
    dispatch(listObjects({ prefix: currentPrefix }));
  };

  const handleNavigateToFolder = (prefix: string) => {
    dispatch(setCurrentPrefix(prefix));
  };

  const getBreadcrumbs = () => {
    if (!currentPrefix) return [];
    
    const parts = currentPrefix.split('/').filter(Boolean);
    const breadcrumbs: { label: string; prefix: string }[] = [];
    
    let accumulatedPrefix = '';
    parts.forEach((part, index) => {
      accumulatedPrefix += part + '/';
      breadcrumbs.push({
        label: part,
        prefix: accumulatedPrefix,
      });
    });
    
    return breadcrumbs;
  };

  const filteredObjects = searchTerm
    ? objects.filter((obj) =>
        obj.key.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : objects;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">S3 Object Browser</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<CreateFolderIcon />}
            onClick={() => setCreateFolderDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            New Folder
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Upload
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search objects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </Box>

        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => handleNavigateToFolder(userPrefix)}
            sx={{ cursor: 'pointer' }}
          >
            Home
          </Link>
          {getBreadcrumbs().map((crumb, index) => (
            <Link
              key={index}
              component="button"
              variant="body2"
              onClick={() => handleNavigateToFolder(crumb.prefix)}
              sx={{ cursor: 'pointer' }}
            >
              {crumb.label}
            </Link>
          ))}
        </Breadcrumbs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ObjectList
            objects={filteredObjects}
            onNavigate={handleNavigateToFolder}
            onRefresh={handleRefresh}
          />
        )}
      </Paper>

      <UploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        currentPrefix={currentPrefix}
        onUploadComplete={handleRefresh}
      />

      <CreateFolderDialog
        open={createFolderDialogOpen}
        onClose={() => setCreateFolderDialogOpen(false)}
        currentPrefix={currentPrefix}
        onFolderCreated={handleRefresh}
      />
    </Box>
  );
};
