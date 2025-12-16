import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { createFolder } from '../../store/s3Slice';

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  currentPrefix: string;
  onFolderCreated: () => void;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  onClose,
  currentPrefix,
  onFolderCreated,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFolderName = (name: string): boolean => {
    if (!name.trim()) {
      setError('Folder name cannot be empty');
      return false;
    }
    if (name.includes('/')) {
      setError('Folder name cannot contain "/"');
      return false;
    }
    if (name.includes('\\')) {
      setError('Folder name cannot contain "\\"');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    setError(null);

    if (!validateFolderName(folderName)) {
      return;
    }

    setLoading(true);
    try {
      const prefix = `${currentPrefix}${folderName}/`;
      await dispatch(createFolder(prefix)).unwrap();
      onFolderCreated();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFolderName('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Folder</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          label="Folder Name"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          margin="normal"
          helperText="Enter a name for the new folder"
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleCreate} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
