import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, Send, Lightbulb, ChevronLeft, CheckCircle2,
  AlertTriangle, Star, Clock, Zap, X, Eye, EyeOff, Cpu,
  Paperclip, FileText, Scan, Trash2, Target, Lock, ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ChatMessage, LevelWithProgress, DebriefData } from '@guardian/shared';

/* ─── Formatted user message ───────────────────────────────────────────────── */
function FormattedUserMessage({ content }: { content: string }) {
  const docMatch = content.match(/^([\s\S]*?)(?:\n\n|\n)?(\[(?:DOCUMENT|OCR EXTRACTED DOCUMENT): (.*?)\]\n([\s\S]*))$/);

  if (!docMatch) {
    return <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">{content}</pre>;
  }

  const instruction = docMatch[1].trim();
  const docName = docMatch[3];
  const docBody = docMatch[4].trim();

  return (
    <div className="flex flex-col gap-2 font-mono text-sm">
      {instruction && <p className="whitespace-pre-wrap break-words">{instruction}</p>}
      <div
        style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '10px',
          padding: '10px 12px',
        }}
      >
        <div className="flex items-center gap-2 font-semibold text-xs" style={{ color: '#f59e0b' }}>
          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Attached: {docName}</span>
          <span className="text-white/30 font-normal flex-shrink-0">({docBody.length.toLocaleString()} chars)</span>
        </div>
        <details className="mt-1.5 border-t border-white/5 pt-1.5">
          <summary className="cursor-pointer text-white/40 hover:text-yellow-400/70 transition-colors text-[11px] font-mono">
            Show extracted text
          </summary>
          <pre className="mt-1.5 p-2 rounded text-[11px] text-white/60 max-h-44 overflow-y-auto whitespace-pre-wrap"
            style={{ background: 'rgba(0,0,0,0.35)' }}>
            {docBody}
          </pre>
        </details>
      </div>
    </div>
  );
}

/* ─── Difficulty stars ────────────────────────────────────────────────────── */
function DifficultyStars({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < difficulty ? 'star-filled fill-current' : 'star-empty'}`} />
      ))}
    </div>
  );
}

/* ─── Success particle burst ─────────────────────────────────────────────── */
function SuccessBurst() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="relative">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i % 3 === 0 ? '#00ff88' : i % 3 === 1 ? '#f59e0b' : '#3b82f6',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-${40 + Math.random() * 60}px)`,
              animation: `floatUp ${0.6 + Math.random() * 0.4}s ease-out forwards`,
              animationDelay: `${i * 40}ms`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Debrief panel ───────────────────────────────────────────────────────── */
function DebriefPanel({ debrief, score, onContinue }: {
  debrief: DebriefData;
  score: number;
  onContinue: () => void;
}) {
  return (
    <div className="debrief-panel mx-2 mb-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-neon-green" />
        </div>
        <div className="flex-1">
          <div className="font-mono font-bold text-neon-green text-lg">Challenge Cleared!</div>
          <div className="text-sm font-mono text-white/40 mt-0.5">Security vulnerability successfully exploited</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-bold text-neon-green">+{score}</div>
          <div className="font-mono text-xs text-white/30">points earned</div>
        </div>
      </div>

      {/* Neon divider */}
      <div className="neon-divider mb-5" />

      {/* Vuln details */}
      <div className="rounded-xl p-4 mb-4 space-y-3"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-white/35 uppercase tracking-wider">OWASP Reference</span>
          <span
            className="font-mono text-xs px-2.5 py-1 rounded-full"
            style={{
              color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.3)',
              background: 'rgba(245,158,11,0.08)',
            }}
          >
            {debrief.owaspRef}
          </span>
        </div>
        <div className="font-mono font-semibold text-white">{debrief.vulnClass}</div>
        <p className="text-white/55 text-sm leading-relaxed">{debrief.explanation}</p>
      </div>

      {/* Mitigation */}
      <div className="rounded-xl p-4 mb-5"
        style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.12)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-neon-green" />
          <span className="font-mono text-xs text-neon-green uppercase tracking-wider">Real-world Mitigation</span>
        </div>
        <p className="text-white/50 text-sm leading-relaxed">{debrief.mitigation}</p>
      </div>

      <button
        id="btn-continue"
        onClick={onContinue}
        className="btn-neon-solid w-full flex items-center justify-center gap-2"
      >
        Continue to Next Level
        <ChevronLeft className="w-4 h-4 rotate-180" />
      </button>
    </div>
  );
}

/* ─── Hint modal ─────────────────────────────────────────────────────────── */
function HintModal({ levelId, onClose, onHintRevealed }: {
  levelId: number;
  onClose: () => void;
  onHintRevealed: (hint: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(`/levels/${levelId}/hint`, { password });
      onHintRevealed(data.hint);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Incorrect password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/85 backdrop-blur-md animate-fade-in">
      <div className="glass rounded-2xl p-8 w-full max-w-sm mx-4 shadow-glass animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyber-amber/10 border border-cyber-amber/25 flex items-center justify-center">
              <Lightbulb className="w-4.5 h-4.5 text-cyber-amber" />
            </div>
            <h3 className="font-mono font-bold text-white">Unlock Hint</h3>
          </div>
          <button
            id="btn-close-hint"
            onClick={onClose}
            className="btn-icon w-8 h-8"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-xl p-4 mb-6"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <p className="text-white/60 font-mono text-sm leading-relaxed">
            Hints cost <span className="text-cyber-amber font-semibold">150 points</span> from your final score. Enter the training lab password to proceed.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <input
              id="hint-password-input"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-cyber pr-12"
              placeholder="Lab password..."
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm font-mono px-3 py-2.5 rounded-lg"
              style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            id="btn-unlock-hint"
            type="submit"
            disabled={loading}
            className="btn-neon w-full text-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
                Verifying...
              </span>
            ) : 'Unlock Hint'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Game Page ─────────────────────────────────────────────────────── */
export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const levelId = parseInt(id!, 10);

  const [level, setLevel] = useState<LevelWithProgress | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [submitAnswer, setSubmitAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hint, setHint] = useState('');
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [passed, setPassed] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [showMobileObjective, setShowMobileObjective] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  interface AttachedDoc { name: string; content: string; isOcr?: boolean; }
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    api.get(`/levels/${levelId}`).then(({ data }) => {
      setLevel(data);
      setPassed(data.completed);
      setAttemptCount(data.attemptCount || 0);
    });
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [levelId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

    if (isImage || isPdf) {
      setOcrLoading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          const { data } = await api.post('/ocr', { image: base64Data, isPdf, filename: file.name });
          setAttachedDoc({ name: file.name, content: (data.text || '').trim(), isOcr: isImage });
        } catch (err) {
          console.error('Doc/OCR Error:', err);
        } finally {
          setOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawText = event.target?.result as string;
        if (rawText) {
          setAttachedDoc({
            name: file.name,
            content: rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim(),
            isOcr: false,
          });
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  async function sendMessage() {
    if ((!input.trim() && !attachedDoc) || loading || typing) return;

    let userMsg = input.trim();
    if (attachedDoc) {
      const docHeader = attachedDoc.isOcr
        ? `[OCR EXTRACTED DOCUMENT: ${attachedDoc.name}]`
        : `[DOCUMENT: ${attachedDoc.name}]`;
      userMsg = userMsg ? `${userMsg}\n\n${docHeader}\n${attachedDoc.content}` : `${docHeader}\n${attachedDoc.content}`;
    }

    setInput('');
    setAttachedDoc(null);
    setMessages((m) => [
      ...m,
      { role: 'user', content: userMsg, timestamp: new Date().toISOString() },
      { role: 'assistant', content: '', timestamp: new Date().toISOString() },
    ]);
    setTyping(true);

    try {
      const token = useAuthStore.getState().accessToken;
      const response = await fetch(`/api/levels/${levelId}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try { const j = await response.json(); if (j.error) errMsg = j.error; } catch {}
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.reasoningToken) {
                  setTyping(false);
                  setMessages((m) => {
                    const last = m.length - 1;
                    if (last < 0) return m;
                    const updated = [...m];
                    updated[last] = { ...updated[last], reasoningContent: (updated[last].reasoningContent || '') + data.reasoningToken };
                    return updated;
                  });
                }
                if (data.token) {
                  setTyping(false);
                  setMessages((m) => {
                    const last = m.length - 1;
                    if (last < 0) return m;
                    const updated = [...m];
                    updated[last] = { ...updated[last], content: updated[last].content + data.token };
                    return updated;
                  });
                }
                if (data.done) {
                  setTyping(false);
                  if (data.attemptCount) setAttemptCount(data.attemptCount);
                  if (data.passed && !passed) {
                    setPassed(true);
                    setFinalScore(data.score || 0);
                    if (data.debrief) setDebrief(data.debrief);
                    clearInterval(timerRef.current);
                    setShowBurst(true);
                    setTimeout(() => setShowBurst(false), 1500);
                  }
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      setTyping(false);
      const errMsg = err.message || 'Connection error. Please try again.';
      setMessages((m) => {
        const last = m.length - 1;
        if (last >= 0 && m[last].role === 'assistant' && !m[last].content) {
          const updated = [...m];
          updated[last] = { ...updated[last], content: `⚠️ ${errMsg}` };
          return updated;
        }
        return [...m, { role: 'assistant', content: `⚠️ ${errMsg}`, timestamp: new Date().toISOString() }];
      });
    }
  }

  async function submitFinalAnswer() {
    if (!submitAnswer.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/levels/${levelId}/chat`, { message: `SUBMIT: ${submitAnswer.trim()}` });
      setAttemptCount(data.attemptCount);
      if (data.passed && !passed) {
        setPassed(true);
        setFinalScore(data.score || 0);
        if (data.debrief) setDebrief(data.debrief);
        clearInterval(timerRef.current);
        setShowBurst(true);
        setTimeout(() => setShowBurst(false), 1500);
      } else if (!data.passed) {
        setMessages((m) => [...m, {
          role: 'assistant',
          content: '❌ That\'s not the right answer. Keep exploring the conversation!',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  async function clearChatHistory() {
    try {
      await api.delete(`/levels/${levelId}/chat`);
      setMessages([]);
      setAttachedDoc(null);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  }

  if (!level) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
          <p className="text-neon-green font-mono text-sm animate-pulse">Loading level...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden bg-navy-900 flex flex-col">
      {showBurst && <SuccessBurst />}

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="glass border-b border-white/5 px-4 py-3 flex items-center gap-3 z-20 flex-shrink-0">
        <button
          id="btn-back"
          onClick={() => navigate('/levels')}
          className="btn-icon w-8 h-8 flex-shrink-0"
          title="Back to levels"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="w-7 h-7 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center flex-shrink-0">
          <Shield className="w-3.5 h-3.5 text-neon-green" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-mono font-semibold text-white text-sm truncate leading-tight">
            {level.title}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {passed ? (
              <span className="flex items-center gap-1 font-mono text-xs text-neon-green">
                <CheckCircle2 className="w-3 h-3" /> Cleared
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-mono text-xs text-white/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-amber animate-pulse" />
                In progress
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-white/40 flex-shrink-0">
          <button
            onClick={() => setShowMobileObjective((prev) => !prev)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/25 text-neon-green text-xs font-mono transition-all"
            title="Toggle Objective"
          >
            <Target className="w-3.5 h-3.5 text-neon-green" />
            <span className="hidden xs:inline sm:inline">Objective</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMobileObjective ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={clearChatHistory}
            title="Clear chat history"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 text-white/50 hover:text-white transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5 text-cyber-amber" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8">
            <Zap className="w-3 h-3 text-cyber-blue" />
            <span className="text-white">{attemptCount}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
            passed ? 'bg-neon-green/10 border-neon-green/20 text-neon-green' : 'bg-white/5 border-white/8'
          }`}>
            <Clock className="w-3 h-3" />
            <span className={passed ? 'text-neon-green' : 'text-white'}>{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* ── Mobile Collapsible Objective Banner ─────────────────────────────────── */}
      {showMobileObjective && (
        <div className="lg:hidden glass border-b border-neon-green/20 p-4 bg-navy-900/95 animate-fade-in flex-shrink-0 z-10 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neon-green" />
              <span className="font-mono text-xs font-semibold text-neon-green uppercase tracking-widest">
                Level Objective
              </span>
            </div>
            <button
              onClick={() => setShowMobileObjective(false)}
              className="text-white/40 hover:text-white transition-colors p-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="font-mono text-sm text-white/80 leading-relaxed">
            {level.objective}
          </p>
          {!passed && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowMobileObjective(false);
                  setShowHint(true);
                }}
                className="flex items-center gap-1.5 text-xs font-mono text-cyber-amber hover:underline"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Unlock Hint (-150 pts)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0 h-full">

        {/* ── Chat panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full overflow-hidden">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-5 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-neon-green/5 border border-neon-green/10 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-neon-green/40" />
                </div>
                <div>
                  <p className="font-mono text-white/30 text-sm">Guardian AI is standing by</p>
                  <p className="font-mono text-white/15 text-xs mt-1">Send a message to begin the challenge</p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2.5 animate-float-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-neon-green/8 border border-neon-green/15 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <Shield className="w-3.5 h-3.5 text-neon-green" />
                  </div>
                )}

                <div className={msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}>
                  {/* Reasoning */}
                  {msg.role === 'assistant' && msg.reasoningContent && !msg.content && (
                    <div className="flex items-center gap-2 font-mono text-xs animate-pulse" style={{ color: '#f59e0b' }}>
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Thinking...</span>
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.reasoningContent && msg.content && (
                    <details className="text-xs font-mono mb-2.5 border-b border-white/5 pb-2">
                      <summary className="cursor-pointer text-white/30 hover:text-cyber-amber transition-colors flex items-center gap-1.5 select-none">
                        <Cpu className="w-3 h-3 text-cyber-amber" />
                        Chain of Thought
                      </summary>
                      <div className="mt-2 p-2.5 rounded-lg text-white/40 text-xs font-mono max-h-36 overflow-y-auto whitespace-pre-wrap"
                        style={{ background: 'rgba(0,0,0,0.3)' }}>
                        {msg.reasoningContent}
                      </div>
                    </details>
                  )}

                  {/* Content */}
                  {msg.content ? (
                    msg.role === 'user' ? (
                      <FormattedUserMessage content={msg.content} />
                    ) : (levelId === 9 || level?.vulnCategory === 'insecure_output') ? (
                      <div
                        className="font-mono text-sm leading-relaxed text-white space-y-2"
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">{msg.content}</pre>
                    )
                  ) : (
                    msg.role === 'assistant' && !msg.reasoningContent && (
                      <div className="flex items-center gap-1.5 py-1">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}

            {/* Debrief */}
            {passed && debrief && (
              <DebriefPanel
                debrief={debrief}
                score={finalScore}
                onContinue={() => navigate('/levels')}
              />
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── Input area ────────────────────────────────────────────────── */}
          <div className="glass border-t border-white/5 p-4 space-y-3 flex-shrink-0">
            {/* Hint display */}
            {hint && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl animate-float-up"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Lightbulb className="w-4 h-4 text-cyber-amber flex-shrink-0 mt-0.5" />
                <p className="text-cyber-amber font-mono text-sm leading-relaxed">{hint}</p>
              </div>
            )}

            {/* File input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.png,.jpg,.jpeg,.webp,.bmp,.txt,.md,.json,.csv,.doc,.docx,.pdf,.log"
              className="hidden"
            />

            {/* Attached doc preview */}
            {(attachedDoc || ocrLoading) && (
              <div className="flex items-center justify-between text-xs font-mono px-3 py-2.5 rounded-lg animate-float-up"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <div className="flex items-center gap-2 overflow-hidden">
                  {ocrLoading ? (
                    <Scan className="w-3.5 h-3.5 text-cyber-amber animate-spin flex-shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-cyber-amber flex-shrink-0" />
                  )}
                  <span className="truncate font-semibold text-cyber-amber">
                    {ocrLoading ? 'Scanning via OCR...' : attachedDoc?.name}
                  </span>
                  {attachedDoc && (
                    <span className="text-white/30 flex-shrink-0">
                      ({attachedDoc.content.length.toLocaleString()} chars{attachedDoc.isOcr ? ' · OCR' : ''})
                    </span>
                  )}
                </div>
                {!ocrLoading && (
                  <button
                    onClick={() => setAttachedDoc(null)}
                    className="text-white/40 hover:text-white transition-colors ml-2 p-0.5 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Main chat input */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={typing || passed || ocrLoading}
                title="Attach document or image"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-mono transition-all duration-200 disabled:opacity-40"
                style={{
                  background: 'rgba(14,20,34,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {ocrLoading ? (
                  <Scan className="w-4 h-4 text-cyber-amber animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4 text-cyber-amber" />
                )}
                <span className="hidden sm:inline">{ocrLoading ? 'Scanning...' : 'Attach'}</span>
              </button>

              <input
                id="chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                className="input-cyber flex-1"
                placeholder={
                  passed
                    ? 'Level completed!'
                    : attachedDoc
                      ? 'Type instruction for attached document...'
                      : 'Chat with the Guardian AI...'
                }
                disabled={typing || passed}
                autoFocus
              />

              <button
                id="btn-send"
                onClick={sendMessage}
                disabled={(!input.trim() && !attachedDoc) || typing || passed || ocrLoading}
                className="btn-neon-solid px-4 disabled:opacity-40"
              >
                {typing ? (
                  <span className="w-4 h-4 rounded-full border-2 border-navy-900 border-t-transparent animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Submit answer row */}
            <div className="flex gap-2">
              <input
                id="submit-answer-input"
                type="text"
                value={submitAnswer}
                onChange={(e) => setSubmitAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitFinalAnswer()}
                className="input-cyber flex-1 text-sm"
                style={{
                  color: passed ? '#00ff88' : '#e2e8f0',
                  borderColor: passed ? 'rgba(0,255,136,0.25)' : undefined,
                }}
                placeholder={passed ? '✓ Level completed' : 'Submit extracted secret here...'}
                disabled={loading || passed}
              />
              <button
                id="btn-submit-answer"
                onClick={submitFinalAnswer}
                disabled={!submitAnswer.trim() || loading || passed}
                className="px-4 py-3 rounded-xl font-mono text-sm font-semibold transition-all duration-200 disabled:opacity-30"
                style={{
                  background: 'rgba(0,255,136,0.08)',
                  border: '1px solid rgba(0,255,136,0.25)',
                  color: '#00ff88',
                }}
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-neon-green border-t-transparent animate-spin inline-block" />
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 glass border-l border-white/5 overflow-y-auto flex-shrink-0 h-full">
          {/* Objective */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-3.5 h-3.5 text-neon-green" />
              <span className="font-mono text-xs text-white/30 uppercase tracking-widest">Objective</span>
            </div>
            <p className="font-mono text-sm text-white/65 leading-relaxed">{level.objective}</p>
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-3.5 h-3.5 text-cyber-blue" />
              <span className="font-mono text-xs text-white/30 uppercase tracking-widest">Stats</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-white/40">Difficulty</span>
                <DifficultyStars difficulty={level.difficulty} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-white/40">Attempts</span>
                <span className="font-mono text-sm text-white font-semibold">{attemptCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-white/40">Time</span>
                <span className={`font-mono text-sm font-semibold ${passed ? 'text-neon-green' : 'text-white'}`}>
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-white/40">Status</span>
                {passed ? (
                  <span className="flex items-center gap-1.5 font-mono text-xs text-neon-green">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-mono text-xs text-white/40">
                    <Lock className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hint / Cleared status */}
          <div className="p-6">
            {!passed ? (
              <button
                id="btn-show-hint"
                onClick={() => setShowHint(true)}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl font-mono text-sm transition-all duration-200 group"
                style={{
                  background: 'rgba(245,158,11,0.06)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  color: '#f59e0b',
                }}
              >
                <Lightbulb className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Unlock Hint</span>
                <span className="ml-auto text-xs text-white/30">-150 pts</span>
              </button>
            ) : (
              <div className="rounded-xl p-5 text-center"
                style={{
                  background: 'rgba(0,255,136,0.06)',
                  border: '1px solid rgba(0,255,136,0.2)',
                }}>
                <CheckCircle2 className="w-8 h-8 text-neon-green mx-auto mb-2" />
                <div className="font-mono font-bold text-neon-green text-sm">Level Cleared!</div>
                {finalScore > 0 && (
                  <div className="font-mono text-xs text-white/40 mt-1">{finalScore.toLocaleString()} pts earned</div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {showHint && (
        <HintModal
          levelId={levelId}
          onClose={() => setShowHint(false)}
          onHintRevealed={(h) => { setHint(h); setShowHint(false); }}
        />
      )}
    </div>
  );
}
