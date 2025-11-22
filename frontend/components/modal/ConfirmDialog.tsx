import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Alert
} from '@mui/material';
import { Warning, Error, Info, HelpOutline } from '@mui/icons-material';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  severity?: 'warning' | 'error' | 'info' | 'question';
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  showAlert?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  severity = 'warning',
  confirmColor = 'primary',
  showAlert = true
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIcon = () => {
    switch (severity) {
      case 'error':
        return <Error color="error" sx={{ fontSize: 48 }} />;
      case 'warning':
        return <Warning color="warning" sx={{ fontSize: 48 }} />;
      case 'info':
        return <Info color="info" sx={{ fontSize: 48 }} />;
      case 'question':
        return <HelpOutline color="primary" sx={{ fontSize: 48 }} />;
      default:
        return <Warning color="warning" sx={{ fontSize: 48 }} />;
    }
  };

  const getAlertSeverity = () => {
    if (severity === 'question') return 'info';
    return severity;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getIcon()}
          <span>{title}</span>
        </Box>
      </DialogTitle>
      <DialogContent>
        {showAlert ? (
          <Alert severity={getAlertSeverity()} sx={{ mb: 2 }}>
            {message}
          </Alert>
        ) : (
          <DialogContentText>
            {message}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          color="inherit"
        >
          {cancelText}
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
          color={confirmColor}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
