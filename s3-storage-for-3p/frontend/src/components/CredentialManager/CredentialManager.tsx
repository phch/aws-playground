import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { credentialService } from '../../services/credentialService';
import { AwsCredentials, IamAccessKey } from '../../types';
import { formatDate } from '../../utils/format';

export const CredentialManager: React.FC = () => {
  const [stsCredentials, setStsCredentials] = useState<AwsCredentials | null>(null);
  const [accessKeys, setAccessKeys] = useState<IamAccessKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [openDialog, setOpenDialog] = useState(false);
  const [duration, setDuration] = useState(3600);
  const [downloadFormat, setDownloadFormat] = useState<'cli' | 'env'>('cli');

  useEffect(() => {
    loadAccessKeys();
  }, []);

  const loadAccessKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const keys = await credentialService.listAccessKeys();
      setAccessKeys(keys);
    } catch (err: any) {
      setError(err.message || 'Failed to load access keys');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSTS = async () => {
    try {
      setLoading(true);
      setError(null);
      const credentials = await credentialService.getTemporaryCredentials(duration);
      setStsCredentials(credentials);
      setOpenDialog(false);
    } catch (err: any) {
      setError(err.message || 'Failed to generate temporary credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccessKey = async () => {
    try {
      setLoading(true);
      setError(null);
      await credentialService.createAccessKey();
      await loadAccessKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to create access key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccessKey = async (accessKeyId: string) => {
    if (!window.confirm('Are you sure you want to delete this access key?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await credentialService.deleteAccessKey(accessKeyId);
      await loadAccessKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to delete access key');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCredentials = () => {
    if (stsCredentials) {
      credentialService.downloadCredentialsFile(stsCredentials, downloadFormat);
    }
  };

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  const maskSecret = (secret: string, show: boolean) => {
    if (show) return secret;
    return '•'.repeat(secret.length);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        AWS Credential Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Temporary STS Credentials Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Temporary Credentials (STS)</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            disabled={loading}
          >
            Generate New
          </Button>
        </Box>

        {stsCredentials ? (
          <Card variant="outlined">
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Access Key ID
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', flexGrow: 1 }}>
                      {maskSecret(stsCredentials.accessKeyId, showSecrets['sts-access'])}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => toggleSecretVisibility('sts-access')}
                    >
                      {showSecrets['sts-access'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Secret Access Key
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', flexGrow: 1 }}>
                      {maskSecret(stsCredentials.secretAccessKey, showSecrets['sts-secret'])}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => toggleSecretVisibility('sts-secret')}
                    >
                      {showSecrets['sts-secret'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Session Token
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      fontSize: '0.85rem',
                    }}
                  >
                    {maskSecret(stsCredentials.sessionToken, showSecrets['sts-token'])}
                  </Typography>
                  <IconButton size="small" onClick={() => toggleSecretVisibility('sts-token')}>
                    {showSecrets['sts-token'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Expires
                  </Typography>
                  <Typography variant="body1">{formatDate(stsCredentials.expiration)}</Typography>
                </Grid>
              </Grid>
            </CardContent>
            <CardActions>
              <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value as 'cli' | 'env')}
                  label="Format"
                >
                  <MenuItem value="cli">AWS CLI</MenuItem>
                  <MenuItem value="env">Environment Variables</MenuItem>
                </Select>
              </FormControl>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadCredentials}
              >
                Download
              </Button>
            </CardActions>
          </Card>
        ) : (
          <Alert severity="info">
            No temporary credentials generated yet. Click "Generate New" to create STS credentials
            scoped to your S3 prefix.
          </Alert>
        )}
      </Paper>

      {/* IAM Access Keys Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">IAM Access Keys</Typography>
          <Box>
            <IconButton onClick={loadAccessKeys} disabled={loading}>
              <RefreshIcon />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateAccessKey}
              disabled={loading}
              sx={{ ml: 1 }}
            >
              Create Access Key
            </Button>
          </Box>
        </Box>

        {loading && accessKeys.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : accessKeys.length === 0 ? (
          <Alert severity="info">
            No IAM access keys found. Create one to get permanent access credentials.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {accessKeys.map((key) => (
              <Grid item xs={12} md={6} key={key.accessKeyId}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Access Key ID
                      </Typography>
                      <Chip
                        label={key.status}
                        color={key.status === 'Active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                      {key.accessKeyId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created: {formatDate(key.createDate)}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteAccessKey(key.accessKeyId)}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Generate STS Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Generate Temporary Credentials</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Duration (seconds)"
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            margin="normal"
            inputProps={{ min: 900, max: 43200 }}
            helperText="Between 15 minutes (900s) and 12 hours (43200s)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleGenerateSTS} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
