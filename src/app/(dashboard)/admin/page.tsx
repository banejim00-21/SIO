'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { 
  Building2, DollarSign, TrendingUp, AlertTriangle, Download, Filter, Loader2, 
  FileText, RefreshCw, Eye, Trash2, Calendar, MapPin, X, BarChart3,
  TrendingDown, Clock, CheckCircle2, Layers, Printer, ChevronDown, Search, 
  FileSpreadsheet, ArrowUpDown, Receipt, Check
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Area
} from 'recharts'

// ============ TIPOS ============
interface CurvaSData {
  mes: string
  parcial: number
  acumulado: number
  parcialPorcentaje: number
  acumuladoPorcentaje: number
  programadoAcumulado: number
  programadoPorcentaje: number
}

interface PartidaDetalle {
  id: number
  codigo: string
  nombre: string
  presupuesto: number
  ejecutado: number
  avance: number
}

interface ObraDetalle {
  id_obra: number
  nombre_obra: string
  descripcion: string
  ubicacion: string
  presupuesto_inicial: number
  presupuesto_partidas: number
  ejecutado: number
  saldo: number
  estado: string
  avanceFisico: number
  avanceFinanciero: number
  avanceProgramado: number
  diferenciaAvance: number
  partidas: number
  actividades: number
  gastos: number
  documentos: number
  alertas: number
  fecha_inicio: string | null
  fecha_fin: string | null
  fecha_creacion: string | null
  ultima_actualizacion: string | null
  responsable: string
  responsable_email: string
  diasTranscurridos: number
  diasTotales: number
  diasRetraso: number
  estadoSemaforo: string
  curvaS: CurvaSData[]
  partidasDetalle: PartidaDetalle[]
}

interface EstadisticaEstado {
  estado: string
  label: string
  cantidad: number
  color: string
}

interface Stats {
  resumen: {
    totalObras: number
    obrasPlaneadas: number
    obrasEnEjecucion: number
    obrasConcluidas: number
    obrasLiquidadas: number
    obrasConRetraso: number
    obrasCriticas: number
    obrasEnRiesgo: number
    obrasEnPlazo: number
    presupuestoTotal: number
    ejecutadoTotal: number
    saldoPendiente: number
    avancePromedio: number
    totalPartidas: number
    totalActividades: number
    totalGastos: number
    totalDocumentos: number
    totalAlertas: number
  }
  graficos: {
    estadisticasPorEstado: EstadisticaEstado[]
    semaforoGeneral: { verde: number; amarillo: number; rojo: number }
    curvaSGlobal: CurvaSData[]
    distribucionComprobantes: Array<{ tipo: string; monto: number; porcentaje: number }>
    distribucionPartidas: Array<{ codigo: string; nombre: string; ejecutado: number; presupuesto: number; avance: number }>
    distribucionUbicacion: Array<{ ubicacion: string; presupuesto: number; ejecutado: number; obras: number; avance: number }>
    distribucionResponsable: Array<{ nombre: string; presupuesto: number; ejecutado: number; obras: number; avance: number }>
    distribucionAnual: Array<{ anio: number; presupuesto: number; ejecutado: number; obras: number; avance: number }>
    comparativoAvances: Array<{ id: number; nombre: string; avanceFisico: number; avanceFinanciero: number; avanceProgramado: number; diferencia: number }>
    retrasosPorObra: Array<{ id: number; nombre: string; diasRetraso: number; avance: number; estado: string }>
    topObrasPorPresupuesto: ObraDetalle[]
    topObrasPorAvance: ObraDetalle[]
    topObrasPorEjecucion: ObraDetalle[]
  }
  obras: ObraDetalle[]
  filtros: {
    ubicaciones: string[]
    anios: number[]
    responsables: Array<{ id_usuario: number; nombre: string }>
    estados: string[]
    obrasDisponibles: Array<{ id: number; nombre: string }>
  }
}

interface Reporte {
  id_documento: number
  nombre_archivo: string
  descripcion: string
  ruta_archivo: string
  fecha_carga: string
  usuario: string
}

// ============ HELPERS ============
const formatCurrency = (v: number): string => 
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v)

const formatCompact = (v: number): string => {
  if (v >= 1000000) return `S/ ${(v/1000000).toFixed(2)}M`
  if (v >= 1000) return `S/ ${(v/1000).toFixed(1)}K`
  return formatCurrency(v)
}

const formatPercent = (v: number): string => `${v.toFixed(2)}%`
const formatDate = (d: string | null): string => d ? new Date(d).toLocaleDateString('es-PE') : '-'

const COLORS_ESTADO: Record<string, string> = {
  PLANEADA: '#8b5cf6', EN_EJECUCION: '#22c55e', CONCLUIDA: '#f59e0b', LIQUIDADA: '#06b6d4'
}

const ESTADO_LABELS: Record<string, string> = {
  PLANEADA: 'Planeada', EN_EJECUCION: 'En Ejecución', CONCLUIDA: 'Concluida', LIQUIDADA: 'Liquidada'
}

interface ExcelHeader { key: string; label: string }

const exportToExcel = (data: Record<string, unknown>[], filename: string, headers: ExcelHeader[]): void => {
  const csvContent = [
    headers.map(h => h.label).join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h.key]
      if (typeof val === 'number') return val.toString()
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`
      return String(val || '')
    }).join(','))
  ].join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}-${Date.now()}.csv`
  link.click()
  toast.success('Archivo exportado')
}

// ============ MULTISELECT ============
interface MultiSelectOption { value: string; label: string; color?: string }
interface MultiSelectProps {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

function MultiSelect({ label, icon: Icon, options, selected, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }
  
  const selectAll = () => onChange(options.map(o => o.value))
  const clearAll = () => onChange([])
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 bg-slate-700/50 border-slate-600 text-white text-xs min-w-[120px] px-2 justify-between">
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3 w-3 text-slate-400" />}
            <span className="truncate">
              {selected.length === 0 ? (placeholder || label) : 
               selected.length === 1 ? options.find(o => o.value === selected[0])?.label?.substring(0, 12) + '...' :
               `${selected.length} sel.`}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0 bg-slate-800 border-slate-700" align="start">
        <div className="p-2 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">{label}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={selectAll} className="h-5 text-[9px] text-emerald-400 hover:text-emerald-300 px-1.5">Todos</Button>
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-5 text-[9px] text-slate-400 hover:text-white px-1.5">Limpiar</Button>
          </div>
        </div>
        <ScrollArea className="h-[180px]">
          <div className="p-1.5 space-y-0.5">
            {options.map(opt => (
              <div 
                key={opt.value} 
                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${selected.includes(opt.value) ? 'bg-emerald-600/20' : 'hover:bg-slate-700/50'}`}
                onClick={() => toggle(opt.value)}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.includes(opt.value) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                  {selected.includes(opt.value) && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                {opt.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />}
                <span className="text-xs text-slate-200 truncate">{opt.label}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
        {selected.length > 0 && (
          <div className="p-2 border-t border-slate-700">
            <Badge className="bg-emerald-600/20 text-emerald-300 text-[9px]">{selected.length} de {options.length}</Badge>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ============ SECCIONES PDF ============
const SECCIONES_PDF = [
  { id: 'kpis', nombre: 'KPIs Principales', cat: 'resumen' },
  { id: 'semaforo', nombre: 'Semáforo General', cat: 'resumen' },
  { id: 'curvaS', nombre: 'Curva S (Ejecutado vs Programado)', cat: 'graficos' },
  { id: 'avanceMensual', nombre: 'Avance Mensual', cat: 'graficos' },
  { id: 'tablaAvance', nombre: 'Tabla Avance Ejecutado', cat: 'tablas' },
  { id: 'tablaPartidas', nombre: 'Tabla Partidas', cat: 'tablas' },
  { id: 'tablaObras', nombre: 'Listado Obras', cat: 'tablas' },
]

// ============ CUSTOM TOOLTIP COMPONENT ============
interface CustomTooltipPayload {
  value: number
  name: string
  color?: string
  dataKey?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: CustomTooltipPayload[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-lg">
      <p className="text-white font-medium text-xs mb-1">{label}</p>
      {payload.map((entry: CustomTooltipPayload, index: number) => (
        <p key={index} className="text-xs" style={{ color: entry.color || '#94a3b8' }}>
          {entry.name}: {typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  )
}
// ============ COMPONENTE PRINCIPAL ============
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [filtroAnios, setFiltroAnios] = useState<string[]>([])
  const [filtroEstados, setFiltroEstados] = useState<string[]>([])
  const [filtroUbicaciones, setFiltroUbicaciones] = useState<string[]>([])
  const [filtroObras, setFiltroObras] = useState<string[]>([])
  const [obraActiva, setObraActiva] = useState<string>('')
  
  const [busquedaObra, setBusquedaObra] = useState('')
  const [ordenTabla, setOrdenTabla] = useState<{ campo: string; dir: 'asc' | 'desc' }>({ campo: 'id_obra', dir: 'asc' })
  
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showReportesModal, setShowReportesModal] = useState(false)
  const [showPdfViewerModal, setShowPdfViewerModal] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState('')
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  
  const [seccionesSeleccionadas, setSeccionesSeleccionadas] = useState<string[]>(['kpis', 'semaforo', 'curvaS', 'tablaAvance', 'tablaObras'])
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [generatingPreview, setGeneratingPreview] = useState(false)

  // Ref para logo base64
  const logoBase64Ref = useRef<string | null>(null)

  // Cargar logo como base64 al montar
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch('/LOGO_D.png')
        const blob = await response.blob()
        const reader = new FileReader()
        reader.onloadend = () => {
          logoBase64Ref.current = reader.result as string
        }
        reader.readAsDataURL(blob)
      } catch (error) {
        console.warn('No se pudo cargar el logo:', error)
      }
    }
    loadLogo()
  }, [])

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    if (filtroAnios.length > 0) params.append('anios', filtroAnios.join(','))
    if (filtroEstados.length > 0) params.append('estados', filtroEstados.join(','))
    if (filtroUbicaciones.length > 0) params.append('ubicaciones', filtroUbicaciones.join(','))
    if (filtroObras.length > 0) params.append('obras', filtroObras.join(','))
    if (obraActiva) params.append('obraId', obraActiva)
    return params.toString()
  }, [filtroAnios, filtroEstados, filtroUbicaciones, filtroObras, obraActiva])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/dashboard/stats?${buildQueryParams()}`)
      if (!res.ok) throw new Error('Error')
      const data = await res.json()
      setStats(data)
    } catch {
      toast.error('Error al cargar estadísticas')
    } finally { 
      setLoading(false) 
    }
  }, [buildQueryParams])

  const fetchReportes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard/reportes')
      const data = await res.json()
      setReportes(data.reportes || [])
    } catch { 
      console.log('Sin reportes') 
    }
  }, [])

  useEffect(() => { 
    fetchStats()
    fetchReportes() 
  }, [fetchStats, fetchReportes])

  const handleRefresh = () => { 
    setLoading(true)
    fetchStats()
    fetchReportes() 
  }

  const clearAllFilters = () => { 
    setFiltroAnios([])
    setFiltroEstados([])
    setFiltroUbicaciones([])
    setFiltroObras([])
    setObraActiva('') 
  }

  const hasActiveFilters = filtroAnios.length > 0 || filtroEstados.length > 0 || filtroUbicaciones.length > 0 || filtroObras.length > 0

  const toggleSeccion = (id: string) => { 
    setSeccionesSeleccionadas(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
    setPdfPreviewUrl(null) 
  }

  const obrasFiltradas = useMemo(() => {
    if (!stats?.obras) return []
    let result = [...stats.obras]
    if (busquedaObra) {
      const search = busquedaObra.toLowerCase()
      result = result.filter(o => 
        o.nombre_obra.toLowerCase().includes(search) || 
        o.ubicacion?.toLowerCase().includes(search)
      )
    }
    result.sort((a, b) => {
      const campo = ordenTabla.campo as keyof ObraDetalle
      const aVal = a[campo]
      const bVal = b[campo]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return ordenTabla.dir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return ordenTabla.dir === 'asc' 
        ? String(aVal || '').localeCompare(String(bVal || '')) 
        : String(bVal || '').localeCompare(String(aVal || ''))
    })
    return result
  }, [stats?.obras, busquedaObra, ordenTabla])

  const handleSort = (campo: string) => { 
    setOrdenTabla(prev => ({ 
      campo, 
      dir: prev.campo === campo && prev.dir === 'asc' ? 'desc' : 'asc' 
    })) 
  }

  const exportarObras = () => {
    exportToExcel(obrasFiltradas as unknown as Record<string, unknown>[], 'obras', [
      { key: 'id_obra', label: 'Código' }, 
      { key: 'nombre_obra', label: 'Nombre' }, 
      { key: 'ubicacion', label: 'Ubicación' },
      { key: 'presupuesto_inicial', label: 'Presupuesto' }, 
      { key: 'ejecutado', label: 'Ejecutado' }, 
      { key: 'avanceFisico', label: '% Físico' }
    ])
  }

  // Datos derivados
  const r = stats?.resumen
  const g = stats?.graficos
  const obraSeleccionadaData = obraActiva ? stats?.obras.find(o => o.id_obra.toString() === obraActiva) : null
  const curvaData = obraSeleccionadaData?.curvaS || g?.curvaSGlobal || []
  const partidasData = obraSeleccionadaData?.partidasDetalle || []
  const estadisticasEstado = g?.estadisticasPorEstado || []

  // Calcular interpretación de Curva S
  const getInterpretacion = useCallback(() => {
    if (curvaData.length === 0) return null
    const ultimaCurva = curvaData[curvaData.length - 1]
    const ejecutadoAcum = ultimaCurva.acumulado
    const programadoAcum = ultimaCurva.programadoAcumulado
    const diferencia = programadoAcum - ejecutadoAcum
    const estado = diferencia > 0 ? 'ATRASADA' : diferencia < 0 ? 'ADELANTADA' : 'EN TIEMPO'
    return { ejecutadoAcum, programadoAcum, diferencia, estado, porcentajeEjec: ultimaCurva.acumuladoPorcentaje }
  }, [curvaData])
  // ============ GENERADOR DE PDF CON jsPDF PURO ============
  const generatePdf = async (forPreview: boolean, saveToServer: boolean = false) => {
    if (seccionesSeleccionadas.length === 0) { 
      toast.error('Seleccione al menos una sección')
      return 
    }
    
    if (forPreview) setGeneratingPreview(true)
    else setGeneratingPdf(true)
    
    try {
      const jspdfModule = await import('jspdf')
      const { jsPDF } = jspdfModule
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const margin = 15
      const contentWidth = pageWidth - (margin * 2)

      // Datos para el PDF
      const obraSeleccionada = obraActiva ? stats?.obras.find(o => o.id_obra.toString() === obraActiva) : null
      const presupuestoTotal = obraSeleccionada?.presupuesto_inicial || stats?.resumen?.presupuestoTotal || 0
      const ejecutadoTotal = obraSeleccionada?.ejecutado || stats?.resumen?.ejecutadoTotal || 0
      const interp = getInterpretacion()
      
      const nombreArchivo = obraSeleccionada 
        ? `Reporte_${obraSeleccionada.nombre_obra.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}_${new Date().toISOString().split('T')[0]}`
        : `Reporte_General_Obras_${new Date().toISOString().split('T')[0]}`

      // ========== PORTADA ==========
      pdf.setFillColor(15, 23, 42)
      pdf.rect(0, 0, pageWidth, 55, 'F')

      // Logo
      if (logoBase64Ref.current) {
        try {
          pdf.addImage(logoBase64Ref.current, 'PNG', margin, 8, 28, 28)
        } catch {
          pdf.setFillColor(34, 197, 94)
          pdf.roundedRect(margin, 12, 22, 22, 3, 3, 'F')
          pdf.setTextColor(255, 255, 255)
          pdf.setFontSize(8)
          pdf.setFont('helvetica', 'bold')
          pdf.text('UNDAC', margin + 3, 25)
        }
      } else {
        pdf.setFillColor(34, 197, 94)
        pdf.roundedRect(margin, 12, 22, 22, 3, 3, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        pdf.text('UNDAC', margin + 3, 25)
      }

      // Título institución
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('SISTEMA INTEGRAL DE OBRAS', margin + 35, 18)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Universidad Nacional Daniel Alcides Carrión', margin + 35, 26)
      
      pdf.setFontSize(8)
      pdf.setTextColor(148, 163, 184)
      pdf.text('Oficina de Infraestructura y Desarrollo - Cerro de Pasco', margin + 35, 34)
      pdf.text(`Generado: ${new Date().toLocaleString('es-PE')}`, margin + 35, 42)

      let yPos = 65

      // ========== INFO OBRA O GENERAL ==========
      if (obraSeleccionada) {
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(30, 41, 59)
        pdf.text('REPORTE DE ESTADO DE OBRA', margin, yPos)
        yPos += 10
        
        pdf.setFillColor(241, 245, 249)
        pdf.roundedRect(margin, yPos, contentWidth, 45, 3, 3, 'F')
        pdf.setDrawColor(203, 213, 225)
        pdf.roundedRect(margin, yPos, contentWidth, 45, 3, 3, 'S')
        
        yPos += 8
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(15, 23, 42)
        pdf.text('Obra:', margin + 5, yPos)
        pdf.setFont('helvetica', 'normal')
        const nombreObra = obraSeleccionada.nombre_obra.length > 55 
          ? obraSeleccionada.nombre_obra.substring(0, 55) + '...' 
          : obraSeleccionada.nombre_obra
        pdf.text(nombreObra, margin + 18, yPos)
        
        yPos += 7
        pdf.setFont('helvetica', 'bold')
        pdf.text('Ubicación:', margin + 5, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(obraSeleccionada.ubicacion || 'No especificada', margin + 30, yPos)
        
        yPos += 7
        pdf.setFont('helvetica', 'bold')
        pdf.text('Estado:', margin + 5, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(ESTADO_LABELS[obraSeleccionada.estado] || obraSeleccionada.estado, margin + 23, yPos)
        
        pdf.setFont('helvetica', 'bold')
        pdf.text('Responsable:', margin + 80, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(obraSeleccionada.responsable || 'No asignado', margin + 108, yPos)
        
        yPos += 7
        pdf.setFont('helvetica', 'bold')
        pdf.text('Presupuesto:', margin + 5, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(formatCurrency(obraSeleccionada.presupuesto_inicial), margin + 33, yPos)
        
        pdf.setFont('helvetica', 'bold')
        pdf.text('Ejecutado:', margin + 80, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(formatCurrency(obraSeleccionada.ejecutado), margin + 103, yPos)
        
        yPos += 7
        pdf.setFont('helvetica', 'bold')
        pdf.text('F. Inicio:', margin + 5, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(formatDate(obraSeleccionada.fecha_inicio), margin + 25, yPos)
        
        pdf.setFont('helvetica', 'bold')
        pdf.text('F. Fin:', margin + 80, yPos)
        pdf.setFont('helvetica', 'normal')
        pdf.text(formatDate(obraSeleccionada.fecha_fin), margin + 95, yPos)
        
        yPos += 20
      } else {
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(30, 41, 59)
        pdf.text('REPORTE GENERAL DE OBRAS', margin, yPos)
        yPos += 10
        
        pdf.setFillColor(241, 245, 249)
        pdf.roundedRect(margin, yPos, contentWidth, 32, 3, 3, 'F')
        
        yPos += 8
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(30, 41, 59)
        pdf.text(`Total de obras: ${stats?.resumen?.totalObras || 0}`, margin + 5, yPos)
        pdf.text(`Presupuesto total: ${formatCurrency(presupuestoTotal)}`, margin + 70, yPos)
        yPos += 7
        pdf.text(`Ejecutado total: ${formatCurrency(ejecutadoTotal)}`, margin + 5, yPos)
        pdf.text(`Avance promedio: ${formatPercent(stats?.resumen?.avancePromedio || 0)}`, margin + 70, yPos)
        yPos += 18
      }

      // ========== SECCIONES SELECCIONADAS ==========
      for (const secId of seccionesSeleccionadas) {
        if (yPos > pageHeight - 60) {
          pdf.addPage()
          yPos = margin
        }

        const seccion = SECCIONES_PDF.find(s => s.id === secId)
        if (!seccion) continue

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(34, 197, 94)
        pdf.text(seccion.nombre.toUpperCase(), margin, yPos)
        yPos += 8

        switch (secId) {
          case 'kpis': {
            const kpis = [
              { label: 'Total Obras', value: r?.totalObras?.toString() || '0' },
              { label: 'En Ejecución', value: r?.obrasEnEjecucion?.toString() || '0' },
              { label: 'Presupuesto', value: formatCompact(r?.presupuestoTotal || 0) },
              { label: 'Ejecutado', value: formatCompact(r?.ejecutadoTotal || 0) },
              { label: 'Avance Promedio', value: formatPercent(r?.avancePromedio || 0) },
              { label: 'Con Retraso', value: r?.obrasConRetraso?.toString() || '0' },
            ]
            
            const colWidth = contentWidth / 3
            kpis.forEach((kpi, idx) => {
              const col = idx % 3
              const row = Math.floor(idx / 3)
              const x = margin + (col * colWidth)
              const y = yPos + (row * 15)
              
              pdf.setFillColor(241, 245, 249)
              pdf.roundedRect(x, y, colWidth - 3, 13, 2, 2, 'F')
              
              pdf.setFontSize(8)
              pdf.setFont('helvetica', 'normal')
              pdf.setTextColor(100, 116, 139)
              pdf.text(kpi.label, x + 3, y + 5)
              
              pdf.setFontSize(10)
              pdf.setFont('helvetica', 'bold')
              pdf.setTextColor(15, 23, 42)
              pdf.text(kpi.value, x + 3, y + 11)
            })
            yPos += 35
            break
          }

          case 'semaforo': {
            const sem = g?.semaforoGeneral
            if (sem) {
              const items = [
                { label: 'En Plazo', value: sem.verde, color: [34, 197, 94] as const },
                { label: 'En Riesgo', value: sem.amarillo, color: [234, 179, 8] as const },
                { label: 'Crítico', value: sem.rojo, color: [239, 68, 68] as const },
              ]
              
              items.forEach((item, idx) => {
                const x = margin + (idx * 60)
                pdf.setFillColor(item.color[0], item.color[1], item.color[2])
                pdf.circle(x + 15, yPos + 8, 8, 'F')
                pdf.setFontSize(12)
                pdf.setFont('helvetica', 'bold')
                pdf.setTextColor(255, 255, 255)
                pdf.text(item.value.toString(), x + 12, yPos + 11)
                pdf.setFontSize(9)
                pdf.setTextColor(100, 116, 139)
                pdf.text(item.label, x + 5, yPos + 22)
              })
              yPos += 30
            }
            break
          }

          case 'curvaS': {
            if (curvaData.length > 0) {
              const chartHeight = 60
              const chartWidth = contentWidth - 10
              const startX = margin + 25
              const startY = yPos + chartHeight
              
              pdf.setDrawColor(100, 116, 139)
              pdf.setLineWidth(0.3)
              pdf.line(startX, startY, startX + chartWidth - 30, startY)
              pdf.line(startX, yPos, startX, startY)
              
              const maxVal = Math.max(...curvaData.map(d => Math.max(d.acumulado, d.programadoAcumulado)))
              
              if (curvaData.length > 1) {
                const stepX = (chartWidth - 30) / (curvaData.length - 1)
                
                // Línea ejecutado (verde)
                pdf.setDrawColor(34, 197, 94)
                pdf.setLineWidth(1)
                for (let i = 0; i < curvaData.length - 1; i++) {
                  const x1 = startX + (i * stepX)
                  const y1 = startY - ((curvaData[i].acumulado / maxVal) * chartHeight)
                  const x2 = startX + ((i + 1) * stepX)
                  const y2 = startY - ((curvaData[i + 1].acumulado / maxVal) * chartHeight)
                  pdf.line(x1, y1, x2, y2)
                }
                
                // Línea programado (amarillo)
                pdf.setDrawColor(234, 179, 8)
                for (let i = 0; i < curvaData.length - 1; i++) {
                  const x1 = startX + (i * stepX)
                  const y1 = startY - ((curvaData[i].programadoAcumulado / maxVal) * chartHeight)
                  const x2 = startX + ((i + 1) * stepX)
                  const y2 = startY - ((curvaData[i + 1].programadoAcumulado / maxVal) * chartHeight)
                  pdf.line(x1, y1, x2, y2)
                }
                
                pdf.setFontSize(6)
                pdf.setTextColor(100, 116, 139)
                curvaData.forEach((d, i) => {
                  if (i % 2 === 0 || curvaData.length <= 6) {
                    pdf.text(d.mes.substring(0, 3), startX + (i * stepX) - 5, startY + 5)
                  }
                })
              }
              
              yPos = startY + 10
              pdf.setFontSize(8)
              pdf.setFillColor(34, 197, 94)
              pdf.rect(margin, yPos, 10, 3, 'F')
              pdf.setTextColor(51, 65, 85)
              pdf.text('Ejecutado', margin + 12, yPos + 3)
              
              pdf.setFillColor(234, 179, 8)
              pdf.rect(margin + 50, yPos, 10, 3, 'F')
              pdf.text('Programado', margin + 62, yPos + 3)
              yPos += 12
              
              // Interpretación
              if (interp) {
                pdf.setFillColor(241, 245, 249)
                pdf.roundedRect(margin, yPos, contentWidth, 30, 2, 2, 'F')
                pdf.setFillColor(34, 197, 94)
                pdf.rect(margin, yPos, 3, 30, 'F')
                
                yPos += 6
                pdf.setFontSize(9)
                pdf.setFont('helvetica', 'bold')
                pdf.setTextColor(30, 41, 59)
                pdf.text('Análisis:', margin + 6, yPos)
                
                yPos += 5
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(8)
                pdf.text(`• Ejecutado acumulado: ${formatCurrency(interp.ejecutadoAcum)} (${formatPercent(interp.porcentajeEjec)})`, margin + 6, yPos)
                yPos += 4
                pdf.text(`• Programado acumulado: ${formatCurrency(interp.programadoAcum)}`, margin + 6, yPos)
                yPos += 4
                pdf.text(`• Diferencia: ${formatCurrency(Math.abs(interp.diferencia))} ${interp.diferencia > 0 ? 'por debajo' : 'por encima'}`, margin + 6, yPos)
                yPos += 4
                
                if (interp.estado === 'ATRASADA') pdf.setTextColor(239, 68, 68)
                else if (interp.estado === 'ADELANTADA') pdf.setTextColor(34, 197, 94)
                else pdf.setTextColor(234, 179, 8)
                pdf.setFont('helvetica', 'bold')
                pdf.text(`• Estado: ${interp.estado}`, margin + 6, yPos)
                yPos += 10
              }
            } else {
              pdf.setFontSize(9)
              pdf.setTextColor(100, 116, 139)
              pdf.text('No hay datos de curva S disponibles', margin, yPos)
              yPos += 10
            }
            break
          }

          case 'tablaAvance': {
            if (curvaData.length > 0) {
              const headers = ['Mes', 'Parcial', 'Acumulado', '% Acum.', 'Programado', '% Prog.']
              const colWidths = [25, 30, 30, 20, 30, 20]
              
              pdf.setFillColor(30, 41, 59)
              pdf.rect(margin, yPos, contentWidth, 7, 'F')
              
              let xPos = margin
              pdf.setFontSize(7)
              pdf.setFont('helvetica', 'bold')
              pdf.setTextColor(255, 255, 255)
              headers.forEach((h, i) => {
                pdf.text(h, xPos + 2, yPos + 5)
                xPos += colWidths[i]
              })
              yPos += 7
              
              const dataToShow = curvaData.slice(0, 10)
              dataToShow.forEach((row, idx) => {
                if (yPos > pageHeight - 20) {
                  pdf.addPage()
                  yPos = margin
                }
                
                pdf.setFillColor(idx % 2 === 0 ? 248 : 241, idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 252 : 249)
                pdf.rect(margin, yPos, contentWidth, 6, 'F')
                
                pdf.setFontSize(7)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(51, 65, 85)
                
                let x = margin
                const values = [
                  row.mes,
                  formatCompact(row.parcial),
                  formatCompact(row.acumulado),
                  formatPercent(row.acumuladoPorcentaje),
                  formatCompact(row.programadoAcumulado),
                  formatPercent(row.programadoPorcentaje)
                ]
                values.forEach((v, i) => {
                  pdf.text(v, x + 2, yPos + 4)
                  x += colWidths[i]
                })
                yPos += 6
              })
              
              if (curvaData.length > 10) {
                pdf.setFontSize(7)
                pdf.setTextColor(100, 116, 139)
                pdf.text(`... y ${curvaData.length - 10} registros más`, margin, yPos + 4)
              }
              yPos += 10
            }
            break
          }

          case 'tablaPartidas': {
            if (partidasData.length > 0) {
              const headers = ['Código', 'Descripción', 'Presupuesto', 'Ejecutado', '% Avance']
              const colWidths = [25, 65, 30, 30, 25]
              
              pdf.setFillColor(30, 41, 59)
              pdf.rect(margin, yPos, contentWidth, 7, 'F')
              
              let xPos = margin
              pdf.setFontSize(7)
              pdf.setFont('helvetica', 'bold')
              pdf.setTextColor(255, 255, 255)
              headers.forEach((h, i) => {
                pdf.text(h, xPos + 2, yPos + 5)
                xPos += colWidths[i]
              })
              yPos += 7
              
              const dataToShow = partidasData.slice(0, 15)
              dataToShow.forEach((row, idx) => {
                if (yPos > pageHeight - 20) {
                  pdf.addPage()
                  yPos = margin
                }
                
                pdf.setFillColor(idx % 2 === 0 ? 248 : 241, idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 252 : 249)
                pdf.rect(margin, yPos, contentWidth, 6, 'F')
                
                pdf.setFontSize(7)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(51, 65, 85)
                
                let x = margin
                const nombre = row.nombre.length > 35 ? row.nombre.substring(0, 35) + '...' : row.nombre
                const values = [row.codigo, nombre, formatCompact(row.presupuesto), formatCompact(row.ejecutado), formatPercent(row.avance)]
                values.forEach((v, i) => {
                  pdf.text(v, x + 2, yPos + 4)
                  x += colWidths[i]
                })
                yPos += 6
              })
              yPos += 10
            } else {
              pdf.setFontSize(9)
              pdf.setTextColor(100, 116, 139)
              pdf.text('No hay partidas registradas', margin, yPos)
              yPos += 10
            }
            break
          }

          case 'tablaObras': {
            const obras = obrasFiltradas.slice(0, 15)
            if (obras.length > 0) {
              const headers = ['Cód', 'Obra', 'Ubicación', 'Presupuesto', 'Ejecutado', '% Fís.', 'Estado']
              const colWidths = [15, 50, 30, 28, 28, 15, 20]
              
              pdf.setFillColor(30, 41, 59)
              pdf.rect(margin, yPos, contentWidth, 7, 'F')
              
              let xPos = margin
              pdf.setFontSize(6)
              pdf.setFont('helvetica', 'bold')
              pdf.setTextColor(255, 255, 255)
              headers.forEach((h, i) => {
                pdf.text(h, xPos + 1, yPos + 5)
                xPos += colWidths[i]
              })
              yPos += 7
              
              obras.forEach((obra, idx) => {
                if (yPos > pageHeight - 20) {
                  pdf.addPage()
                  yPos = margin
                }
                
                pdf.setFillColor(idx % 2 === 0 ? 248 : 241, idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 252 : 249)
                pdf.rect(margin, yPos, contentWidth, 6, 'F')
                
                pdf.setFontSize(6)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(51, 65, 85)
                
                let x = margin
                const nombre = obra.nombre_obra.length > 28 ? obra.nombre_obra.substring(0, 28) + '...' : obra.nombre_obra
                const ubic = (obra.ubicacion || '').length > 18 ? obra.ubicacion.substring(0, 18) + '...' : (obra.ubicacion || '-')
                const values = [
                  obra.id_obra.toString().padStart(3, '0'),
                  nombre,
                  ubic,
                  formatCompact(obra.presupuesto_inicial),
                  formatCompact(obra.ejecutado),
                  `${obra.avanceFisico.toFixed(1)}%`,
                  ESTADO_LABELS[obra.estado] || obra.estado
                ]
                values.forEach((v, i) => {
                  pdf.text(v, x + 1, yPos + 4)
                  x += colWidths[i]
                })
                yPos += 6
              })
              
              if (obrasFiltradas.length > 15) {
                pdf.setFontSize(7)
                pdf.setTextColor(100, 116, 139)
                pdf.text(`... y ${obrasFiltradas.length - 15} obras más`, margin, yPos + 4)
              }
              yPos += 10
            }
            break
          }
        }
        yPos += 5
      }

      // ========== PIE DE PÁGINA ==========
      const pageCount = pdf.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setDrawColor(203, 213, 225)
        pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
        pdf.setFontSize(7)
        pdf.setTextColor(100, 116, 139)
        pdf.text('UNDAC - Sistema Integral de Obras - Oficina de Infraestructura y Desarrollo', margin, pageHeight - 8)
        pdf.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 20, pageHeight - 8)
      }

      // ========== GUARDAR O PREVIEW ==========
      if (forPreview) {
        setPdfPreviewUrl(pdf.output('datauristring'))
      } else if (saveToServer) {
        const pdfBlob = pdf.output('blob')
        const formData = new FormData()
        formData.append('archivo', pdfBlob, `${nombreArchivo}.pdf`)
        formData.append('obra_id', obraActiva || 'todas')
        formData.append('descripcion', obraSeleccionada ? `Reporte ${obraSeleccionada.nombre_obra}` : 'Reporte General')
        
        const res = await fetch('/api/admin/dashboard/reportes', { method: 'POST', body: formData })
        if (res.ok) { 
          toast.success('Reporte guardado exitosamente')
          fetchReportes() 
        } else {
          toast.error('Error al guardar el reporte')
        }
        setShowPreviewModal(false)
      } else {
        pdf.save(`${nombreArchivo}.pdf`)
        toast.success('PDF descargado exitosamente')
        setShowPreviewModal(false)
      }
      
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar el PDF')
    } finally { 
      setGeneratingPreview(false)
      setGeneratingPdf(false)
    }
  }

  const handleDeleteReporte = async (id: number) => {
    if (!confirm('¿Eliminar este reporte?')) return
    try {
      const res = await fetch(`/api/admin/dashboard/reportes/${id}`, { method: 'DELETE' })
      if (res.ok) { 
        toast.success('Reporte eliminado')
        fetchReportes() 
      }
    } catch { 
      toast.error('Error al eliminar') 
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  const interp = getInterpretacion()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-[1920px] mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">REPORTE DE ESTADO DE INTERVENCIONES</h1>
                <p className="text-[10px] text-slate-400">Sistema Integral de Obras - UNDAC</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={handleRefresh} className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">
                <RefreshCw className="h-3 w-3 mr-1" /> Actualizar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowReportesModal(true)} className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">
                <FileText className="h-3 w-3 mr-1" /> Reportes ({reportes.length})
              </Button>
              <Button size="sm" onClick={() => { setShowPreviewModal(true); setPdfPreviewUrl(null) }} className="h-7 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                <Printer className="h-3 w-3 mr-1" /> Generar PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto p-3 space-y-3">
        {/* Filtros */}
        <Card className="bg-slate-800/40 border-slate-700/50">
          <CardContent className="p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 mr-1">Filtros:</span>
              <MultiSelect label="Años" icon={Calendar} placeholder="Todos los años" options={stats?.filtros.anios.map(a => ({ value: a.toString(), label: a.toString() })) || []} selected={filtroAnios} onChange={setFiltroAnios} />
              <MultiSelect label="Estados" placeholder="Todos" options={stats?.filtros.estados.map(e => ({ value: e, label: ESTADO_LABELS[e] || e, color: COLORS_ESTADO[e] })) || []} selected={filtroEstados} onChange={setFiltroEstados} />
              <MultiSelect label="Ubicaciones" icon={MapPin} placeholder="Todas" options={stats?.filtros.ubicaciones.map(u => ({ value: u, label: u })) || []} selected={filtroUbicaciones} onChange={setFiltroUbicaciones} />
              <MultiSelect label="Obras" icon={Building2} placeholder="Todas las obras" options={stats?.filtros.obrasDisponibles?.map(o => ({ value: o.id.toString(), label: o.nombre })) || []} selected={filtroObras} onChange={setFiltroObras} />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 bg-emerald-700/30 border-emerald-600/50 text-emerald-300 text-xs px-2 hover:bg-emerald-700/50">
                    <Eye className="h-3 w-3 mr-1" />{obraActiva ? 'Obra Sel.' : 'Ver Detalle'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2 bg-slate-800 border-slate-700">
                  <div className="text-xs text-slate-400 mb-2 font-medium">Seleccionar obra:</div>
                  <ScrollArea className="h-[220px]">
                    <div className="space-y-0.5">
                      <div className={`p-2 rounded cursor-pointer text-xs transition-colors ${!obraActiva ? 'bg-emerald-600/20 text-emerald-300' : 'hover:bg-slate-700/50 text-slate-200'}`} onClick={() => setObraActiva('')}>📊 Vista General</div>
                      {stats?.obras.map(o => (
                        <div key={o.id_obra} className={`p-2 rounded cursor-pointer transition-colors ${obraActiva === o.id_obra.toString() ? 'bg-emerald-600/20' : 'hover:bg-slate-700/50'}`} onClick={() => setObraActiva(o.id_obra.toString())}>
                          <span className="text-xs text-slate-200 block truncate">{o.nombre_obra}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500">{o.ubicacion}</span>
                            <Badge className="text-[8px] px-1" style={{ backgroundColor: COLORS_ESTADO[o.estado] }}>{o.avanceFisico.toFixed(1)}%</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              
              {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs text-slate-400 hover:text-white"><X className="h-3 w-3 mr-1" />Limpiar</Button>}
            </div>
            {obraSeleccionadaData && <div className="mt-2 pt-2 border-t border-slate-700/50"><Badge className="bg-emerald-600/20 text-emerald-300 text-[10px]">📋 {obraSeleccionadaData.nombre_obra.substring(0, 40)}...</Badge></div>}
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'TOTAL OBRAS', value: r?.totalObras || 0, icon: Building2, color: 'from-emerald-600 to-emerald-700', sub: `${r?.obrasEnEjecucion || 0} en ejecución` },
            { label: 'PRESUPUESTO', value: formatCompact(r?.presupuestoTotal || 0), icon: DollarSign, color: 'from-violet-600 to-violet-700', sub: 'Monto total' },
            { label: 'EJECUTADO', value: formatCompact(r?.ejecutadoTotal || 0), icon: TrendingUp, color: 'from-cyan-600 to-cyan-700', sub: formatPercent(r?.avancePromedio || 0) },
            { label: 'SALDO', value: formatCompact(r?.saldoPendiente || 0), icon: TrendingDown, color: 'from-blue-600 to-blue-700', sub: 'Por ejecutar' },
            { label: 'PARTIDAS', value: r?.totalPartidas || 0, icon: Layers, color: 'from-amber-500 to-amber-600', sub: `${r?.totalActividades || 0} actividades` },
            { label: 'GASTOS', value: r?.totalGastos || 0, icon: Receipt, color: 'from-rose-600 to-rose-700', sub: 'Registrados' },
            { label: 'CON RETRASO', value: r?.obrasConRetraso || 0, icon: Clock, color: 'from-orange-600 to-orange-700', sub: `${r?.obrasCriticas || 0} críticas` },
            { label: 'ALERTAS', value: r?.totalAlertas || 0, icon: AlertTriangle, color: 'from-red-600 to-red-700', sub: 'Activas' }
          ].map((kpi, idx) => (
            <Card key={idx} className={`bg-gradient-to-br ${kpi.color} border-0 shadow-lg`}>
              <CardContent className="p-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-medium text-white/80 truncate">{kpi.label}</p>
                    <p className="text-lg font-bold text-white">{kpi.value}</p>
                    <p className="text-[9px] text-white/60 truncate">{kpi.sub}</p>
                  </div>
                  <kpi.icon className="h-4 w-4 text-white/40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Semáforo y Gráficos */}
        <div className="grid lg:grid-cols-4 gap-2">
          <Card className="bg-slate-800/40 border-slate-700/50">
            <CardHeader className="p-2 pb-1"><CardTitle className="text-white text-xs font-medium">🚦 SEMÁFORO GENERAL</CardTitle></CardHeader>
            <CardContent className="p-2">
              <div className="flex items-center justify-around py-2">
                {[{ color: 'bg-green-500', val: g?.semaforoGeneral?.verde || 0, label: 'En plazo' }, { color: 'bg-yellow-500', val: g?.semaforoGeneral?.amarillo || 0, label: 'En riesgo' }, { color: 'bg-red-500', val: g?.semaforoGeneral?.rojo || 0, label: 'Crítico' }].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center mx-auto mb-1 shadow-lg`}><span className="text-white font-bold text-sm">{s.val}</span></div>
                    <span className="text-[10px] text-slate-400">{s.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/40 border-slate-700/50">
            <CardHeader className="p-2 pb-1"><CardTitle className="text-white text-xs font-medium">📊 ESTADO OBRAS</CardTitle></CardHeader>
            <CardContent className="p-2">
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estadisticasEstado} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis dataKey="label" type="category" stroke="#64748b" tick={{ fontSize: 9 }} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>{estadisticasEstado.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
<Card className="bg-slate-800/40 border-slate-700/50">
  <CardHeader className="p-2 pb-1"><CardTitle className="text-white text-xs font-medium">🍩 DISTRIBUCIÓN</CardTitle></CardHeader>
  <CardContent className="p-2">
    <div className="h-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart data={estadisticasEstado.filter(e => e.cantidad > 0)}>
          <Pie 
            cx="50%" 
            cy="50%" 
            innerRadius={25} 
            outerRadius={45} 
            paddingAngle={3} 
            dataKey="cantidad"
          >
            {estadisticasEstado.filter(e => e.cantidad > 0).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
          <Card className="bg-slate-800/40 border-slate-700/50">
            <CardHeader className="p-2 pb-1"><CardTitle className="text-white text-xs font-medium">⏱️ RETRASOS</CardTitle></CardHeader>
            <CardContent className="p-2">
              <div className="h-[120px]">
                {(g?.retrasosPorObra?.length || 0) > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={g?.retrasosPorObra?.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 9 }} />
                      <YAxis dataKey="nombre" type="category" stroke="#64748b" tick={{ fontSize: 7 }} width={60} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="diasRetraso" name="Días" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center"><CheckCircle2 className="h-8 w-8 text-green-500" /><span className="text-xs text-slate-400 ml-2">Sin retrasos</span></div>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Curva S */}
        <div className="grid lg:grid-cols-2 gap-2">
          <Card className="bg-slate-800/40 border-slate-700/50">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-white text-xs font-medium">📈 CURVA S - EJECUTADO VS PROGRAMADO {obraSeleccionadaData && <Badge className="ml-2 bg-emerald-600/20 text-emerald-300 text-[9px]">Obra específica</Badge>}</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-[280px]">
                {curvaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={curvaData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <defs><linearGradient id="colorEjecutado" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="mes" stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(value: number) => formatCompact(value).replace('S/ ', '')} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                      <Area type="monotone" dataKey="acumulado" stroke="transparent" fill="url(#colorEjecutado)" />
                      <Line type="monotone" dataKey="programadoAcumulado" name="Programado" stroke="#eab308" strokeWidth={3} strokeDasharray="8 4" dot={{ fill: '#eab308', strokeWidth: 2, r: 5, stroke: '#1e293b' }} />
                      <Line type="monotone" dataKey="acumulado" name="Ejecutado" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', strokeWidth: 2, r: 5, stroke: '#1e293b' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex flex-col items-center justify-center text-slate-500"><TrendingUp className="h-12 w-12 mb-3 opacity-30" /><p className="text-sm">No hay datos de ejecución mensual</p></div>}
              </div>
              {interp && (
                <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Análisis:</p>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    <li>• Ejecutado: <span className="text-emerald-400 font-bold">{formatCurrency(interp.ejecutadoAcum)}</span> ({formatPercent(interp.porcentajeEjec)})</li>
                    <li>• Programado: <span className="text-amber-400 font-bold">{formatCurrency(interp.programadoAcum)}</span></li>
                    <li>• Diferencia: <span className={interp.diferencia > 0 ? 'text-red-400' : 'text-emerald-400'}>{formatCurrency(Math.abs(interp.diferencia))}</span> {interp.diferencia > 0 ? 'por debajo' : 'por encima'}</li>
                    <li>• Estado: <span className={`font-bold ${interp.estado === 'ATRASADA' ? 'text-red-400' : interp.estado === 'ADELANTADA' ? 'text-emerald-400' : 'text-amber-400'}`}>{interp.estado}</span></li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/40 border-slate-700/50">
            <CardHeader className="p-2 pb-1"><CardTitle className="text-white text-xs font-medium">📊 AVANCE MENSUAL (S/.)</CardTitle></CardHeader>
            <CardContent className="p-2">
              <div className="h-[280px]">
                {curvaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={curvaData}>
                      <defs><linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0.8}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="mes" stroke="#64748b" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickFormatter={(value: number) => formatCompact(value).replace('S/ ', '')} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="parcial" name="Ejecutado Mensual" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-500 text-xs">No hay datos</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla Partidas */}
        {partidasData.length > 0 && (
          <Card className="bg-slate-800/40 border-slate-700/50">
            <CardHeader className="p-2 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-xs font-medium">📦 PARTIDAS PRESUPUESTALES</CardTitle>
                <Button size="sm" onClick={() => exportToExcel(partidasData as unknown as Record<string, unknown>[], 'partidas', [{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Descripción' }, { key: 'presupuesto', label: 'Presupuesto' }, { key: 'ejecutado', label: 'Ejecutado' }, { key: 'avance', label: '% Avance' }])} className="h-6 text-[10px] bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300"><FileSpreadsheet className="h-3 w-3 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50">
                      <TableHead className="text-slate-400 text-[10px] p-1.5">CÓDIGO</TableHead>
                      <TableHead className="text-slate-400 text-[10px] p-1.5">DESCRIPCIÓN</TableHead>
                      <TableHead className="text-right text-slate-400 text-[10px] p-1.5">PRESUPUESTO</TableHead>
                      <TableHead className="text-right text-slate-400 text-[10px] p-1.5">EJECUTADO</TableHead>
                      <TableHead className="text-slate-400 text-[10px] p-1.5">AVANCE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partidasData.map(partida => (
                      <TableRow key={partida.id} className="border-slate-700/50 hover:bg-slate-700/20">
                        <TableCell className="font-mono text-slate-400 text-[10px] p-1.5">{partida.codigo}</TableCell>
                        <TableCell className="text-white text-[10px] p-1.5 max-w-[200px] truncate">{partida.nombre}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-400 text-[10px] p-1.5">{formatCurrency(partida.presupuesto)}</TableCell>
                        <TableCell className="text-right font-mono text-cyan-400 text-[10px] p-1.5">{formatCurrency(partida.ejecutado)}</TableCell>
                        <TableCell className="p-1.5">
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${Math.min(partida.avance, 100)}%` }} /></div>
                            <span className="text-[9px] text-slate-400">{partida.avance.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla Obras */}
        <Card className="bg-slate-800/40 border-slate-700/50">
          <CardHeader className="p-2 pb-1">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-white text-xs font-medium">🏗️ LISTADO DE OBRAS</CardTitle>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                  <Input placeholder="Buscar obra..." value={busquedaObra} onChange={(e) => setBusquedaObra(e.target.value)} className="h-7 text-xs pl-7 bg-slate-900/50 border-slate-600 text-white w-48" />
                </div>
                <Button size="sm" onClick={exportarObras} className="h-7 text-[10px] bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300"><FileSpreadsheet className="h-3 w-3 mr-1" />Excel</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <div className="text-xs text-slate-400 mb-2">Mostrando {obrasFiltradas.length} de {stats?.obras.length || 0} obras</div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50">
                    <TableHead className="text-slate-400 text-[10px] p-1.5 cursor-pointer hover:text-white" onClick={() => handleSort('id_obra')}><div className="flex items-center gap-1">CÓD <ArrowUpDown className="h-3 w-3" /></div></TableHead>
                    <TableHead className="text-slate-400 text-[10px] p-1.5 cursor-pointer hover:text-white" onClick={() => handleSort('nombre_obra')}><div className="flex items-center gap-1">OBRA <ArrowUpDown className="h-3 w-3" /></div></TableHead>
                    <TableHead className="text-slate-400 text-[10px] p-1.5">UBICACIÓN</TableHead>
                    <TableHead className="text-right text-slate-400 text-[10px] p-1.5 cursor-pointer hover:text-white" onClick={() => handleSort('presupuesto_inicial')}><div className="flex items-center justify-end gap-1">PRESUPUESTO <ArrowUpDown className="h-3 w-3" /></div></TableHead>
                    <TableHead className="text-right text-slate-400 text-[10px] p-1.5">EJECUTADO</TableHead>
                    <TableHead className="text-slate-400 text-[10px] p-1.5">ESTADO</TableHead>
                    <TableHead className="text-slate-400 text-[10px] p-1.5 cursor-pointer hover:text-white" onClick={() => handleSort('avanceFisico')}><div className="flex items-center gap-1">% FÍSICO <ArrowUpDown className="h-3 w-3" /></div></TableHead>
                    <TableHead className="text-slate-400 text-[10px] p-1.5">SEM.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obrasFiltradas.map(obra => (
                    <TableRow key={obra.id_obra} className={`border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors ${obraActiva === obra.id_obra.toString() ? 'bg-emerald-900/20' : ''}`} onClick={() => setObraActiva(obra.id_obra.toString())}>
                      <TableCell className="font-mono text-slate-400 text-[10px] p-1.5">{obra.id_obra.toString().padStart(3, '0')}</TableCell>
                      <TableCell className="text-white text-[10px] p-1.5 max-w-[150px] truncate">{obra.nombre_obra}</TableCell>
                      <TableCell className="text-slate-400 text-[10px] p-1.5 max-w-[100px] truncate">{obra.ubicacion}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-400 text-[10px] p-1.5">{formatCurrency(obra.presupuesto_inicial)}</TableCell>
                      <TableCell className="text-right font-mono text-cyan-400 text-[10px] p-1.5">{formatCurrency(obra.ejecutado)}</TableCell>
                      <TableCell className="p-1.5"><Badge className="text-white text-[8px] px-1" style={{ backgroundColor: COLORS_ESTADO[obra.estado] }}>{ESTADO_LABELS[obra.estado]}</Badge></TableCell>
                      <TableCell className="p-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${Math.min(obra.avanceFisico, 100)}%` }} /></div>
                          <span className="text-[9px] text-slate-400">{obra.avanceFisico.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-1.5"><div className={`w-3 h-3 rounded-full ${obra.estadoSemaforo === 'VERDE' ? 'bg-green-500' : obra.estadoSemaforo === 'AMARILLO' ? 'bg-yellow-500' : 'bg-red-500'}`} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal PDF */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] bg-slate-800 border-slate-700 p-0 overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <DialogTitle className="text-white text-sm">Generar Reporte PDF</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">Seleccione las secciones a incluir</DialogDescription>
          </div>
          <div className="flex h-[70vh]">
            <div className="w-1/3 border-r border-slate-700 p-3 overflow-auto">
              <div className="text-xs text-slate-400 mb-2 font-medium">Secciones:</div>
              {['resumen', 'graficos', 'tablas'].map(cat => (
                <div key={cat} className="mb-3">
                  <div className="text-[10px] text-slate-500 uppercase font-medium mb-1">{cat === 'resumen' && '📊'}{cat === 'graficos' && '📈'}{cat === 'tablas' && '📋'} {cat}</div>
                  {SECCIONES_PDF.filter(s => s.cat === cat).map(sec => (
                    <div key={sec.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer mb-1 border transition-colors ${seccionesSeleccionadas.includes(sec.id) ? 'bg-emerald-600/20 border-emerald-600/50' : 'bg-slate-700/30 border-slate-700 hover:border-slate-600'}`} onClick={() => toggleSeccion(sec.id)}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${seccionesSeleccionadas.includes(sec.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>{seccionesSeleccionadas.includes(sec.id) && <Check className="h-2.5 w-2.5 text-white" />}</div>
                      <span className="text-[10px] text-slate-200">{sec.nombre}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex gap-1 mt-3 pt-2 border-t border-slate-700">
                <Button size="sm" variant="outline" onClick={() => { setSeccionesSeleccionadas(SECCIONES_PDF.map(s => s.id)); setPdfPreviewUrl(null) }} className="h-6 text-[10px] border-slate-600 flex-1">Todas</Button>
                <Button size="sm" variant="outline" onClick={() => { setSeccionesSeleccionadas([]); setPdfPreviewUrl(null) }} className="h-6 text-[10px] border-slate-600 flex-1">Ninguna</Button>
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="p-2 border-b border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-400">Vista Previa</span>
                <Button size="sm" onClick={() => generatePdf(true)} disabled={generatingPreview || seccionesSeleccionadas.length === 0} className="h-7 text-xs bg-slate-700 hover:bg-slate-600">
                  {generatingPreview ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generando...</> : <><Eye className="h-3 w-3 mr-1" />Ver Preview</>}
                </Button>
              </div>
              <div className="flex-1 bg-slate-950 overflow-auto">
                {pdfPreviewUrl ? <iframe src={pdfPreviewUrl} className="w-full h-full" title="Vista Previa" /> : <div className="h-full flex items-center justify-center text-slate-500"><div className="text-center"><Eye className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">Presione Ver Preview</p></div></div>}
              </div>
            </div>
          </div>
          <div className="p-3 border-t border-slate-700 flex justify-between items-center">
            <div className="text-[10px] text-slate-500">{obraSeleccionadaData ? `Reporte: ${obraSeleccionadaData.nombre_obra.substring(0, 30)}...` : 'Reporte General'}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowPreviewModal(false)} className="h-8 text-xs border-slate-600">Cancelar</Button>
              <Button size="sm" onClick={() => generatePdf(false, false)} disabled={generatingPdf || seccionesSeleccionadas.length === 0} className="h-8 text-xs bg-slate-700 hover:bg-slate-600">{generatingPdf ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}Descargar</Button>
              <Button size="sm" onClick={() => generatePdf(false, true)} disabled={generatingPdf || seccionesSeleccionadas.length === 0} className="h-8 text-xs bg-gradient-to-r from-emerald-600 to-teal-600">{generatingPdf ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Reportes */}
      <Dialog open={showReportesModal} onOpenChange={setShowReportesModal}>
        <DialogContent className="sm:max-w-2xl bg-slate-800 border-slate-700">
          <DialogHeader><DialogTitle className="text-white">Reportes Guardados</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {reportes.length === 0 ? <div className="text-center py-8 text-slate-500"><FileText className="h-10 w-10 mx-auto mb-2 opacity-50" /><p className="text-xs">No hay reportes</p></div> : (
              <Table>
                <TableHeader><TableRow className="border-slate-700"><TableHead className="text-slate-400 text-xs">Archivo</TableHead><TableHead className="text-slate-400 text-xs">Fecha</TableHead><TableHead className="text-right text-slate-400 text-xs">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reportes.map(rep => (
                    <TableRow key={rep.id_documento} className="border-slate-700/50">
                      <TableCell className="text-white text-xs"><FileText className="h-3.5 w-3.5 text-red-400 inline mr-2" />{rep.nombre_archivo}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{formatDate(rep.fecha_carga)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => { setPdfViewerUrl(rep.ruta_archivo); setShowPdfViewerModal(true) }} className="h-6 w-6 p-0 text-slate-400 hover:text-white"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => window.open(rep.ruta_archivo, '_blank')} className="h-6 w-6 p-0 text-slate-400 hover:text-white"><Download className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteReporte(rep.id_documento)} className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal Visor PDF */}
      <Dialog open={showPdfViewerModal} onOpenChange={setShowPdfViewerModal}>
        <DialogContent className="sm:max-w-4xl h-[85vh] bg-slate-800 border-slate-700 p-0">
          <div className="p-3 border-b border-slate-700"><DialogTitle className="text-white text-sm">Visor de Reporte</DialogTitle></div>
          <iframe src={pdfViewerUrl} className="w-full flex-1" style={{ height: 'calc(85vh - 50px)' }} title="PDF Viewer" />
        </DialogContent>
      </Dialog>
    </div>
  )
}