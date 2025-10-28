import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogTitle
} from '@mui/material';
import { Add as AddIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import HoraExtraForm from '../components/HoraExtraForm';
import HorasExtraTable from '../components/HorasExtraTable';
import { HoraExtra } from '../types';

const HorasExtraPage: React.FC = () => {
  const [openForm, setOpenForm] = useState(false);
  const [selectedHora, setSelectedHora] = useState<HoraExtra | null>(null);

  const handleOpenForm = (horaExtra?: HoraExtra) => {
    setSelectedHora(horaExtra || null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setSelectedHora(null);
    setOpenForm(false);
  };

  const handleFormSuccess = () => {
    handleCloseForm();
    // Opcional: mostrar mensaje de éxito
  };



  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ScheduleIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Gestión de Horas Extra
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          size="large"
        >
          Registrar Horas Extra
        </Button>
      </Box>

      {/* Contenido principal */}
      <Box>
        <HorasExtraTable onEditHoraExtra={handleOpenForm} />
      </Box>

      {/* Dialog para formulario */}
      <Dialog 
        open={openForm} 
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedHora ? 'Editar Hora Extra' : 'Registrar Horas Extra'}
        </DialogTitle>
        <DialogContent>
          <HoraExtraForm
            horaExtra={selectedHora}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HorasExtraPage;