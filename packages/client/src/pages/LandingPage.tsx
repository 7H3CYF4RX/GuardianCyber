import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Terminal, Cpu, Lock, ChevronRight, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function LandingPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'register' ? { username, password, inviteCode } : { username, password };
      const { data } = await api.post(endpoint, payload);
      setAuth(data.accessToken, data.user);
      navigate('/levels');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 grid-bg relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-green/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-cyber-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-8 py-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-neon-green" />
          </div>
          <span className="font-mono font-bold text-neon-green tracking-wider text-sm">CYBERCREWS</span>
          <span className="text-white/20 text-sm font-mono">/ AI Security Lab</span>
        </header>

        {/* Hero + Auth */}
        <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-16 px-8 py-12 max-w-6xl mx-auto w-full">
          {/* Left — Hero text */}
          <div className="flex-1 text-center lg:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 bg-neon-green/10 border border-neon-green/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
              <span className="font-mono text-neon-green text-xs tracking-widest">TRAINING RANGE ACTIVE</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
              Can you trick the{' '}
              <span className="neon-text">AI Guardian?</span>
            </h1>

            <p className="text-white/50 text-lg leading-relaxed mb-10">
              Master LLM vulnerabilities through 14 escalating challenges. Prompt injection,
              jailbreaks, RAG poisoning, excessive agency, and more — all in a safe,
              hands-on training environment.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Terminal, label: '14 Levels', sub: 'OWASP LLM Top 10' },
                { icon: Cpu, label: 'Live AI', sub: 'NVIDIA NIM API' },
                { icon: Lock, label: 'Real Vulns', sub: 'Hands-on lab' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="glass rounded-xl p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-neon-green/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-neon-green" />
                  </div>
                  <div>
                    <div className="font-mono font-semibold text-white text-sm">{label}</div>
                    <div className="text-white/40 text-xs font-mono">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Auth card */}
          <div className="w-full max-w-sm">
            <div className="glass rounded-2xl p-8 shadow-glass">
              {/* Tab toggle */}
              <div className="flex rounded-lg bg-navy-700 p-1 mb-8">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    id={`tab-${m}`}
                    onClick={() => { setMode(m); setError(''); }}
                    className={`flex-1 py-2 rounded-md font-mono text-sm font-medium transition-all duration-200 ${
                      mode === m
                        ? 'bg-neon-green text-navy-900 shadow-neon-sm'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
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

                <div>
                  <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    id="input-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-cyber"
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={8}
                  />
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-2 uppercase tracking-wider">
                      Invite Code <span className="text-white/20">(if required)</span>
                    </label>
                    <input
                      id="input-invite"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="input-cyber"
                      placeholder="optional"
                    />
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 bg-cyber-crimson/10 border border-cyber-crimson/30 rounded-lg px-4 py-3 animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-cyber-crimson flex-shrink-0" />
                    <span className="text-cyber-crimson font-mono text-sm">{error}</span>
                  </div>
                )}

                <button
                  id="btn-submit-auth"
                  type="submit"
                  disabled={loading}
                  className="btn-neon-solid w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="font-mono text-sm">Authenticating...</span>
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
                  <>No account? <button onClick={() => setMode('register')} className="text-neon-green hover:underline">Register</button></>
                ) : (
                  <>Have an account? <button onClick={() => setMode('login')} className="text-neon-green hover:underline">Sign in</button></>
                )}
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-6 text-white/20 font-mono text-xs border-t border-white/5">
          CyberCrews AI Security Lab &nbsp;·&nbsp; For authorized training only
        </footer>
      </div>
    </div>
  );
}
