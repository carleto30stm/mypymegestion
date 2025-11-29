import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../redux/store';
import { 
  fetchCategories, 
  addCategory, 
  updateCategory, 
  deleteCategory, 
  applyParitaria 
} from '../redux/slices/categoriesSlice';
import { Category } from '../types';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import { formatCurrency, formatNumberInput, getNumericValue } from '../utils/formatters';

const ParitariasComponent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories, status, error } = useSelector((state: RootState) => state.categories);

  const [openDialog, setOpenDialog] = useState(false);
  const [openParitariaDialog, setOpenParitariaDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form state for Category
  const [formData, setFormData] = useState({
    nombre: '',
    sueldoBasico: '',
    valorHora: '',
    descripcion: ''
  });

  // Form state for Paritaria
  const [paritariaPercent, setParitariaPercent] = useState('');

  // Antigüedad Calculator State
  const [antiguedadYears, setAntiguedadYears] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [antiguedadPercent, setAntiguedadPercent] = useState('1'); // 1% por año default

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        nombre: category.nombre,
        sueldoBasico: category.sueldoBasico.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
        valorHora: category.valorHora ? category.valorHora.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '',
        descripcion: category.descripcion || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({
        nombre: '',
        sueldoBasico: '',
        valorHora: '',
        descripcion: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async () => {
    const categoryData = {
      nombre: formData.nombre,
      sueldoBasico: getNumericValue(formData.sueldoBasico),
      valorHora: formData.valorHora ? getNumericValue(formData.valorHora) : undefined,
      descripcion: formData.descripcion
    };

    if (editingCategory) {
      await dispatch(updateCategory({ id: editingCategory._id, category: categoryData }));
    } else {
      await dispatch(addCategory(categoryData));
    }
    handleCloseDialog();
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta categoría?')) {
      await dispatch(deleteCategory(id));
    }
  };

  const handleApplyParitaria = async () => {
    const percent = parseFloat(paritariaPercent);
    if (!isNaN(percent)) {
      if (window.confirm(`¿Está seguro de aplicar un aumento del ${percent}% a TODAS las categorías?`)) {
        await dispatch(applyParitaria({ porcentaje: percent }));
        setOpenParitariaDialog(false);
        setParitariaPercent('');
      }
    }
  };

  // Calculator Logic
  const calculateAntiguedad = () => {
    if (!selectedCatId || !antiguedadYears) return null;
    const category = categories.find(c => c._id === selectedCatId);
    if (!category) return null;

    const years = parseFloat(antiguedadYears);
    const percentPerYear = parseFloat(antiguedadPercent);
    const totalPercent = years * percentPerYear;
    const antiguedadAmount = category.sueldoBasico * (totalPercent / 100);
    const totalSalary = category.sueldoBasico + antiguedadAmount;

    return {
      base: category.sueldoBasico,
      antiguedadAmount,
      total: totalSalary,
      percent: totalPercent
    };
  };

  const calculationResult = calculateAntiguedad();

  const handleCurrencyChange = (field: 'sueldoBasico' | 'valorHora') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatNumberInput(value);
    setFormData({ ...formData, [field]: formatted });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Gestión de Categorías y Paritarias
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<TrendingUpIcon />}
            onClick={() => setOpenParitariaDialog(true)}
          >
            Aplicar Paritaria
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nueva Categoría
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">Sueldo Básico</TableCell>
                    <TableCell align="right">Valor Hora</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category._id} hover>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        {category.nombre}
                      </TableCell>
                      <TableCell align="right">
                        <Typography color="primary" fontWeight="medium">
                          {formatCurrency(category.sueldoBasico)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {category.valorHora ? formatCurrency(category.valorHora) : '-'}
                      </TableCell>
                      <TableCell>{category.descripcion || '-'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton onClick={() => handleOpenDialog(category)} color="primary" size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton onClick={() => handleDeleteCategory(category._id)} color="error" size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No hay categorías registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CalculateIcon color="primary" />
                <Typography variant="h6">Calculadora de Antigüedad</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Simula el sueldo final incluyendo antigüedad.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Categoría"
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  SelectProps={{ native: true }}
                  fullWidth
                  size="small"
                >
                  <option value="">Seleccione una categoría</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.nombre} - {formatCurrency(cat.sueldoBasico)}
                    </option>
                  ))}
                </TextField>

                <TextField
                  label="Años de Antigüedad"
                  type="number"
                  value={antiguedadYears}
                  onChange={(e) => setAntiguedadYears(e.target.value)}
                  fullWidth
                  size="small"
                />

                <TextField
                  label="% por Año"
                  type="number"
                  value={antiguedadPercent}
                  onChange={(e) => setAntiguedadPercent(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="Porcentaje acumulativo por año"
                />

                {calculationResult && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Básico:</Typography>
                      <Typography variant="body2" fontWeight="bold">{formatCurrency(calculationResult.base)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Antigüedad (+{calculationResult.percent}%):</Typography>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        +{formatCurrency(calculationResult.antiguedadAmount)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1" fontWeight="bold">Total:</Typography>
                      <Typography variant="subtitle1" color="primary.main" fontWeight="bold">
                        {formatCurrency(calculationResult.total)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog: Create/Edit Category */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre de Categoría"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Sueldo Básico"
              value={formData.sueldoBasico}
              onChange={handleCurrencyChange('sueldoBasico')}
              fullWidth
              required
              InputProps={{ startAdornment: '$' }}
              placeholder="0,00"
            />
            <TextField
              label="Valor Hora (Opcional)"
              value={formData.valorHora}
              onChange={handleCurrencyChange('valorHora')}
              fullWidth
              InputProps={{ startAdornment: '$' }}
              placeholder="0,00"
            />
            <TextField
              label="Descripción"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSaveCategory} variant="contained" disabled={!formData.nombre || !formData.sueldoBasico}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Apply Paritaria */}
      <Dialog open={openParitariaDialog} onClose={() => setOpenParitariaDialog(false)}>
        <DialogTitle>Aplicar Aumento (Paritaria)</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
            Esto aplicará un aumento porcentual al Sueldo Básico y Valor Hora de TODAS las categorías.
          </Typography>
          <TextField
            label="Porcentaje de Aumento"
            type="number"
            value={paritariaPercent}
            onChange={(e) => setParitariaPercent(e.target.value)}
            fullWidth
            InputProps={{ endAdornment: '%' }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParitariaDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleApplyParitaria} 
            variant="contained" 
            color="secondary"
            disabled={!paritariaPercent}
          >
            Aplicar Aumento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParitariasComponent;
