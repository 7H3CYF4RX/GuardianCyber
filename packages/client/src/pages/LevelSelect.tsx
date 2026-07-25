import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Lock, CheckCircle2, Star, Trophy, LogOut, ChevronRight,
  Zap, Target, TrendingUp, RotateCcw, AlertTriangle, X,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { LevelWithProgress } from '@guardian/shared';

const VULN_LABELS: Record<string, string> = {
  prompt_injection: 'Prompt Injection',
  jailbreak: 'Jailbreak',
  output_filter: 'Output Filter',
  rag_injection: 'RAG Injection',
  system_prompt_leakage: 'Prompt Leakage',
  multi_turn: 'Social Engineering',
  excessive_agency: 'Excessive Agency',
  insecure_output: 'Insecure Output',
  training_data: 'Data Leakage',
  knowledge_integrity: 'RAG Poisoning',
  resource_abuse: 'DoW Attack',
  agent_trust: 'Multi-Agent',
  guardrail_bypass: 'Guardrail Bypass',
};

const VULN_COLORS: Record<string, { text: string; border: string; bg: string; dot: string }> = {
  prompt_injection:      { text: '#3b82f6', border: 'rgba(59,130,246,0.3)',  bg: 'rgba(59,130,246,0.08)',  dot: '#3b82f6' },
  jailbreak:             { text: '#a855f7', border: 'rgba(168,85,247,0.3)',  bg: 'rgba(168,85,247,0.08)',  dot: '#a855f7' },
  output_filter:         { text: '#f59e0b', border: 'rgba(245,158,11,0.3)',  bg: 'rgba(245,158,11,0.08)',  dot: '#f59e0b' },
  rag_injection:         { text: '#00ff88', border: 'rgba(0,255,136,0.3)',   bg: 'rgba(0,255,136,0.08)',   dot: '#00ff88' },
  system_prompt_leakage: { text: '#ef4444', border: 'rgba(239,68,68,0.3)',   bg: 'rgba(239,68,68,0.08)',   dot: '#ef4444' },
  multi_turn:            { text: '#22d3ee', border: 'rgba(34,211,238,0.3)',  bg: 'rgba(34,211,238,0.08)',  dot: '#22d3ee' },
  excessive_agency:      { text: '#fb923c', border: 'rgba(251,146,60,0.3)',  bg: 'rgba(251,146,60,0.08)',  dot: '#fb923c' },
  insecure_output:       { text: '#f87171', border: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.08)', dot: '#f87171' },
  training_data:         { text: '#f472b6', border: 'rgba(244,114,182,0.3)', bg: 'rgba(244,114,182,0.08)', dot: '#f472b6' },
  knowledge_integrity:   { text: '#34d399', border: 'rgba(52,211,153,0.3)',  bg: 'rgba(52,211,153,0.08)',  dot: '#34d399' },
  resource_abuse:        { text: '#fbbf24', border: 'rgba(251,191,36,0.3)',  bg: 'rgba(251,191,36,0.08)',  dot: '#fbbf24' },
  agent_trust:           { text: '#a78bfa', border: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.08)', dot: '#a78bfa' },
  guardrail_bypass:      { text: '#fb7185', border: 'rgba(251,113,133,0.3)', bg: 'rgba(251,113,133,0.08)', dot: '#fb7185' },
};

function DifficultyStars({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Star key={i} className={`w-2.5 h-2.5 ${i < difficulty ? 'star-filled fill-current' : 'star-empty'}`} />
      ))}
    </div>
  );
}

function VulnTag({ category }: { category: string }) {
  const c = VULN_COLORS[category] || { text: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.15)', bg: 'rgba(255,255,255,0.05)', dot: '#fff' };
  return (
    <span
      className="font-mono text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5"
      style={{ color: c.text, borderColor: c.border, background: c.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {VULN_LABELS[category] || category}
    </span>
  );
}

export default function LevelSelect() {
  const [levels, setLevels] = useState<LevelWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    api.get('/levels').then(({ data }) => {
      setLevels(data);
      setLoading(false);
    });
  }, []);

  const completedCount = levels.filter((l) => l.completed).length;
  const totalScore = levels.reduce((sum, l) => sum + (l.bestScore || 0), 0);
  const progressPct = levels.length > 0 ? Math.round((completedCount / levels.length) * 100) : 0;

  function handleLogout() {
    api.post('/auth/logout').finally(() => {
      clearAuth();
      navigate('/');
    });
  }

  async function handleResetProgress() {
    setResetting(true);
    try {
      await api.post('/levels/reset-progress');
      const { data } = await api.get('/levels');
      setLevels(data);
      setShowResetModal(false);
    } catch (err) {
      console.error('Failed to reset lab progress:', err);
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 grid-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
          <p className="text-neon-green font-mono text-sm animate-pulse">Initializing levels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 grid-bg">
      {/* Ambient glows */}
      <div className="fixed top-0 left-0 w-[600px] h-[400px] bg-neon-green/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[400px] bg-cyber-blue/4 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-neon-green" />
            </div>
            <span className="font-mono font-bold text-neon-green tracking-wider text-sm">CYBERCREWS</span>
            <span className="text-white/20 font-mono text-sm hidden sm:block">/ AI Security Lab</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-5 font-mono text-sm">
              <div className="flex items-center gap-2 text-white/50">
                <CheckCircle2 className="w-4 h-4 text-neon-green" />
                <span className="text-neon-green font-semibold">{completedCount}</span>
                <span>/ {levels.length} cleared</span>
              </div>
              <div className="flex items-center gap-2 text-white/50">
                <Trophy className="w-4 h-4 text-cyber-amber" />
                <span className="text-cyber-amber font-semibold">{totalScore.toLocaleString()}</span>
                <span>pts</span>
              </div>
            </div>

            <button
              id="btn-leaderboard"
              onClick={() => navigate('/leaderboard')}
              className="btn-ghost text-sm py-2 px-4 flex items-center gap-2"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>

            <button
              id="btn-reset-progress"
              onClick={() => setShowResetModal(true)}
              title="Reset Lab Progress"
              className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5 hover:text-cyber-amber hover:border-cyber-amber/30"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyber-amber" />
              <span className="hidden sm:inline">Reset Lab</span>
            </button>

            <button
              id="btn-logout"
              onClick={handleLogout}
              title="Logout"
              className="btn-icon"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Hero stats */}
        <div className="mb-10 flex flex-col sm:flex-row gap-4">
          {/* Progress card */}
          <div className="flex-1 glass rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-mono text-xs text-white/30 uppercase tracking-widest mb-1">Training Progress</p>
                <p className="font-mono font-bold text-white text-lg">{user?.username || 'Agent'}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-bold text-neon-green">{progressPct}%</p>
                <p className="font-mono text-xs text-white/30">complete</p>
              </div>
            </div>
            <div className="progress-bar h-2 mb-2">
              <div className="progress-fill h-full" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="font-mono text-xs text-white/30">{completedCount} of {levels.length} challenges cleared</p>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3 sm:w-auto w-full">
            {[
              { icon: Trophy, label: 'Total Score', value: totalScore.toLocaleString(), color: '#f59e0b' },
              { icon: Target, label: 'Completed', value: `${completedCount}/${levels.length}`, color: '#00ff88' },
              { icon: Zap, label: 'Remaining', value: `${levels.length - completedCount}`, color: '#a855f7' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="glass rounded-2xl p-4 flex flex-col justify-between flex-1 sm:w-32">
                <Icon className="w-4 h-4 mb-3" style={{ color }} />
                <div>
                  <p className="font-mono text-xl font-bold text-white">{value}</p>
                  <p className="font-mono text-[11px] text-white/30 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Level path */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 min-w-max">
            {levels.map((lvl, i) => (
              <React.Fragment key={lvl.id}>
                <button
                  id={`level-pill-${lvl.id}`}
                  onClick={() => lvl.unlocked && navigate(`/level/${lvl.id}`)}
                  disabled={!lvl.unlocked}
                  className="level-pill group"
                  title={lvl.title}
                >
                  <div
                    className={`level-pill-circle ${
                      lvl.completed ? 'completed' : lvl.unlocked ? 'unlocked' : 'locked'
                    }`}
                  >
                    {lvl.completed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : lvl.unlocked ? (
                      lvl.orderIndex
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                  </div>
                </button>
                {i < levels.length - 1 && (
                  <div
                    className="h-px w-5 flex-shrink-0 transition-all duration-500"
                    style={{
                      background: lvl.completed
                        ? 'linear-gradient(90deg, rgba(0,255,136,0.6), rgba(0,255,136,0.3))'
                        : 'rgba(255,255,255,0.08)',
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Level grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {levels.map((lvl, index) => (
            <div
              key={lvl.id}
              id={`level-card-${lvl.id}`}
              className={`level-card group ${lvl.completed ? 'completed' : ''} ${!lvl.unlocked ? 'locked' : ''}`}
              onClick={() => lvl.unlocked && navigate(`/level/${lvl.id}`)}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-mono text-xs text-white/25 uppercase tracking-widest">
                    Level {lvl.orderIndex}
                  </span>
                  <h2 className={`font-semibold text-base leading-snug mt-1 transition-colors duration-200 ${
                    lvl.completed
                      ? 'text-neon-green'
                      : lvl.unlocked
                        ? 'text-white group-hover:text-neon-green'
                        : 'text-white/30'
                  }`}>
                    {lvl.title.replace(`Level ${lvl.orderIndex}: `, '')}
                  </h2>
                </div>
                <div className="flex-shrink-0 ml-3 mt-1">
                  {lvl.completed ? (
                    <div className="w-8 h-8 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-neon-green" />
                    </div>
                  ) : lvl.unlocked ? (
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-neon-green/30 group-hover:bg-neon-green/5 transition-all duration-200">
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-neon-green transition-colors duration-200" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-white/20" />
                    </div>
                  )}
                </div>
              </div>

              {/* Objective */}
              <p className="text-white/40 text-xs font-mono leading-relaxed mb-4 line-clamp-2">
                {lvl.objective}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <VulnTag category={lvl.vulnCategory} />
                <DifficultyStars difficulty={lvl.difficulty} />
              </div>

              {/* Score row if completed */}
              {lvl.completed && (lvl.bestScore ?? 0) > 0 && (
                <div className="mt-4 pt-3 border-t border-neon-green/10 flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-cyber-amber flex-shrink-0" />
                  <span className="font-mono text-xs text-cyber-amber font-semibold">{lvl.bestScore?.toLocaleString()} pts</span>
                  {lvl.attemptCount && (
                    <span className="text-white/20 text-xs font-mono ml-auto">
                      {lvl.attemptCount} attempt{lvl.attemptCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Reset confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/85 backdrop-blur-md animate-fade-in">
          <div className="glass rounded-2xl p-8 w-full max-w-md mx-4 shadow-glass animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyber-amber/10 border border-cyber-amber/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-cyber-amber" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-white text-base">Reset All Lab Progress?</h3>
                  <p className="font-mono text-xs text-white/30">Action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="btn-icon w-8 h-8"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-mono text-sm text-white/60 leading-relaxed mb-6">
              This will clear all your completed levels, scores, total attempts, and conversation history so you can replay the training range from Level 1.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="btn-ghost flex-1 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleResetProgress}
                disabled={resetting}
                className="btn-neon-solid flex-1 py-2.5 text-sm bg-cyber-amber text-navy-900 hover:bg-amber-400 border-none disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
