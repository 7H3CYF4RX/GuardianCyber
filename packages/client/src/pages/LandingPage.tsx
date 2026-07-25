import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Terminal, Cpu, Lock, ChevronRight, AlertTriangle, Eye, EyeOff, Zap, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const OWASP_ITEMS = [
  'Prompt Injection',
  'Jailbreaks',
  'RAG Poisoning',
  'Excessive Agency',
  'Insecure Output',
  'System Prompt Leakage',
  'Denial of Wallet',
  'Multi-Agent Trust',
];

function AnimatedTag({ label, delay }: { label: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-full transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        background: 'rgba(0,255,136,0.06)',
        border: '1px solid rgba(0,255,136,0.15)',
        color: 'rgba(0,255,136,0.8)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
      {label}
    </span>
  );
}

export default function LandingPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.post('/auth/register', { username, password, inviteCode });
        setSuccessMsg('Account created successfully! Please sign in with your password.');
        setMode('login');
        setPassword('');
      } else {
        const { data } = await api.post('/auth/login', { username, password });
        setAuth(data.accessToken, data.user);
        navigate('/levels');
      }
    } catch (err: any) {
      const errData = err.response?.data?.error;
      if (typeof errData === 'string') {
        setError(errData);
      } else if (errData && typeof errData === 'object') {
        setError('Invalid input details');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 grid-bg relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[10%] w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
      <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 70%)' }} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-neon-green" />
            </div>
            <div>
              <span className="font-mono font-bold text-neon-green tracking-wider text-sm">CYBERCREWS</span>
              <span className="text-white/20 text-xs font-mono block">AI Security Lab</span>
            </div>
          </div>
          <div className="badge-active">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            Training Range Active
          </div>
        </header>

        {/* Hero + Auth */}
        <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-16 px-8 py-12 max-w-6xl mx-auto w-full">

          {/* Left — Hero */}
          <div className="flex-1 max-w-xl text-center lg:text-left">
            <div className="mb-8 inline-flex items-center gap-2 font-mono text-xs text-white/30 border border-white/8 rounded-full px-3 py-1.5">
              <Zap className="w-3 h-3 text-cyber-amber" />
              OWASP LLM Top 10 · 14 Escalating Challenges
            </div>

            <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Can you trick
              <br />
              <span className="neon-text">the AI?</span>
            </h1>

            <p className="text-white/45 text-lg leading-relaxed mb-10 font-light">
              Master AI security vulnerabilities through real, hands-on challenges.
              Prompt injection, jailbreaks, RAG poisoning, and more — in a safe training environment.
            </p>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-10">
              {[
                { icon: Terminal, label: '14 Levels', sub: 'OWASP-based' },
                { icon: Cpu, label: 'Live AI', sub: 'NVIDIA NIM' },
                { icon: Lock, label: 'Real Vulns', sub: 'Hands-on lab' },
              ].map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(14,20,34,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="w-8 h-8 bg-neon-green/8 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-neon-green" />
                  </div>
                  <div>
                    <div className="font-mono font-semibold text-white text-sm">{label}</div>
                    <div className="text-white/30 text-xs font-mono">{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* OWASP tags */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {OWASP_ITEMS.map((item, i) => (
                <AnimatedTag key={item} label={item} delay={i * 100} />
              ))}
            </div>
          </div>

          {/* Right — Auth card */}
          <div className="w-full max-w-sm">
            <div
              className="rounded-2xl p-8"
              style={{
                background: 'rgba(8,13,25,0.9)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,255,136,0.05)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* Tab toggle */}
              <div className="flex rounded-xl p-1 mb-8" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    id={`tab-${m}`}
                    onClick={() => { setMode(m); setError(''); setSuccessMsg(''); }}
                    className="flex-1 py-2.5 rounded-lg font-mono text-sm font-semibold transition-all duration-200"
                    style={{
                      background: mode === m ? 'var(--neon)' : 'transparent',
                      color: mode === m ? 'var(--navy-900)' : 'rgba(255,255,255,0.35)',
                      boxShadow: mode === m ? '0 0 16px rgba(0,255,136,0.3)' : 'none',
                    }}
                  >
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-mono text-white/35 mb-2 uppercase tracking-widest">
                    Username
                  </label>
                  <input
                    id="input-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-cyber"
                    placeholder="agent_zero"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-mono text-white/35 mb-2 uppercase tracking-widest">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="input-password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-cyber pr-12"
                      placeholder="••••••••"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Invite code */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-mono text-white/35 mb-2 uppercase tracking-widest">
                      Invite Code <span className="text-white/15 normal-case">(optional)</span>
                    </label>
                    <input
                      id="input-invite"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="input-cyber"
                      placeholder="XXXX-XXXX"
                    />
                  </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                  <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl animate-float-up"
                    style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-neon-green flex-shrink-0" />
                    <span className="text-neon-green font-mono text-sm leading-snug">{successMsg}</span>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl animate-float-up"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-red-400 font-mono text-sm leading-snug">{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  id="btn-submit-auth"
                  type="submit"
                  disabled={loading}
                  className="btn-neon-solid w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-navy-900 border-t-transparent animate-spin" />
                      <span className="font-mono text-sm">Processing...</span>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-sm">
                        {mode === 'login' ? 'Enter the Lab' : 'Create Account'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-white/20 font-mono text-xs mt-6">
                {mode === 'login' ? (
                  <>No account? <button onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }} className="text-neon-green hover:underline transition-all">Register</button></>
                ) : (
                  <>Have an account? <button onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }} className="text-neon-green hover:underline transition-all">Sign in</button></>
                )}
              </p>
            </div>

            {/* Trust badges */}
            <div className="mt-4 flex items-center justify-center gap-6 font-mono text-xs text-white/20">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Secure
              </span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span>For authorized training only</span>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3" /> NVIDIA NIM
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-6 font-mono text-xs"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.15)' }}>
          CyberCrews AI Security Lab &nbsp;·&nbsp; OWASP LLM Top 10 Training
        </footer>
      </div>
    </div>
  );
}
