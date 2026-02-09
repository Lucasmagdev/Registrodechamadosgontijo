'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ticket, AlertCircle, CheckCircle2, ListOrdered, Bot, Sparkles, X, Send, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { registerServiceWorker } from '@/lib/service-worker';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import './premium-animations.css';

export default function Home() {
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [queueMessage, setQueueMessage] = useState('');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [queueAhead, setQueueAhead] = useState<string[]>([]);
  const [queueList, setQueueList] = useState<
    Array<{ id: string; email: string; status: string; created_at: string }>
  >([]);
  const [queueListLoading, setQueueListLoading] = useState(true);
  const [queueListError, setQueueListError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [requiresTicket, setRequiresTicket] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef<number>(0);
  const submitIdRef = useRef<string | null>(null);
  const submittedHashesRef = useRef<Set<string>>(new Set());

  // Garantir que só renderize no cliente
  useEffect(() => {
    setMounted(true);
    setShowTooltip(true);
    
    // Esconder tooltip após 5 segundos
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Registrar Service Worker para PWA
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Efeito para garantir que mensagem de sucesso seja sempre visível quando definida
  useEffect(() => {
    if (success) {
      // Garantir que erro está limpo quando sucesso é exibido
      setError('');
      
      // Scroll suave para a mensagem de sucesso após um pequeno delay
      const scrollTimer = setTimeout(() => {
        const successAlert = document.querySelector('[data-success-alert]');
        if (successAlert) {
          successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      return () => clearTimeout(scrollTimer);
    }
  }, [success]);

  const fetchQueueList = useCallback(async () => {
    setQueueListLoading(true);
    setQueueListError('');
    try {
      const { data, error: fetchError } = await supabase()
        .from('tickets')
        .select('id,email,status,created_at')
        .eq('status', 'aberto')
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Remover duplicados baseado no ID (caso existam)
      const uniqueTickets = data ? Array.from(
        new Map(data.map(ticket => [ticket.id, ticket])).values()
      ) : [];

      setQueueList(uniqueTickets);
    } catch (err) {
      console.error('Erro ao carregar fila:', err);
      setQueueListError('Não foi possível carregar a fila no momento.');
    } finally {
      setQueueListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueueList();
    const interval = setInterval(fetchQueueList, 15000);
    return () => clearInterval(interval);
  }, [fetchQueueList]);

  // Função para gerar hash único do submit
  const generateSubmitHash = (email: string, description: string): string => {
    const normalized = `${email.toLowerCase().trim()}|${description.trim()}`;
    // Usar um hash simples baseado no conteúdo
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `${hash}_${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Proteção robusta contra duplo submit
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current;
    
    // Bloquear se já está processando OU se foi submetido há menos de 8 segundos
    if (isSubmittingRef.current || loading || timeSinceLastSubmit < 8000) {
      console.log('Submit bloqueado - já em processamento ou muito recente');
      return;
    }

    // Validação básica ANTES de marcar como submetendo
    const trimmedEmail = email.trim();
    const trimmedDescription = description.trim();
    
    if (!trimmedEmail || !trimmedDescription) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Por favor, informe um email válido');
      return;
    }

    // Gerar hash único para este submit
    const submitHash = generateSubmitHash(trimmedEmail, trimmedDescription);
    
    // Verificar se este hash já foi submetido recentemente (últimos 10 segundos)
    const recentHashes = Array.from(submittedHashesRef.current).filter(hash => {
      const timestamp = parseInt(hash.split('_')[1] || '0');
      return (now - timestamp) < 10000; // 10 segundos
    });
    
    // Limpar hashes antigos
    submittedHashesRef.current = new Set(recentHashes);
    
    // Verificar se este submit específico já foi processado
    const hashKey = submitHash.split('_')[0];
    const isDuplicate = Array.from(submittedHashesRef.current).some(h => h.startsWith(hashKey));
    
    if (isDuplicate) {
      console.warn('Submit duplicado detectado pelo hash');
      setError('Este chamado já está sendo processado. Aguarde alguns segundos.');
      return;
    }

    // Marcar tempo do submit e como submetendo ANTES de qualquer coisa
    lastSubmitTimeRef.current = now;
    isSubmittingRef.current = true;
    submitIdRef.current = submitHash;
    submittedHashesRef.current.add(submitHash);
    setLoading(true);
    setSuccess(false); // Garantir que sucesso está desligado no início
    setError(''); // Limpar erros anteriores

    try {
      // Verificar se já existe um chamado idêntico criado nos últimos 15 segundos
      // Isso previne duplicações acidentais mesmo com race conditions
      const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString();
      const { data: recentTickets, error: checkError } = await supabase()
        .from('tickets')
        .select('id, created_at')
        .eq('email', trimmedEmail.toLowerCase())
        .eq('description', trimmedDescription)
        .eq('status', 'aberto')
        .gte('created_at', fifteenSecondsAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (checkError) {
        console.error('Erro ao verificar duplicados:', checkError);
        // Continuar mesmo com erro na verificação
      } else if (recentTickets && recentTickets.length > 0) {
        // Verificar se há duplicados muito recentes (últimos 5 segundos)
        const veryRecent = recentTickets.filter(ticket => {
          const ticketTime = new Date(ticket.created_at).getTime();
          return (now - ticketTime) < 5000;
        });
        
        if (veryRecent.length > 0) {
          console.warn('Chamado duplicado detectado - evitando inserção');
          setError('Um chamado idêntico foi criado recentemente. Aguarde alguns segundos antes de tentar novamente.');
          setLoading(false);
          isSubmittingRef.current = false;
          submitIdRef.current = null;
          return;
        }
      }

      // Inserir chamado no Supabase - apenas UMA vez
      const { data, error: insertError } = await supabase()
        .from('tickets')
        .insert([
          {
            email: trimmedEmail.toLowerCase(),
            description: trimmedDescription,
            status: 'aberto'
          }
        ])
        .select();

      if (insertError) {
        // Se o erro for de constraint única ou duplicado, tratar como informação (não erro)
        if (insertError.code === '23505' || 
            insertError.message?.includes('duplicate') || 
            insertError.message?.includes('unique') ||
            insertError.message?.includes('recentemente')) {
          // Chamado duplicado - não é um erro, apenas informar
          setError(''); // Limpar qualquer erro anterior
          setSuccess(true);
          setEmail('');
          setDescription('');
          await fetchQueueList();
          // Manter mensagem de sucesso por mais tempo
          setTimeout(() => setSuccess(false), 8000);
          return;
        } else {
          // Erro real - apenas logar, não mostrar mensagem genérica
          console.error('Erro ao criar chamado:', insertError);
          setSuccess(false); // Garantir que sucesso está desligado
          setError('Não foi possível criar o chamado no momento. Tente novamente em alguns instantes.');
        }
      } else if (data && data.length > 0) {
        // Verificar se realmente foi inserido apenas um registro
        if (data.length > 1) {
          console.warn('Múltiplos registros inseridos:', data.length);
          // Se por algum motivo múltiplos registros foram inseridos, deletar os extras
          const idsToDelete = data.slice(1).map(t => t.id);
          await supabase()
            .from('tickets')
            .delete()
            .in('id', idsToDelete);
        }

        // Sucesso - garantir que erro está limpo
        setError(''); // Limpar qualquer erro anterior
        setSuccess(true);
        setEmail('');
        setDescription('');

        // Atualizar a fila imediatamente
        await fetchQueueList();

        // Scroll para o topo do formulário para mostrar mensagem de sucesso
        setTimeout(() => {
          const formCard = document.querySelector('[data-form-card]');
          if (formCard) {
            formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);

        // Manter mensagem de sucesso por mais tempo (8 segundos)
        setTimeout(() => setSuccess(false), 8000);
      } else {
        // Caso não tenha dados retornados mas também não tenha erro
        setError(''); // Limpar qualquer erro anterior
        setSuccess(true);
        setEmail('');
        setDescription('');
        await fetchQueueList();
        setTimeout(() => setSuccess(false), 8000);
      }
    } catch (err: any) {
      // Apenas logar erros inesperados, não mostrar mensagem genérica
      console.error('Erro inesperado ao criar chamado:', err);
      // Se o erro for de duplicado, tratar como sucesso
      if (err.code === '23505' || 
          err.message?.includes('duplicate') || 
          err.message?.includes('unique') ||
          err.message?.includes('recentemente')) {
        setError(''); // Limpar qualquer erro anterior
        setSuccess(true);
        setEmail('');
        setDescription('');
        await fetchQueueList();
        // Scroll para mostrar mensagem de sucesso
        setTimeout(() => {
          const formCard = document.querySelector('[data-form-card]');
          if (formCard) {
            formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
        setTimeout(() => setSuccess(false), 8000);
      } else {
        // Apenas mostrar erro para problemas reais de conexão/servidor
        setSuccess(false); // Garantir que sucesso está desligado
        setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
      // Aguardar mais tempo antes de permitir novo submit
      setTimeout(() => {
        isSubmittingRef.current = false;
        submitIdRef.current = null;
      }, 3000);
    }
  };

  const maskEmail = (value: string) => {
    const [namePart, domain = 'email.com'] = value.split('@');
    if (!namePart) return value;
    const visible = namePart.slice(0, Math.min(3, namePart.length));
    const masked = namePart.length > 3 ? `${visible}***` : visible;
    return `${masked}@${domain}`;
  };

  const handleAskAI = async () => {
    if (!description || description.trim().length < 10) {
      setError('Por favor, descreva o problema com mais detalhes para consultar o assistente de IA.');
      return;
    }

    setAiLoading(true);
    setAiResponse('');
    setError('');
    setShowAiAssistant(true);

    try {
      // Verificar se fetch está disponível (compatibilidade com navegadores antigos)
      if (typeof fetch === 'undefined') {
        throw new Error('Seu navegador não suporta esta funcionalidade. Por favor, atualize seu navegador.');
      }

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      // Verificar se a resposta é válida
      if (!response) {
        throw new Error('Não foi possível conectar ao servidor');
      }

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta inválida do servidor');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao consultar assistente de IA');
      }

      setAiResponse(data.response || 'Não foi possível obter resposta da IA.');
      setRequiresTicket(data.requiresTicket || false);
    } catch (err: any) {
      console.error('Erro ao consultar IA:', err);
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Erro ao consultar assistente de IA. Por favor, tente novamente ou abra um chamado diretamente.';
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (err.message?.includes('navegador não suporta')) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setShowAiAssistant(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleChatSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Adicionar mensagem do usuário
    const newMessages = [...chatMessages, { role: 'user' as const, content: userMessage }];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      // Verificar se fetch está disponível
      if (typeof fetch === 'undefined') {
        throw new Error('Seu navegador não suporta esta funcionalidade.');
      }

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: userMessage }),
      });

      if (!response) {
        throw new Error('Não foi possível conectar ao servidor');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta inválida do servidor');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao consultar assistente de IA');
      }

      // Adicionar resposta da IA
      setChatMessages([...newMessages, { role: 'assistant', content: data.response || 'Não foi possível obter resposta da IA.' }]);
    } catch (err: any) {
      console.error('Erro ao consultar IA:', err);
      
      let errorMessage = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
      
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setChatMessages([...newMessages, { role: 'assistant', content: errorMessage }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleOpenChat = () => {
    setChatOpen(true);
    // Mensagem inicial se o chat estiver vazio
    if (chatMessages.length === 0) {
      setChatMessages([{
        role: 'assistant',
        content: 'Olá! Sou seu assistente virtual de T.I. Como posso ajudá-lo hoje? Descreva seu problema técnico e eu tentarei ajudá-lo.'
      }]);
    }
  };

  const handleCheckQueue = async () => {
    if (!email) {
      setQueueError('Informe seu email corporativo para verificar a fila.');
      return;
    }

    setQueueLoading(true);
    setQueueError('');
    setQueueMessage('');
    setQueuePosition(null);
    setQueueAhead([]);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: fetchError } = await supabase()
        .from('tickets')
        .select('id,email,status,created_at')
        .eq('status', 'aberto')
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setQueueList(data || []);

      if (!data || data.length === 0) {
        setQueueMessage('Não há chamados em aberto no momento.');
        return;
      }

      const position = data.findIndex((ticket) => ticket.email.toLowerCase() === normalizedEmail);

      if (position === -1) {
        setQueueMessage('Não encontramos um chamado em aberto com este email.');
        return;
      }

      const ahead = data.slice(0, position).map((ticket) => maskEmail(ticket.email));
      setQueueAhead(ahead);
      setQueuePosition(position + 1);

      if (ahead.length === 0) {
        setQueueMessage('Seu chamado é o próximo a ser atendido!');
      } else {
        setQueueMessage(`Existem ${ahead.length} chamado(s) antes do seu.`);
      }
    } catch (err) {
      console.error('Erro ao verificar fila:', err);
      setQueueError('Não foi possível consultar a fila agora. Tente novamente em instantes.');
    } finally {
      setQueueLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden page-shell">
      {/* Premium Animated Background */}
      <AnimatedBackground />

      {/* Content Layer */}
      <div className="relative z-10">
      {mounted && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50">
          <div className="relative flex flex-col items-end">
            {/* Balão de fala - aparece por 5 segundos */}
            {showTooltip && (
              <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-[#1c0f14] text-white text-sm sm:text-base rounded-lg px-4 sm:px-5 py-3 sm:py-3.5 shadow-xl text-center">
                  <span className="font-semibold block whitespace-normal max-w-[160px] sm:max-w-none sm:whitespace-nowrap">
                    Pergunte para IA especializada em T.I
                  </span>
                </div>
              </div>
            )}
            
            {/* Botão redondo com robô - cor vermelha */}
            <Button
              onClick={handleOpenChat}
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-full chat-fab hover:shadow-2xl transition-all duration-200 flex items-center justify-center p-0 hover:scale-110 flex-shrink-0"
              size="lg"
            >
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </Button>
          </div>
        </div>
      )}

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl h-[620px] flex flex-col p-0 dialog-shell">
          <DialogHeader className="px-6 pt-6 pb-4 border-b dialog-header">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-rose-600" />
              Assistente Virtual de T.I
            </DialogTitle>
            <DialogDescription>
              Descreva seu problema técnico e receba ajuda instantânea
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-[#1c0f14] text-white'
                        : 'bg-white text-gray-900 border border-rose-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.role === 'assistant' && (
                        <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleChatSend} className="px-6 pb-6 pt-4 border-t">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Digite sua pergunta..."
                disabled={chatLoading}
                className="flex-1 bg-white/90 border border-rose-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="bg-[#1c0f14] hover:bg-black"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16 max-w-6xl">
        <div className="page-hero text-center">
          <div className="flex flex-col items-center gap-5">
            <span className="hero-badge">
              Suporte inteligente com IA especializada
            </span>
            <div className="inline-flex items-center justify-center">
              <img
                src="/logogont.png"
                alt="Logo Gontijo Fundações"
                className="h-16 sm:h-20 md:h-24 w-auto object-contain"
              />
            </div>
            <h1 className="hero-title font-display text-gray-900 px-2">
              Central de chamados de TI
            </h1>
            <p className="hero-subtitle px-2">
              Abra chamados com contexto claro, receba sugerencias imediatas da IA e acompanhe sua posicao em tempo real.
            </p>
            <div className="hero-metrics w-full hidden lg:grid">
              <div className="metric-card">
                <Sparkles className="w-5 h-5 text-rose-500" />
                <div>
                  <p className="metric-title">IA guiando o diagnostico</p>
                  <p className="metric-desc">Sugestoes instantaneas para agilizar a triagem.</p>
                </div>
              </div>
              <div className="metric-card">
                <MessageSquare className="w-5 h-5 text-rose-500" />
                <div>
                  <p className="metric-title">Atendimento colaborativo</p>
                  <p className="metric-desc">Informacoes claras para o time responder mais rapido.</p>
                </div>
              </div>
              <div className="metric-card">
                <ListOrdered className="w-5 h-5 text-rose-500" />
                <div>
                  <p className="metric-title">Fila transparente</p>
                  <p className="metric-desc">Veja sua posicao e o andamento dos chamados.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            {/* Form Card */}
            <Card className="card-premium border-0 glass-panel" data-form-card>
              <CardHeader className="card-header-premium">
                <CardTitle className="sr-only">Abrir Novo Chamado</CardTitle>
                <CardDescription className="text-red-50 text-sm sm:text-base font-display uppercase tracking-[0.18em]">
                  Preencha os dados abaixo para registrar seu chamado
                </CardDescription>
              </CardHeader>
              <CardContent className="card-body-premium">
              {/* Success Alert - Premium Style */}
              {success && (
                <Alert 
                  data-success-alert
                  className="alert-success-premium mb-6"
                >
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <AlertDescription className="font-semibold text-base">
                      ✅ Chamado enviado com sucesso!
                    </AlertDescription>
                    <AlertDescription className="text-sm mt-1">
                      Seu chamado foi registrado e nossa equipe entrará em contato em breve.
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Error Alert */}
              {error && (
                <Alert className="alert-error-premium mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <form 
                onSubmit={handleSubmit} 
                className="space-y-6"
                onKeyDown={(e) => {
                  // Prevenir submit duplo com Enter
                  if (e.key === 'Enter' && (loading || isSubmittingRef.current)) {
                    e.preventDefault();
                  }
                }}
              >
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-[0.18em] text-rose-700 font-semibold">
                    Email Corporativo *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Limpar mensagens quando o usuário começar a digitar novamente
                      if (success) {
                        setSuccess(false);
                      }
                      if (error) {
                        setError('');
                      }
                    }}
                    className="input-premium"
                    disabled={loading}
                    required
                  />
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description" className="text-xs uppercase tracking-[0.18em] text-rose-700 font-semibold">
                      Descrição do Problema *
                    </Label>
                    {description.length >= 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAskAI}
                        disabled={aiLoading || loading}
                        className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        {aiLoading ? (
                          <>
                            <Sparkles className="w-3 h-3 mr-1 animate-spin" />
                            Consultando IA...
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 mr-1" />
                            Consultar Assistente IA
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Descreva detalhadamente o problema ou solicitação..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      // Limpar mensagens quando o usuário começar a digitar novamente
                      if (success) {
                        setSuccess(false);
                      }
                      if (error) {
                        setError('');
                      }
                      if (showAiAssistant) {
                        setShowAiAssistant(false);
                        setAiResponse('');
                      }
                    }}
                    className="textarea-premium"
                    disabled={loading}
                    required
                  />
                </div>

                {/* AI Assistant Response */}
                {showAiAssistant && aiResponse && (
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">Assistente de IA</h3>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAiAssistant(false);
                          setAiResponse('');
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border border-blue-100">
                      {aiResponse}
                    </div>
                    {requiresTicket && (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800 text-xs">
                          Este problema parece requerer suporte técnico especializado. Recomendamos abrir um chamado.
                        </AlertDescription>
                      </Alert>
                    )}
                    {!requiresTicket && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 text-xs">
                          Se a solução sugerida não resolver seu problema, você ainda pode abrir um chamado abaixo.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="button-primary-premium"
                  disabled={loading || isSubmittingRef.current}
                  onClick={(e) => {
                    // Proteção adicional no clique
                    if (loading || isSubmittingRef.current) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <span className="button-loading">⚙️</span>
                      <span className="pulse">Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Ticket className="button-icon" />
                      Enviar Chamado
                    </>
                  )}
                </Button>

                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckQueue}
                    disabled={queueLoading}
                    className="button-secondary-premium"
                  >
                    {queueLoading ? (
                      <span className="pulse">Verificando fila...</span>
                    ) : (
                      <>
                        <ListOrdered className="button-icon" />
                        Verificar posição na fila
                      </>
                    )}
                  </Button>

                  {queueError && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">{queueError}</AlertDescription>
                    </Alert>
                  )}

                  {queueMessage && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertDescription className="text-blue-900 font-medium">{queueMessage}</AlertDescription>
                    </Alert>
                  )}

                  {queuePosition && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">Sua posição atual</p>
                      <p className="text-3xl font-bold text-gray-900">{queuePosition}º</p>
                    </div>
                  )}

                  {queueAhead.length > 0 && (
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Chamados antes do seu (email parcial por privacidade):
                      </p>
                      <ul className="space-y-2">
                        {queueAhead.map((maskedEmail, index) => (
                          <li key={`${maskedEmail}-${index}`} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="text-gray-500">{index + 1}º</span>
                            <span className="font-mono">{maskedEmail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
            <div className="hero-metrics w-full lg:hidden">
              <div className="metric-card">
                <Sparkles className="w-5 h-5 text-rose-500" />
                <div>
                  <p className="metric-title">IA guiando o diagnostico</p>
                  <p className="metric-desc">Sugestoes instantaneas para agilizar a triagem.</p>
                </div>
              </div>
              <div className="metric-card">
                <MessageSquare className="w-5 h-5 text-rose-500" />
                <div>
                  <p className="metric-title">Atendimento colaborativo</p>
                  <p className="metric-desc">Informacoes claras para o time responder mais rapido.</p>
                </div>
              </div>
              <div className="metric-card">
                <ListOrdered className="w-5 h-5 text-rose-500" />
                <div>
                  <p className="metric-title">Fila transparente</p>
                  <p className="metric-desc">Veja sua posicao e o andamento dos chamados.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Queue Always Visible */}
            <Card className="card-premium border-0 shadow-lg glass-panel">
              <CardHeader>
                <CardTitle className="text-xl">Fila em tempo real</CardTitle>
                <CardDescription>
                  Lista atualizada automaticamente a cada 15 segundos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {queueListLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`queue-skeleton-${index}`}
                        className="h-12 rounded-md bg-gray-100 animate-pulse"
                      />
                    ))}
                  </div>
                ) : queueListError ? (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {queueListError}
                    </AlertDescription>
                  </Alert>
                ) : queueList.length === 0 ? (
                  <div className="text-center text-gray-600 text-sm">
                    Nenhum chamado em aberto agora.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <ol className="space-y-2">
                      {queueList.map((ticket, index) => (
                        <li
                          key={ticket.id}
                          className="queue-item-premium"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <span className="queue-position">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="queue-email">
                                {maskEmail(ticket.email)}
                              </p>
                              <p className="queue-timestamp">
                                Recebido em{' '}
                                {new Date(ticket.created_at).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                          <span className="queue-status">
                            {ticket.status}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchQueueList}
                    disabled={queueListLoading}
                    className="button-secondary-premium !w-auto"
                  >
                    Atualizar agora
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="card-premium border-0 glass-panel accent-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Atendimento prioritario</CardTitle>
                <CardDescription>Para incidentes criticos ou alta urgencia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-700">
                <p>
                  Em caso de urgencia, entre em contato pelo telefone informado pela equipe de T.I.
                </p>
                <div className="rounded-lg border border-rose-100 bg-white/70 px-3 py-2 text-xs text-rose-800">
                  Administradores tem acesso a visao completa e gerenciamento dos chamados.
                </div>
                <Link href="/admin/login" className="inline-block">
                  <Button className="bg-[#1c0f14] hover:bg-black text-white text-sm sm:text-base px-4 sm:px-6">
                    Area Administrativa
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
