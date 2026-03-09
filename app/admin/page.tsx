'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  FileText,
  RefreshCw,
  LogOut,
  BarChart3,
  TrendingUp,
  Activity,
  Download,
  Calendar,
  Filter,
  Brain,
  Edit,
  Trash2,
  Search,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase, Ticket } from '@/lib/supabase';
import { registerServiceWorker } from '@/lib/service-worker';

export default function AdminPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('abertos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);
  const [loadingKB, setLoadingKB] = useState(false);
  const [kbEditing, setKbEditing] = useState<string | null>(null);
  const [kbForm, setKbForm] = useState({ question: '', answer: '', category: 'geral', keywords: '' });
  const [kbSearch, setKbSearch] = useState('');

  // Função auxiliar para usar sessionStorage com fallback
  const getSessionStorage = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      // Chrome pode bloquear sessionStorage em modo incógnito ou com políticas restritivas
      console.warn('sessionStorage não disponível:', error);
      return null;
    }
  };

  const removeSessionStorage = (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Não foi possível remover do sessionStorage:', error);
    }
  };

  // Verificar autenticação
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authStatus = getSessionStorage('admin_authenticated');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      } else {
        router.push('/admin/login');
      }
      setCheckingAuth(false);
    }
  }, [router]);

  // Função de logout
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      removeSessionStorage('admin_authenticated');
      removeSessionStorage('admin_username');
      router.push('/admin/login');
    }
  };

  // Carregar tickets do Supabase
  const loadTickets = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data, error: fetchError } = await supabase()
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Remover duplicados baseado no ID (caso existam)
      const uniqueTickets = data ? Array.from(
        new Map(data.map(ticket => [ticket.id, ticket])).values()
      ) : [];

      setTickets(uniqueTickets);
    } catch (err: any) {
      console.error('Erro ao carregar tickets:', err);
      setError('Erro ao carregar tickets. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar base de conhecimento
  const loadKnowledgeBase = async () => {
    setLoadingKB(true);
    try {
      const { data, error } = await supabase()
        .from('ai_knowledge_base')
        .select('*')
        .order('priority', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setKnowledgeBase(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar base de conhecimento:', err);
      setError('Erro ao carregar base de conhecimento.');
    } finally {
      setLoadingKB(false);
    }
  };

  // Salvar/Editar entrada da base de conhecimento
  const saveKnowledgeEntry = async () => {
    if (!kbForm.question.trim() || !kbForm.answer.trim()) {
      setError('Preencha pergunta e resposta.');
      return;
    }

    try {
      const keywordsArray = kbForm.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
      
      if (kbEditing) {
        // Editar
        const { error } = await supabase()
          .from('ai_knowledge_base')
          .update({
            question: kbForm.question,
            answer: kbForm.answer,
            category: kbForm.category,
            keywords: keywordsArray,
            updated_at: new Date().toISOString()
          })
          .eq('id', kbEditing);

        if (error) throw error;
        setSuccessMessage('Entrada atualizada com sucesso!');
      } else {
        // Criar nova
        const { error } = await supabase()
          .from('ai_knowledge_base')
          .insert([{
            question: kbForm.question,
            answer: kbForm.answer,
            category: kbForm.category,
            keywords: keywordsArray
          }]);

        if (error) throw error;
        setSuccessMessage('Entrada adicionada com sucesso!');
      }

      setKbForm({ question: '', answer: '', category: 'geral', keywords: '' });
      setKbEditing(null);
      loadKnowledgeBase();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar entrada:', err);
      setError('Erro ao salvar entrada. Tente novamente.');
    }
  };

  // Deletar entrada
  const deleteKnowledgeEntry = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada?')) return;

    try {
      const { error } = await supabase()
        .from('ai_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('Entrada excluída com sucesso!');
      loadKnowledgeBase();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Erro ao deletar entrada:', err);
      setError('Erro ao deletar entrada.');
    }
  };

  // Editar entrada
  const editKnowledgeEntry = (entry: any) => {
    setKbForm({
      question: entry.question,
      answer: entry.answer,
      category: entry.category || 'geral',
      keywords: (entry.keywords || []).join(', ')
    });
    setKbEditing(entry.id);
  };

  const handleUpdateTicketStatus = async (ticketId: string, nextStatus: Ticket['status']) => {
    setUpdatingTicketId(ticketId);
    setError('');
    setSuccessMessage('');

    try {
      const { error: updateError } = await supabase()
        .from('tickets')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (updateError) {
        console.error('Erro ao atualizar no Supabase:', updateError);
        throw updateError;
      }

      // Recarregar tickets do servidor para garantir sincronização
      await loadTickets();

      setSuccessMessage(
        nextStatus === 'resolvido'
          ? 'Chamado marcado como resolvido e movido para a aba de resolvidos.'
          : 'Status do chamado atualizado.'
      );

      // Se marcou como resolvido, mudar para a aba de resolvidos após recarregar
      if (nextStatus === 'resolvido') {
        // Pequeno delay para garantir que os dados foram recarregados
        setTimeout(() => {
          setActiveTab('resolvidos');
        }, 100);
      }
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      setError('Não foi possível atualizar o status do chamado. Tente novamente.');
    } finally {
      setUpdatingTicketId(null);
    }
  };

  // Registrar Service Worker ao montar o componente
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Carregar tickets ao montar
  useEffect(() => {
    loadTickets();
    loadKnowledgeBase();
  }, []);

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateToInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const hasDateFilter = Boolean(startDate || endDate);
  const isDateRangeInvalid = Boolean(
    startDate &&
      endDate &&
      new Date(`${startDate}T00:00:00`).getTime() > new Date(`${endDate}T23:59:59.999`).getTime()
  );

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const applyQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));

    setStartDate(formatDateToInput(start));
    setEndDate(formatDateToInput(end));
  };

  const applyCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    setStartDate(formatDateToInput(start));
    setEndDate(formatDateToInput(now));
  };

  const filteredTickets = useMemo(() => {
    if (!hasDateFilter) {
      return tickets;
    }
    if (isDateRangeInvalid) {
      return [];
    }

    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at);
      if (start && ticketDate < start) return false;
      if (end && ticketDate > end) return false;
      return true;
    });
  }, [tickets, startDate, endDate, hasDateFilter, isDateRangeInvalid]);

  // Obter cor do badge de status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto':
        return <Badge className="bg-red-600">Aberto</Badge>;
      case 'em_andamento':
        return <Badge className="bg-yellow-600">Em Andamento</Badge>;
      case 'resolvido':
        return <Badge className="bg-green-600">Resolvido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filtrar tickets por status usando useMemo para garantir recálculo quando tickets mudarem
  const openTickets = useMemo(() => {
    return filteredTickets.filter(ticket => {
      const status = (ticket.status || '').toLowerCase().trim();
      return status !== 'resolvido';
    });
  }, [filteredTickets]);

  const resolvedTickets = useMemo(() => {
    return filteredTickets.filter(ticket => {
      const status = (ticket.status || '').toLowerCase().trim();
      return status === 'resolvido';
    });
  }, [filteredTickets]);

  const dashboardTickets = useMemo(() => {
    if (isDateRangeInvalid) {
      return [];
    }
    if (hasDateFilter) {
      return filteredTickets;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at);
      return ticketDate >= startOfMonth;
    });
  }, [tickets, filteredTickets, hasDateFilter, isDateRangeInvalid]);

  const dashboardPeriodLabel = useMemo(() => {
    if (isDateRangeInvalid) {
      return 'Período inválido';
    }
    if (startDate && endDate) {
      return `${formatDateOnly(startDate)} a ${formatDateOnly(endDate)}`;
    }
    if (startDate) {
      return `Desde ${formatDateOnly(startDate)}`;
    }
    if (endDate) {
      return `Até ${formatDateOnly(endDate)}`;
    }
    return new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }, [startDate, endDate, isDateRangeInvalid]);

  // Estatísticas do mês atual
  const monthlyStats = useMemo(() => {
    const monthTickets = dashboardTickets;

    const monthResolved = monthTickets.filter(t => t.status === 'resolvido');
    const monthInProgress = monthTickets.filter(t => t.status === 'em_andamento');
    const monthOpen = monthTickets.filter(t => t.status === 'aberto');

    const ticketsByDay: { [key: string]: number } = {};
    monthTickets.forEach(ticket => {
      const ticketDate = new Date(ticket.created_at);
      const key = formatDateToInput(ticketDate);
      ticketsByDay[key] = (ticketsByDay[key] || 0) + 1;
    });

    let chartData: { periodo: string; chamados: number }[] = [];

    if (hasDateFilter && !isDateRangeInvalid) {
      const firstTicketDate = monthTickets.length > 0
        ? new Date(Math.min(...monthTickets.map(t => new Date(t.created_at).getTime())))
        : new Date();
      const lastTicketDate = monthTickets.length > 0
        ? new Date(Math.max(...monthTickets.map(t => new Date(t.created_at).getTime())))
        : new Date();

      const periodStart = startDate ? new Date(`${startDate}T00:00:00`) : firstTicketDate;
      const periodEnd = endDate ? new Date(`${endDate}T00:00:00`) : lastTicketDate;

      const cursor = new Date(periodStart);
      cursor.setHours(0, 0, 0, 0);
      periodEnd.setHours(0, 0, 0, 0);

      while (cursor <= periodEnd) {
        const key = formatDateToInput(cursor);
        chartData.push({
          periodo: cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          chamados: ticketsByDay[key] || 0
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      chartData = Array.from({ length: daysInMonth }, (_, i) => {
        const current = new Date(now.getFullYear(), now.getMonth(), i + 1);
        const key = formatDateToInput(current);
        return {
          periodo: String(i + 1),
          chamados: ticketsByDay[key] || 0
        };
      });
    }

    const statusData = [
      { name: 'Resolvidos', value: monthResolved.length, color: '#16a34a' },
      { name: 'Em Aberto', value: monthOpen.length, color: '#dc2626' },
      { name: 'Em Andamento', value: monthInProgress.length, color: '#ca8a04' }
    ];

    const wordCount: { [key: string]: number } = {};
    monthTickets.forEach(ticket => {
      const words = ticket.description.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4);

      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    const topKeywords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    const resolvedWithTime = monthResolved
      .map(ticket => {
        const created = new Date(ticket.created_at);
        const updated = new Date(ticket.updated_at);
        return (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
      })
      .filter(hours => hours > 0);

    const avgResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((a, b) => a + b, 0) / resolvedWithTime.length
      : 0;

    return {
      total: monthTickets.length,
      resolved: monthResolved.length,
      open: monthOpen.length + monthInProgress.length,
      resolutionRate: monthTickets.length > 0
        ? ((monthResolved.length / monthTickets.length) * 100).toFixed(1)
        : '0',
      chartData,
      statusData,
      topKeywords,
      avgResolutionTime: avgResolutionTime.toFixed(1)
    };
  }, [dashboardTickets, hasDateFilter, isDateRangeInvalid, startDate, endDate]);

  // Função para exportar chamados para CSV
  const exportToCSV = () => {
    setExporting(true);
    setError('');
    
    try {
      if (isDateRangeInvalid) {
        setError('A data final deve ser maior ou igual � data inicial.');
        setExporting(false);
        return;
      }

      const ticketsForExport = filteredTickets;

      if (ticketsForExport.length === 0) {
        setError('Nenhum chamado encontrado para o período selecionado.');
        setExporting(false);
        return;
      }

      // Preparar dados para CSV/Excel
      // Usar ponto e vírgula (;) como separador para Excel em português
      const separator = ';';
      const csvHeaders = ['ID', 'Email', 'Descrição', 'Status', 'Data de Criação', 'Data de Atualização'];
      
      const csvRows = ticketsForExport.map(ticket => {
        const createdDate = new Date(ticket.created_at).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const updatedDate = new Date(ticket.updated_at).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Escapar caracteres especiais na descrição
        const description = ticket.description
          .replace(/"/g, '""') // Escapar aspas duplas
          .replace(/\n/g, ' ') // Substituir quebras de linha por espaço
          .replace(/\r/g, '') // Remover retornos de carro
          .replace(/;/g, ',') // Substituir ponto e vírgula por vírgula
          .trim();
        
        // Função para escapar valores que contenham o separador ou aspas
        const escapeValue = (value: string) => {
          if (value.includes(separator) || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };
        
        return [
          escapeValue(ticket.id),
          escapeValue(ticket.email),
          escapeValue(description),
          escapeValue(ticket.status),
          escapeValue(createdDate),
          escapeValue(updatedDate)
        ];
      });

      // Criar conteúdo CSV com separador ponto e vírgula
      const csvContent = [
        csvHeaders.join(separator),
        ...csvRows.map(row => row.join(separator))
      ].join('\n');

      // Adicionar BOM para UTF-8 (para Excel reconhecer acentos)
      // Usar encoding UTF-8 com BOM para garantir que o Excel abra corretamente
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nome do arquivo com período
      let filename = 'chamados';
      if (startDate && endDate) {
        const start = new Date(startDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
        const end = new Date(endDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
        filename = `chamados_${start}_a_${end}`;
      } else if (startDate) {
        const start = new Date(startDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
        filename = `chamados_de_${start}`;
      } else if (endDate) {
        const end = new Date(endDate).toLocaleDateString('pt-BR').replace(/\//g, '-');
        filename = `chamados_ate_${end}`;
      }
      
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`Exportação concluída! ${ticketsForExport.length} chamado(s) exportado(s).`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      setError('Erro ao exportar arquivo. Por favor, tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  // Componente para renderizar lista de tickets
  const renderTicketsList = (ticketsList: Ticket[]) => {
    if (ticketsList.length === 0) {
      return (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum chamado encontrado</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {ticketsList.map((ticket) => (
          <Card 
            key={ticket.id} 
            className={ticket.status === 'resolvido' 
              ? 'border-l-4 border-l-green-600 bg-green-50/30' 
              : 'border-l-4 border-l-red-600'
            }
          >
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {getStatusBadge(ticket.status)}
                  {ticket.status !== 'resolvido' && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
                      disabled={updatingTicketId === ticket.id}
                      onClick={() => handleUpdateTicketStatus(ticket.id, 'resolvido')}
                    >
                      {updatingTicketId === ticket.id ? 'Atualizando...' : 'Marcar como resolvido'}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="whitespace-nowrap">{formatDate(ticket.created_at)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mt-0.5 sm:mt-0 flex-shrink-0" />
                  <span className="font-medium text-gray-700 break-all">
                    {ticket.email}
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 sm:p-3 rounded-md">
                  <p className="font-medium mb-1">Descrição:</p>
                  <p className="whitespace-pre-wrap break-words">{ticket.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Mostrar loading enquanto verifica autenticação
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Não renderizar nada se não estiver autenticado (será redirecionado)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header + Filtros */}
        <div className="mb-6 sm:mb-8">
          <div className="rounded-2xl border border-red-100 bg-gradient-to-r from-red-600 via-red-600 to-orange-500 p-4 sm:p-6 shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-xl bg-white/95 p-2 sm:p-3 shadow-md">
                  <img
                    src="/logogont.png"
                    alt="Logo Gontijo Funda��es"
                    className="h-10 sm:h-12 md:h-14 w-auto object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-red-100 mb-1">Logo Gontijo Funda��es</p>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                    Painel Administrativo
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-red-50">
                    Gerencie chamados e configure notifica��es push
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-white/95 border-white text-red-700 hover:bg-white w-full sm:w-auto"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>

          <Card className="mt-4 border-red-100 shadow-md">
            <CardContent className="pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 text-gray-900">
                  <Filter className="w-4 h-4 text-red-600" />
                  <p className="text-sm sm:text-base font-semibold">Filtro de datas</p>
                </div>
                {hasDateFilter && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                    Filtro ativo
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topStartDate" className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-600" />
                    Data inicial
                  </Label>
                  <Input
                    id="topStartDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topEndDate" className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-600" />
                    Data final
                  </Label>
                  <Input
                    id="topEndDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="border-red-200 hover:bg-red-50" onClick={() => applyQuickRange(7)}>
                  �ltimos 7 dias
                </Button>
                <Button type="button" variant="outline" className="border-red-200 hover:bg-red-50" onClick={() => applyQuickRange(30)}>
                  �ltimos 30 dias
                </Button>
                <Button type="button" variant="outline" className="border-red-200 hover:bg-red-50" onClick={applyCurrentMonthRange}>
                  M�s atual
                </Button>
                {hasDateFilter && (
                  <Button type="button" variant="ghost" className="text-red-700 hover:text-red-800 hover:bg-red-50" onClick={clearDateFilters}>
                    <X className="w-4 h-4 mr-1.5" />
                    Limpar filtro
                  </Button>
                )}
              </div>

              <div className="mt-4 text-xs sm:text-sm">
                <p className="text-gray-600">
                  Per�odo no dashboard: <span className="font-semibold text-gray-900">{dashboardPeriodLabel}</span>
                </p>
                {isDateRangeInvalid && (
                  <p className="text-red-600 mt-1">A data final deve ser maior ou igual � data inicial.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard Analytics */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              <span className="hidden sm:inline">Dashboard - </span>
              <span className="sm:hidden">Dashboard</span>
              <span className="hidden sm:inline">{dashboardPeriodLabel}</span>
            </h2>
            </div>
            <Badge variant="outline" className="w-fit border-red-200 text-red-700">
              {hasDateFilter
                ? `${filteredTickets.length} chamado(s) no filtro`
                : `${tickets.length} chamado(s) no total`}
            </Badge>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-0.5 sm:mb-1 truncate">
                      {hasDateFilter ? 'Total do Per�odo' : 'Total do M�s'}
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{monthlyStats.total}</p>
                  </div>
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-0.5 sm:mb-1 truncate">Resolvidos</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">{monthlyStats.resolved}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-green-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-600">
              <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-0.5 sm:mb-1 truncate">Em Aberto</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">{monthlyStats.open}</p>
                  </div>
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-red-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-0.5 sm:mb-1 truncate">Taxa Resolução</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600">{monthlyStats.resolutionRate}%</p>
                  </div>
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-purple-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos e Análises */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Gráfico de Chamados por Dia */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base md:text-lg">Chamados por Dia</CardTitle>
                <CardDescription className="text-xs sm:text-sm hidden sm:block">
                  {hasDateFilter ? 'Distribui��o di�ria do per�odo filtrado' : 'Distribui��o di�ria do m�s atual'}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-1 sm:px-4 md:px-6 pb-2 sm:pb-4">
                <div className="w-full" style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyStats.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="periodo" 
                        tick={{ fontSize: 10 }}
                        interval={monthlyStats.chartData.length > 15 ? 2 : 0}
                        minTickGap={5}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        width={30}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: '12px', padding: '8px' }}
                      />
                      <Bar dataKey="chamados" fill="#dc2626" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Pizza - Status */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base md:text-lg">Distribuição por Status</CardTitle>
                <CardDescription className="text-xs sm:text-sm hidden sm:block">
                  {hasDateFilter ? 'Chamados filtrados por status' : 'Chamados do m�s por status'}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-1 sm:px-4 md:px-6 pb-2 sm:pb-4">
                <div className="w-full" style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthlyStats.statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {monthlyStats.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ fontSize: '12px', padding: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legenda customizada para mobile */}
                <div className="mt-2 sm:hidden space-y-1">
                  {monthlyStats.statusData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-gray-700">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Análise de Palavras-chave e Métricas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Principais Causas/Palavras-chave */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3 md:pb-6 px-3 sm:px-4 md:px-6">
                <CardTitle className="text-sm sm:text-base md:text-lg">Principais Termos</CardTitle>
                <CardDescription className="text-xs sm:text-sm hidden sm:block">Palavras mais frequentes nas descrições</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 md:px-6">
                {monthlyStats.topKeywords.length > 0 ? (
                  <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                    {monthlyStats.topKeywords.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-[10px] sm:text-xs md:text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-700 capitalize text-xs sm:text-sm md:text-base truncate">{item.word}</span>
                        </div>
                        <Badge variant="outline" className="bg-white text-[10px] sm:text-xs md:text-sm ml-1.5 sm:ml-2 flex-shrink-0">
                          {item.count}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4 sm:py-6 md:py-8 text-xs sm:text-sm">Nenhum dado disponível</p>
                )}
              </CardContent>
            </Card>

            {/* Métricas de Performance */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3 md:pb-6 px-3 sm:px-4 md:px-6">
                <CardTitle className="text-sm sm:text-base md:text-lg">Métricas de Performance</CardTitle>
                <CardDescription className="text-xs sm:text-sm hidden sm:block">Estatísticas de atendimento</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 md:px-6">
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-blue-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-0.5 sm:mb-1">Tempo Médio de Resolução</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">
                        {parseFloat(monthlyStats.avgResolutionTime) > 0 
                          ? `${parseFloat(monthlyStats.avgResolutionTime)}h`
                          : 'N/A'}
                      </p>
                    </div>
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600 flex-shrink-0 ml-1.5 sm:ml-2" />
                  </div>

                  <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-green-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-0.5 sm:mb-1">Chamados Resolvidos</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                        {monthlyStats.resolved} de {monthlyStats.total}
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-green-600 flex-shrink-0 ml-1.5 sm:ml-2" />
                  </div>

                  {monthlyStats.total > 0 && (
                    <div className="p-2.5 sm:p-3 md:p-4 bg-purple-50 rounded-lg">
                      <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1.5 sm:mb-2">Taxa de Resolução</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 md:h-3">
                        <div 
                          className="bg-purple-600 h-1.5 sm:h-2 md:h-3 rounded-full transition-all duration-500"
                          style={{ width: `${monthlyStats.resolutionRate}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mt-1.5 sm:mt-2">{monthlyStats.resolutionRate}% dos chamados foram resolvidos</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instruções PWA */}
        <Card className="mb-8 shadow-lg border-red-100">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Instalar como Aplicativo (PWA)
            </CardTitle>
            <CardDescription className="text-red-50">
              Instale este sistema como aplicativo no seu dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              <p className="font-medium mb-1">Como instalar a PWA:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>No Chrome/Edge: Clique no ícone de instalação na barra de endereço</li>
                <li>No Safari (iOS): Toque em &quot;Compartilhar&quot; e depois &quot;Adicionar à Tela de Início&quot;</li>
                <li>No Firefox: Clique no menu e selecione &quot;Instalar&quot;</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Base de Conhecimento - Treinamento da IA */}
        <Card className="mb-6 sm:mb-8 shadow-lg border-purple-100">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
              Base de Conhecimento - Treinar IA
            </CardTitle>
            <CardDescription className="text-purple-50 text-sm sm:text-base">
              Adicione perguntas e respostas para melhorar as respostas da IA
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Formulário de adicionar/editar */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-4">
                {kbEditing ? 'Editar Entrada' : 'Adicionar Nova Entrada'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kb-question">Pergunta/Problema *</Label>
                    <Input
                      id="kb-question"
                      value={kbForm.question}
                      onChange={(e) => setKbForm({ ...kbForm, question: e.target.value })}
                      placeholder="Ex: Como resetar minha senha?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kb-category">Categoria</Label>
                    <Input
                      id="kb-category"
                      value={kbForm.category}
                      onChange={(e) => setKbForm({ ...kbForm, category: e.target.value })}
                      placeholder="Ex: senha, rede, impressora"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kb-answer">Resposta/Solução *</Label>
                  <Textarea
                    id="kb-answer"
                    value={kbForm.answer}
                    onChange={(e) => setKbForm({ ...kbForm, answer: e.target.value })}
                    placeholder="Descreva a solução passo a passo..."
                    className="min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kb-keywords">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    id="kb-keywords"
                    value={kbForm.keywords}
                    onChange={(e) => setKbForm({ ...kbForm, keywords: e.target.value })}
                    placeholder="Ex: senha, reset, password, esqueci"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={saveKnowledgeEntry}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {kbEditing ? 'Atualizar' : 'Adicionar'}
                  </Button>
                  {kbEditing && (
                    <Button
                      onClick={() => {
                        setKbEditing(null);
                        setKbForm({ question: '', answer: '', category: 'geral', keywords: '' });
                      }}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Busca */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder="Buscar na base de conhecimento..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lista de entradas */}
            {loadingKB ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-600 mt-4">Carregando base de conhecimento...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {knowledgeBase
                  .filter(entry => {
                    if (!kbSearch) return true;
                    const search = kbSearch.toLowerCase();
                    return (
                      entry.question?.toLowerCase().includes(search) ||
                      entry.answer?.toLowerCase().includes(search) ||
                      entry.category?.toLowerCase().includes(search) ||
                      (entry.keywords || []).some((k: string) => k.toLowerCase().includes(search))
                    );
                  })
                  .map((entry) => (
                    <Card key={entry.id} className="border-purple-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-purple-50">
                                {entry.category || 'geral'}
                              </Badge>
                              {entry.usage_count > 0 && (
                                <span className="text-xs text-gray-500">
                                  Usado {entry.usage_count}x
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-gray-900">{entry.question}</h4>
                            <p className="text-sm text-gray-600">{entry.answer}</p>
                            {entry.keywords && entry.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(entry.keywords as string[]).map((keyword, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {keyword}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editKnowledgeEntry(entry)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteKnowledgeEntry(entry.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {knowledgeBase.filter(entry => {
                  if (!kbSearch) return true;
                  const search = kbSearch.toLowerCase();
                  return (
                    entry.question?.toLowerCase().includes(search) ||
                    entry.answer?.toLowerCase().includes(search) ||
                    entry.category?.toLowerCase().includes(search) ||
                    (entry.keywords || []).some((k: string) => k.toLowerCase().includes(search))
                  );
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {kbSearch ? 'Nenhuma entrada encontrada.' : 'Nenhuma entrada na base de conhecimento. Adicione a primeira!'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exportação de Chamados */}
        <Card className="mb-6 sm:mb-8 shadow-lg border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Download className="w-5 h-5 sm:w-6 sm:h-6" />
              Exportar Chamados
            </CardTitle>
            <CardDescription className="text-blue-50 text-sm sm:text-base">
              Exporte os chamados do per�odo selecionado em CSV/Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                <p className="text-xs sm:text-sm text-blue-900 font-medium">
                  Per�odo aplicado na exporta��o: {dashboardPeriodLabel}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Ajuste as datas no topo da p�gina. A exporta��o segue exatamente esse filtro.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={exportToCSV}
                  disabled={exporting || loading || isDateRangeInvalid}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar para CSV/Excel
                    </>
                  )}
                </Button>
                
                {(startDate || endDate) && (
                  <Button
                    onClick={clearDateFilters}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                  >
                    Limpar Filtro de Data
                  </Button>
                )}
              </div>

              <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <p className="font-medium mb-1">Informações:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sem filtro no topo: exporta todos os chamados. Com filtro: exporta apenas o per�odo selecionado</li>
                  <li>O arquivo CSV pode ser aberto no Excel, Google Sheets ou qualquer editor de planilhas</li>
                  <li>O arquivo inclui: ID, Email, Descrição, Status, Data de Criação e Data de Atualização</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Card */}
        <Card className="shadow-lg border-red-100">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                  Chamados
                </CardTitle>
                <CardDescription className="text-red-50 text-sm sm:text-base">
                  Gerencie chamados abertos e visualize os resolvidos
                </CardDescription>
              </div>
              <Button
                onClick={loadTickets}
                variant="outline"
                size="sm"
                className="bg-white text-red-600 hover:bg-red-50 w-full sm:w-auto text-sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-600 mt-4">Carregando chamados...</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-auto">
                  <TabsTrigger 
                    value="abertos" 
                    className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs sm:text-sm py-2 sm:py-1.5"
                  >
                    <span className="hidden sm:inline">Chamados Abertos</span>
                    <span className="sm:hidden">Abertos</span>
                    <span className="ml-1">({openTickets.length})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="resolvidos" 
                    className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm py-2 sm:py-1.5"
                  >
                    <span className="hidden sm:inline">Chamados Resolvidos</span>
                    <span className="sm:hidden">Resolvidos</span>
                    <span className="ml-1">({resolvedTickets.length})</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="abertos" className="mt-0">
                  {renderTicketsList(openTickets)}
                </TabsContent>
                
                <TabsContent value="resolvidos" className="mt-0">
                  {renderTicketsList(resolvedTickets)}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

