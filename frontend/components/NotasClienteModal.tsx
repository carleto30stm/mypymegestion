import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { Cliente } from '../types';
import { formatDate } from '../utils/formatters';

interface NotasClienteModalProps {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onAgregarNota: (texto: string, tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento') => void;
  onEliminarNota: (notaId: string) => void;
  userType: 'admin' | 'oper' | 'oper_ad' | undefined;
}

const NotasClienteModal: React.FC<NotasClienteModalProps> = ({
  open,
  onClose,
  cliente,
  onAgregarNota,
  onEliminarNota,
  userType
}) => {
  const [nuevaNota, setNuevaNota] = useState('');
  const [tipoNota, setTipoNota] = useState<'incidente' | 'problema' | 'observacion' | 'seguimiento'>('observacion');

  const canEditNotas = userType === 'admin' || userType === 'oper_ad';

  const handleAgregar = () => {
    if (nuevaNota.trim()) {
      onAgregarNota(nuevaNota, tipoNota);
      setNuevaNota('');
      setTipoNota('observacion');
    }
  };

  const handleEliminar = (notaId: string) => {
    if (window.confirm('¿Está seguro de eliminar esta nota?')) {
      onEliminarNota(notaId);
    }
  };

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'incidente':
        return <WarningIcon fontSize="small" />;
      case 'problema':
        return <ErrorIcon fontSize="small" />;
      case 'seguimiento':
        return <CheckCircleIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getColorTipo = (tipo: string): 'error' | 'warning' | 'info' | 'success' => {
    switch (tipo) {
      case 'incidente':
        return 'warning';
      case 'problema':
        return 'error';
      case 'seguimiento':
        return 'success';
      default:
        return 'info';
    }
  };

  const nombreCliente = cliente?.razonSocial || `${cliente?.apellido || ''} ${cliente?.nombre || ''}`.trim();
  const notasOrdenadas = cliente?.notas ? [...cliente.notas].sort((a, b) => 
    new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
  ) : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Notas e Incidentes - {nombreCliente}
      </DialogTitle>
      <DialogContent>
        {canEditNotas && (
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Agregar Nueva Nota
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={tipoNota}
                  onChange={(e) => setTipoNota(e.target.value as any)}
                  label="Tipo"
                >
                  <MenuItem value="observacion">Observación</MenuItem>
                  <MenuItem value="seguimiento">Seguimiento</MenuItem>
                  <MenuItem value="incidente">Incidente</MenuItem>
                  <MenuItem value="problema">Problema</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Escribe aquí el detalle de la nota..."
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              inputProps={{ maxLength: 1000 }}
              helperText={`${nuevaNota.length}/1000 caracteres`}
            />
            <Button
              variant="contained"
              onClick={handleAgregar}
              disabled={!nuevaNota.trim()}
              sx={{ mt: 1 }}
            >
              Agregar Nota
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Historial de Notas ({notasOrdenadas.length})
        </Typography>

        {notasOrdenadas.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No hay notas registradas para este cliente
          </Alert>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notasOrdenadas.map((nota, index) => (
              <React.Fragment key={nota._id || index}>
                <ListItem
                  alignItems="flex-start"
                  secondaryAction={
                    userType === 'admin' && (
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleEliminar(nota._id!)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          icon={getIconoTipo(nota.tipo)}
                          label={nota.tipo.toUpperCase()}
                          color={getColorTipo(nota.tipo)}
                          size="small"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(nota.fechaCreacion)} • {nota.creadoPor}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        component="p"
                        sx={{ whiteSpace: 'pre-wrap', mt: 1 }}
                      >
                        {nota.texto}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < notasOrdenadas.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotasClienteModal;
