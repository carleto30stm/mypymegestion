import React from 'react';
import { Box } from '@mui/material';
import MetricasProductos from '../components/MetricasProductos';

const MetricasProductosPage: React.FC = () => {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        p: 3
      }}
    >
      <MetricasProductos />
    </Box>
  );
};

export default MetricasProductosPage;
