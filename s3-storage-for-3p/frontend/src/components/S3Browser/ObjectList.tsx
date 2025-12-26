import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Box,
  Button,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  toggleObjectSelection,
  clearSelection,
  selectAll,
  deleteObject,
  deleteMultipleObjects,
} from '../../store/s3Slice';
import { s3Service } from '../../services/s3Service';
import { S3Object } from '../../types';
import { formatBytes, formatDate } from '../../utils/format';

interface ObjectListProps {
  objects: S3Object[];
  onNavigate: (prefix: string) => void;
  onRefresh: () => void;
}

export const ObjectList: React.FC<ObjectListProps> = ({ objects, onNavigate, onRefresh }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedObjects } = useSelector((state: RootState) => state.s3);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedObject, setSelectedObject] = useState<S3Object | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, object: S3Object) => {
    setAnchorEl(event.currentTarget);
    setSelectedObject(object);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedObject(null);
  };

  const handleObjectClick = (object: S3Object) => {
    if (object.isFolder) {
      onNavigate(object.key);
    }
  };

  const handleDownload = async () => {
    if (!selectedObject) return;

    try {
      const { url } = await s3Service.getDownloadUrl(selectedObject.key);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedObject) return;

    if (!window.confirm(`Are you sure you want to delete "${selectedObject.key}"?`)) {
      handleMenuClose();
      return;
    }

    await dispatch(deleteObject(selectedObject.key));
    onRefresh();
    handleMenuClose();
  };

  const handleDeleteSelected = async () => {
    if (selectedObjects.length === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedObjects.length} selected object(s)?`
      )
    ) {
      return;
    }

    await dispatch(deleteMultipleObjects(selectedObjects));
    onRefresh();
  };

  const handleSelectAll = () => {
    if (selectedObjects.length === objects.filter((obj) => !obj.isFolder).length) {
      dispatch(clearSelection());
    } else {
      dispatch(selectAll());
    }
  };

  const isAllSelected =
    objects.filter((obj) => !obj.isFolder).length > 0 &&
    selectedObjects.length === objects.filter((obj) => !obj.isFolder).length;

  return (
    <Box>
      {selectedObjects.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip label={`${selectedObjects.length} selected`} color="primary" />
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteSelected}
          >
            Delete Selected
          </Button>
          <Button size="small" onClick={() => dispatch(clearSelection())}>
            Clear Selection
          </Button>
        </Box>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedObjects.length > 0 &&
                    selectedObjects.length < objects.filter((obj) => !obj.isFolder).length
                  }
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Last Modified</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {objects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  No objects found
                </TableCell>
              </TableRow>
            ) : (
              objects.map((object) => (
                <TableRow
                  key={object.key}
                  hover
                  sx={{ cursor: object.isFolder ? 'pointer' : 'default' }}
                >
                  <TableCell padding="checkbox">
                    {!object.isFolder && (
                      <Checkbox
                        checked={selectedObjects.includes(object.key)}
                        onChange={() => dispatch(toggleObjectSelection(object.key))}
                      />
                    )}
                  </TableCell>
                  <TableCell onClick={() => handleObjectClick(object)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {object.isFolder ? (
                        <FolderIcon color="primary" />
                      ) : (
                        <FileIcon color="action" />
                      )}
                      {object.key.split('/').filter(Boolean).pop() || object.key}
                    </Box>
                  </TableCell>
                  <TableCell>{object.isFolder ? '-' : formatBytes(object.size)}</TableCell>
                  <TableCell>{object.isFolder ? '-' : formatDate(object.lastModified)}</TableCell>
                  <TableCell>
                    {!object.isFolder && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, object)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleDownload}>Download</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};
