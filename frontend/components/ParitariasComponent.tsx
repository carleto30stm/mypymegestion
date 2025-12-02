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
import { conveniosAPI } from '../services/rrhhService';
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
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon,
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { formatCurrency, formatNumberInput, getNumericValue } from '../utils/formatters';

// Interface para categoría de convenio
interface CategoriaConvenio {
  codigo: string;
  nombre: string;
  salarioBasico: number;
  orden: number;
  activa?: boolean;
}

// Interface para convenio
interface Convenio {
  _id: string;
  numero: string;
  nombre: string;
  sindicato: string;
  estado: string;
  categorias: CategoriaConvenio[];
}

const ParitariasComponent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories, status, error } = useSelector((state: RootState) => state.categories);

  // Estado para convenios CCT
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loadingConvenios, setLoadingConvenios] = useState(false);
  const [errorConvenios, setErrorConvenios] = useState<string | null>(null);

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
  const [selectedSource, setSelectedSource] = useState<'interna' | 'convenio'>('interna');

  // Cargar categorías internas y convenios
  useEffect(() => {
    dispatch(fetchCategories());
    loadConvenios();
  }, [dispatch]);

  const loadConvenios = async () => {
    setLoadingConvenios(true);
    setErrorConvenios(null);
    try {
      const response = await conveniosAPI.obtenerTodos();
      setConvenios(response.data || response || []);
    } catch (err: any) {
      console.error('Error cargando convenios:', err);
      setErrorConvenios(err.response?.data?.message || 'Error al cargar convenios');
    } finally {
      setLoadingConvenios(false);
    }
  };

  // Obtener todas las categorías de convenios para la calculadora
  const todasCategoriasConvenio = convenios.flatMap(conv => 
    (conv.categorias || []).filter(c => c.activa !== false).map(cat => ({
      ...cat,
      convenioNombre: conv.nombre,
      convenioId: conv._id
    }))
  );

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

    if (editingCategory && editingCategory._id) {
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
      if (window.confirm(`¿Está seguro de aplicar un aumento del ${percent}% a TODAS las categorías internas?`)) {
        await dispatch(applyParitaria({ porcentaje: percent }));
        setOpenParitariaDialog(false);
        setParitariaPercent('');
      }
    }
  };

  // Calculator Logic - soporta categorías internas y de convenio
  const calculateAntiguedad = () => {
    if (!selectedCatId || !antiguedadYears) return null;
    
    let sueldoBasico = 0;
    let nombreCategoria = '';
    
    if (selectedSource === 'interna') {
      const category = categories.find(c => c._id === selectedCatId);
      if (!category) return null;
      sueldoBasico = category.sueldoBasico;
      nombreCategoria = category.nombre;
    } else {
      // Buscar en categorías de convenio (formato: convenioId|codigo)
      const [convenioId, codigo] = selectedCatId.split('|');
      const convenio = convenios.find(c => c._id === convenioId);
      if (!convenio) return null;
      const catConvenio = convenio.categorias.find(c => c.codigo === codigo);
      if (!catConvenio) return null;
      sueldoBasico = catConvenio.salarioBasico;
      nombreCategoria = `${catConvenio.nombre} (${convenio.nombre})`;
    }

    const years = parseFloat(antiguedadYears);
    const percentPerYear = parseFloat(antiguedadPercent);
    const totalPercent = years * percentPerYear;
    const antiguedadAmount = sueldoBasico * (totalPercent / 100);
    const totalSalary = sueldoBasico + antiguedadAmount;

    return {
      base: sueldoBasico,
      antiguedadAmount,
      total: totalSalary,
      percent: totalPercent,
      nombreCategoria
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
      {/* Texto de ayuda */}
      <Alert severity="info" sx={{ mb: 3 }} icon={false}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          💡 ¿Cuándo usar esta sección?
        </Typography>
        <Typography variant="body2">
          • <strong>Categorías internas:</strong> Crea tu propia escala salarial para la empresa (Gerente, Supervisor, Vendedor, etc.)<br />
          • <strong>Empleados informales:</strong> Personal que no está bajo ningún convenio sindical<br />
          • <strong>Aumentos por decisión propia:</strong> Aplica aumentos que la empresa decide, no impuestos por sindicatos<br />
          • <strong>Personal fuera de convenio:</strong> Gerentes, dueños, personal jerárquico<br />
          <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.85em', display: 'block', mt: 1 }}>
            📋 Para convenios colectivos de trabajo (CCT) y paritarias sindicales, usa la sección <strong>Recursos Humanos → Convenios CCT</strong>
          </Box>
        </Typography>
      </Alert>

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
      {errorConvenios && <Alert severity="warning" sx={{ mb: 2 }}>{errorConvenios}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {/* Sección: Categorías Internas */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WorkIcon color="primary" />
                <Typography variant="h6">Categorías Internas (Informales)</Typography>
                <Chip label={categories.length} size="small" color="primary" sx={{ ml: 1 }} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Escalas salariales propias de la empresa para empleados fuera de convenio o personal informal.
              </Typography>
              <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
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
                              <IconButton onClick={() => category._id && handleDeleteCategory(category._id)} color="error" size="small">
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {categories.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No hay categorías internas registradas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </AccordionDetails>
          </Accordion>

          {/* Sección: Categorías de Convenios CCT */}
          <Accordion defaultExpanded sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="secondary" />
                <Typography variant="h6">Categorías de Convenios CCT (Formales)</Typography>
                <Chip label={convenios.length} size="small" color="secondary" sx={{ ml: 1 }} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Escalas salariales según Convenios Colectivos de Trabajo para empleados en relación de dependencia formal.
                <br />
                <em>Para crear o editar convenios, ve a <strong>Recursos Humanos → Convenios CCT</strong></em>
              </Typography>
              
              {loadingConvenios ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : convenios.length === 0 ? (
                <Alert severity="info" variant="outlined">
                  No hay convenios CCT registrados. Crea uno en la sección de Recursos Humanos.
                </Alert>
              ) : (
                convenios.map((convenio) => (
                  <Paper key={convenio._id} variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {convenio.nombre} ({convenio.numero})
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Sindicato: {convenio.sindicato}
                          </Typography>
                        </Box>
                        <Chip 
                          label={convenio.estado} 
                          size="small" 
                          color={convenio.estado === 'vigente' ? 'success' : 'default'} 
                        />
                      </Box>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Código</TableCell>
                            <TableCell>Categoría</TableCell>
                            <TableCell align="right">Salario Básico</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(convenio.categorias || [])
                            .filter(cat => cat.activa !== false)
                            .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                            .map((cat, idx) => (
                              <TableRow key={`${convenio._id}-${cat.codigo}-${idx}`} hover>
                                <TableCell>
                                  <Chip label={cat.codigo} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell>{cat.nombre}</TableCell>
                                <TableCell align="right">
                                  <Typography color="secondary" fontWeight="medium">
                                    {formatCurrency(cat.salarioBasico)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          {(!convenio.categorias || convenio.categorias.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary' }}>
                                Sin categorías definidas
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                ))
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CalculateIcon color="primary" />
                <Typography variant="h6">Calculadora de Antigüedad</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Simula el sueldo final incluyendo antigüedad (internas o convenio).
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Selector de fuente */}
                <TextField
                  select
                  label="Tipo de Categoría"
                  value={selectedSource}
                  onChange={(e) => {
                    setSelectedSource(e.target.value as 'interna' | 'convenio');
                    setSelectedCatId('');
                  }}
                  SelectProps={{ native: true }}
                  fullWidth
                  size="small"
                >
                  <option value="interna">Categorías Internas</option>
                  <option value="convenio">Categorías de Convenio CCT</option>
                </TextField>

                {/* Selector de categoría según fuente */}
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
                  {selectedSource === 'interna' ? (
                    categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.nombre} - {formatCurrency(cat.sueldoBasico)}
                      </option>
                    ))
                  ) : (
                    convenios.flatMap(conv => 
                      (conv.categorias || [])
                        .filter(cat => cat.activa !== false)
                        .map(cat => (
                          <option 
                            key={`${conv._id}|${cat.codigo}`} 
                            value={`${conv._id}|${cat.codigo}`}
                          >
                            [{conv.nombre}] {cat.nombre} - {formatCurrency(cat.salarioBasico)}
                          </option>
                        ))
                    )
                  )}
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
