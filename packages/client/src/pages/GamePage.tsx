import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, Send, Lightbulb, ChevronLeft, CheckCircle2,
  AlertTriangle, Star, Clock, Zap, X, Eye, EyeOff, Cpu,
  Paperclip, FileText, Upload, Scan, Trash2, RotateCcw,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ChatMessage, LevelWithProgress, DebriefData } from '@guardian/shared';

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
      {instruction && (
        <p className="whitespace-pre-wrap break-words">{instruction}</p>
      )}
      <div className="bg-navy-900/80 border border-cyber-amber/30 rounded p-2.5 text-xs text-cyber-amber text-left">
        <div className="flex items-center gap-2 font-semibold">
          <FileText className="w-4 h-4 text-cyber-amber flex-shrink-0" />
          <span className="truncate">Attached Document: {docName}</span>
          <span className="text-white/40 font-normal flex-shrink-0">({docBody.length.toLocaleString()} chars)</span>
        </div>
        <details className="mt-1.5 text-white/50 border-t border-white/5 pt-1">
          <summary className="cursor-pointer hover:text-cyber-amber transition-colors text-[11px]">Show extracted text</summary>
          <pre className="mt-1.5 p-2 bg-black/40 rounded max-h-48 overflow-y-auto whitespace-pre-wrap text-[11px] text-white/70">
            {docBody}
          </pre>
        </details>
      </div>
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center flex-shrink-0">
        <Shield className="w-3.5 h-3.5 text-neon-green" />
      </div>
      <div className="bubble-ai flex items-center gap-1.5 py-3.5">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

// ─── Difficulty Stars ─────────────────────────────────────────────────────────
function DifficultyStars({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < difficulty ? 'star-filled fill-current' : 'star-empty'}`} />
      ))}
    </div>
  );
}

// ─── Debrief Panel ───────────────────────────────────────────────────────────
function DebriefPanel({ debrief, score, onContinue }: { debrief: DebriefData; score: number; onContinue: () => void }) {
  return (
    <div className="debrief-panel mx-2 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 className="w-6 h-6 text-neon-green flex-shrink-0" />
        <div>
          <div className="font-mono font-bold text-neon-green">Level Cleared!</div>
          <div className="text-xs font-mono text-white/40">{score} points earned</div>
        </div>
        <div className="ml-auto font-mono text-2xl font-bold text-neon-green">+{score}</div>
      </div>

      <div className="bg-navy-700 rounded-lg p-4 mb-4 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Vulnerability Class</span>
          <span className="font-mono text-xs text-cyber-amber border border-cyber-amber/30 bg-cyber-amber/10 px-2 py-0.5 rounded-full">
            {debrief.owaspRef}
          </span>
        </div>
        <div className="font-mono font-semibold text-white mb-3">{debrief.vulnClass}</div>
        <p className="text-white/60 text-sm leading-relaxed mb-3">{debrief.explanation}</p>
        <div className="border-t border-white/5 pt-3">
          <div className="text-xs font-mono text-neon-green mb-1.5 uppercase tracking-wider">Real-world mitigation</div>
          <p className="text-white/50 text-sm leading-relaxed">{debrief.mitigation}</p>
        </div>
      </div>

      <button id="btn-continue" onClick={onContinue} className="btn-neon-solid w-full">
        Continue to Next Level →
      </button>
    </div>
  );
}

// ─── Hint Modal ──────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/80 backdrop-blur-sm animate-fade-in">
      <div className="glass rounded-2xl p-8 w-full max-w-sm mx-4 shadow-glass">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-cyber-amber" />
            <h3 className="font-mono font-bold text-white">Unlock Hint</h3>
          </div>
          <button id="btn-close-hint" onClick={onClose} className="text-white/30 hover:text-white/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-white/40 font-mono text-sm mb-6 leading-relaxed">
          Hints cost <span className="text-cyber-amber">150 points</span> from your final score.
          Enter the training lab password to proceed.
        </p>

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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-cyber-crimson text-sm font-mono">
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
            {loading ? 'Verifying...' : 'Unlock Hint'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Game Page ───────────────────────────────────────────────────────────
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  interface AttachedDoc {
    name: string;
    content: string;
    isOcr?: boolean;
  }
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

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
          const cleanedText = (data.text || '').trim();
          setAttachedDoc({ name: file.name, content: cleanedText, isOcr: isImage });
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
          const sanitizedText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim();
          setAttachedDoc({ name: file.name, content: sanitizedText, isOcr: false });
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  }
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

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  async function sendMessage() {
    if ((!input.trim() && !attachedDoc) || loading || typing) return;

    let userMsg = input.trim();
    if (attachedDoc) {
      const docHeader = attachedDoc.isOcr ? `[OCR EXTRACTED DOCUMENT: ${attachedDoc.name}]` : `[DOCUMENT: ${attachedDoc.name}]`;
      userMsg = userMsg
        ? `${userMsg}\n\n${docHeader}\n${attachedDoc.content}`
        : `${docHeader}\n${attachedDoc.content}`;
    }

    setInput('');
    setAttachedDoc(null);

    // Add user message & empty assistant placeholder for streaming
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson.error) errMsg = errJson.error;
        } catch {}
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
                    const lastIdx = m.length - 1;
                    if (lastIdx < 0) return m;
                    const updated = [...m];
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      reasoningContent: (updated[lastIdx].reasoningContent || '') + data.reasoningToken,
                    };
                    return updated;
                  });
                }
                if (data.token) {
                  setTyping(false);
                  setMessages((m) => {
                    const lastIdx = m.length - 1;
                    if (lastIdx < 0) return m;
                    const updated = [...m];
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      content: updated[lastIdx].content + data.token,
                    };
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
        const lastIdx = m.length - 1;
        if (lastIdx >= 0 && m[lastIdx].role === 'assistant' && !m[lastIdx].content) {
          const updated = [...m];
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `⚠️ ${errMsg}`,
          };
          return updated;
        }
        return [...m, {
          role: 'assistant',
          content: `⚠️ ${errMsg}`,
          timestamp: new Date().toISOString(),
        }];
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
      } else if (!data.passed) {
        setMessages((m) => [...m, {
          role: 'assistant',
          content: `❌ That's not the right answer. Keep exploring!`,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch {
      // handled above
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
        <div className="text-neon-green font-mono animate-pulse">Loading level...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Top bar */}
      <header className="glass border-b border-white/5 px-4 py-3 flex items-center gap-4 z-20">
        <button id="btn-back" onClick={() => navigate('/levels')} className="text-white/30 hover:text-neon-green transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Shield className="w-4 h-4 text-neon-green" />
        <h1 className="font-mono font-semibold text-white text-sm truncate flex-1">{level.title}</h1>
        <div className="flex items-center gap-4 text-xs font-mono text-white/40">
          <button
            onClick={clearChatHistory}
            title="Clear Chat History"
            className="hover:text-cyber-amber transition-colors flex items-center gap-1.5 text-xs text-white/60 hover:bg-white/5 px-2 py-1 rounded"
          >
            <Trash2 className="w-3.5 h-3.5 text-cyber-amber" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{attemptCount}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(elapsedSeconds)}</span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-20 text-white/20 font-mono text-sm animate-fade-in">
                <Shield className="w-8 h-8 mx-auto mb-3 text-neon-green/30" />
                Send a message to begin the challenge...
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-neon-green" />
                  </div>
                )}
                <div className={msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}>
                  {msg.role === 'assistant' && msg.reasoningContent && !msg.content && (
                    <div className="flex items-center gap-2 text-cyber-amber font-mono text-xs animate-pulse">
                      <Cpu className="w-3.5 h-3.5 text-cyber-amber" />
                      <span>Thinking...</span>
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.reasoningContent && msg.content && (
                    <details className="text-xs text-white/40 font-mono mb-2 border-b border-white/5 pb-1">
                      <summary className="cursor-pointer hover:text-cyber-amber transition-colors flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-cyber-amber inline" /> Chain of Thought
                      </summary>
                      <div className="mt-1.5 p-2 bg-navy-900/60 rounded text-white/50 text-xs font-mono max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {msg.reasoningContent}
                      </div>
                    </details>
                  )}
                  {msg.content ? (
                    msg.role === 'user' ? (
                      <FormattedUserMessage content={msg.content} />
                    ) : (levelId === 9 || level?.vulnCategory === 'insecure_output') ? (
                      <div
                        className="font-mono text-sm leading-relaxed text-white space-y-2 [&_h2]:text-base [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
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
            {passed && debrief && (
              <DebriefPanel
                debrief={debrief}
                score={finalScore}
                onContinue={() => navigate('/levels')}
              />
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="glass border-t border-white/5 p-4 space-y-3">
            {hint && (
              <div className="bg-cyber-amber/10 border border-cyber-amber/30 rounded-lg px-4 py-3 flex items-start gap-3 animate-fade-in">
                <Lightbulb className="w-4 h-4 text-cyber-amber flex-shrink-0 mt-0.5" />
                <p className="text-cyber-amber font-mono text-sm">{hint}</p>
              </div>
            )}

            {/* Hidden file input supporting docs & images for OCR */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.png,.jpg,.jpeg,.webp,.bmp,.txt,.md,.json,.csv,.doc,.docx,.pdf,.log"
              className="hidden"
            />

            {(attachedDoc || ocrLoading) && (
              <div className="flex items-center justify-between text-xs font-mono text-cyber-amber bg-cyber-amber/10 border border-cyber-amber/20 rounded px-3 py-2 animate-fade-in">
                <div className="flex items-center gap-2 overflow-hidden">
                  {ocrLoading ? (
                    <Scan className="w-3.5 h-3.5 text-cyber-amber animate-spin flex-shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-cyber-amber flex-shrink-0" />
                  )}
                  <span className="truncate font-semibold">{ocrLoading ? 'Scanning Document via OCR...' : attachedDoc?.name}</span>
                  {attachedDoc && (
                    <span className="text-white/40 text-[10px] flex-shrink-0">
                      ({attachedDoc.content.length.toLocaleString()} chars{attachedDoc.isOcr ? ' • OCR' : ''})
                    </span>
                  )}
                </div>
                {!ocrLoading && (
                  <button
                    onClick={() => setAttachedDoc(null)}
                    className="text-white/50 hover:text-white transition-colors ml-2 p-1"
                    title="Remove attached document"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={typing || passed || ocrLoading}
                title="Upload document or image file for OCR"
                className="px-3.5 py-2.5 bg-navy-800/80 hover:bg-navy-700/80 border border-white/10 rounded-lg text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono disabled:opacity-50"
              >
                {ocrLoading ? (
                  <Scan className="w-4 h-4 text-cyber-amber animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4 text-cyber-amber" />
                )}
                <span className="hidden sm:inline">{ocrLoading ? 'Scanning...' : 'Attach Doc/Image'}</span>
              </button>

              <input
                id="chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                className="input-cyber flex-1"
                placeholder={attachedDoc ? "Type instruction for attached document..." : levelId === 5 ? "Paste or upload a document to summarize..." : "Chat with the Guardian AI..."}
                disabled={typing || passed}
                autoFocus
              />
              <button
                id="btn-send"
                onClick={sendMessage}
                disabled={(!input.trim() && !attachedDoc) || typing || passed || ocrLoading}
                className="btn-neon-solid px-4 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
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
                className="input-cyber flex-1 text-neon-green placeholder:text-neon-green/30 border-neon-green/20"
                placeholder="Submit extracted secret here..."
                disabled={loading || passed}
              />
              <button
                id="btn-submit-answer"
                onClick={submitFinalAnswer}
                disabled={!submitAnswer.trim() || loading || passed}
                className="bg-neon-green/10 border border-neon-green/30 text-neon-green hover:bg-neon-green hover:text-navy-900 font-mono text-sm px-4 py-3 rounded-lg transition-all duration-200 disabled:opacity-30"
              >
                {loading ? '...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>

        {/* Objective sidebar */}
        <aside className="hidden lg:flex flex-col w-80 glass border-l border-white/5 p-6 gap-6 overflow-y-auto">
          {/* Level info */}
          <div>
            <div className="text-xs font-mono text-white/30 uppercase tracking-wider mb-2">Objective</div>
            <p className="font-mono text-sm text-white/70 leading-relaxed">{level.objective}</p>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3">Stats</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center font-mono text-sm">
                <span className="text-white/40">Difficulty</span>
                <DifficultyStars difficulty={level.difficulty} />
              </div>
              <div className="flex justify-between items-center font-mono text-sm">
                <span className="text-white/40">Attempts</span>
                <span className="text-white">{attemptCount}</span>
              </div>
              <div className="flex justify-between items-center font-mono text-sm">
                <span className="text-white/40">Time</span>
                <span className={`${passed ? 'text-neon-green' : 'text-white'}`}>{formatTime(elapsedSeconds)}</span>
              </div>
            </div>
          </div>

          {!passed && (
            <button
              id="btn-show-hint"
              onClick={() => setShowHint(true)}
              className="flex items-center gap-2 bg-cyber-amber/10 border border-cyber-amber/30 text-cyber-amber rounded-lg px-4 py-3 font-mono text-sm hover:bg-cyber-amber/20 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              Show Hint (-150 pts)
            </button>
          )}

          {passed && (
            <div className="bg-neon-green/10 border border-neon-green/30 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-neon-green mx-auto mb-2" />
              <div className="font-mono font-bold text-neon-green">Level Cleared!</div>
              <div className="text-xs font-mono text-white/40 mt-1">{finalScore} points</div>
            </div>
          )}
        </aside>
      </div>

      {showHint && (
        <HintModal
          levelId={levelId}
          onClose={() => setShowHint(false)}
          onHintRevealed={(h) => {
            setHint(h);
            setShowHint(false);
          }}
        />
      )}
    </div>
  );
}
