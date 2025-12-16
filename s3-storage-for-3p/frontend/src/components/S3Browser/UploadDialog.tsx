import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { s3Service } from '../../services/s3Service';
import { UploadProgress } from '../../types';
import { formatBytes } from '../../utils/format';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  currentPrefix: string;
  onUploadComplete: () => void;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({
  open,
  onClose,
  currentPrefix,
  onUploadComplete,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    const initialProgress: Record<string, UploadProgress> = {};
    files.forEach((file, index) => {
      initialProgress[index.toString()] = {
        file,
        progress: 0,
        status: 'pending',
      };
    });
    setUploadProgress(initialProgress);

    try {
      await Promise.all(
        files.map(async (file, index) => {
          try {
            setUploadProgress((prev) => ({
              ...prev,
              [index]: { ...prev[index], status: 'uploading' },
            }));

            const key = `${currentPrefix}${file.name}`;
            await s3Service.uploadFile(file, key, (progress) => {
              setUploadProgress((prev) => ({
                ...prev,
                [index]: { ...prev[index], progress },
              }));
            });

            setUploadProgress((prev) => ({
              ...prev,
              [index]: { ...prev[index], status: 'completed', progress: 100 },
            }));
          } catch (err: any) {
            setUploadProgress((prev) => ({
              ...prev,
              [index]: {
                ...prev[index],
                status: 'failed',
                error: err.message || 'Upload failed',
              },
            }));
          }
        })
      );

      onUploadComplete();
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setUploadProgress({});
      setError(null);
      onClose();
    }
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Upload Files
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          disabled={uploading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {files.length === 0 ? (
          <Box
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'divider',
              borderRadius: 1,
              p: 4,
              textAlign: 'center',
              bgcolor: dragActive ? 'action.hover' : 'background.paper',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" gutterBottom>
              Drag and drop files here, or click to select
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can upload multiple files at once
            </Typography>
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {files.length} file(s) selected
              </Typography>
              {!uploading && (
                <Button size="small" onClick={() => document.getElementById('file-input')?.click()}>
                  Add More
                </Button>
              )}
              <input
                id="file-input"
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </Box>

            <List>
              {files.map((file, index) => {
                const progress = uploadProgress[index];
                return (
                  <ListItem
                    key={index}
                    secondaryAction={
                      !uploading && (
                        <IconButton edge="end" onClick={() => removeFile(index)}>
                          <CloseIcon />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText
                      primary={file.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatBytes(file.size)}
                          </Typography>
                          {progress && (
                            <Box sx={{ mt: 1 }}>
                              {progress.status === 'uploading' && (
                                <LinearProgress variant="determinate" value={progress.progress} />
                              )}
                              {progress.status === 'completed' && getStatusIcon('completed')}
                              {progress.status === 'failed' && (
                                <Box>
                                  {getStatusIcon('failed')}
                                  <Typography variant="caption" color="error">
                                    {progress.error}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={files.length === 0 || uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
