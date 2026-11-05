import React, { useEffect, useState } from 'react';
import { Shield, Server, Terminal, Cpu, CheckCircle2, RotateCw, Sparkles, ChevronRight } from 'lucide-react';

interface SplashScreenProps {
  isLoading: boolean;
  onFinish?: () => void;
  minDisplayTimeMs?: number;
}

const SPLASH_STEPS = [
  { text: 'Inicializando entorno de aislamiento efímero...', icon: Shield, delay: 250 },
  { text: 'Cargando suite de ataques CB-001 a CB-006...', icon: Terminal, delay: 650 },
  { text: 'Conectando con Vultr Serverless Inference...', icon: Server, delay: 1100 },
  { text: 'Verificando controles deterministas de contención...', icon: Cpu, delay: 1550 },
  { text: 'Sistema listo para pruebas de choque.', icon: CheckCircle2, delay: 1950 },
];

export function SplashScreen({
  isLoading,
  onFinish,
  minDisplayTimeMs = 2100,
}: SplashScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isUnmounted, setIsUnmounted] = useState(false);

  useEffect(() => {
    // Progress and step sequence timer
    const stepTimers = SPLASH_STEPS.map((step, idx) => {
      return setTimeout(() => {
        setStepIndex(idx);
        setProgress(Math.round(((idx + 1) / SPLASH_STEPS.length) * 95));
      }, step.delay);
    });

    // Minimum display timer
    const finishTimer = setTimeout(() => {
      if (!isLoading) {
        completeSplash();
      }
    }, minDisplayTimeMs);

    return () => {
      stepTimers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
  }, []);

  // When API finishes loading after minDisplayTime
  useEffect(() => {
    if (!isLoading && stepIndex >= SPLASH_STEPS.length - 2) {
      completeSplash();
    }
  }, [isLoading, stepIndex]);

  const completeSplash = () => {
    setProgress(100);
    setStepIndex(SPLASH_STEPS.length - 1);
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
      const unmountTimer = setTimeout(() => {
        setIsUnmounted(true);
        if (onFinish) onFinish();
      }, 700);
      return () => clearTimeout(unmountTimer);
    }, 400);

    return () => clearTimeout(fadeTimer);
  };

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsUnmounted(true);
      if (onFinish) onFinish();
    }, 400);
  };

  if (isUnmounted) return null;

  const currentStep = SPLASH_STEPS[stepIndex] || SPLASH_STEPS[0];
  const StepIcon = currentStep.icon;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 select-none overflow-hidden transition-all duration-700 ease-in-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Cyber Ambient Glow & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main Center Content */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6 text-center">
        {/* Animated Glowing Shield Logo */}
        <div className="relative mb-6 group">
          {/* Ambient Glow */}
          <div className="absolute -inset-3 bg-gradient-to-r from-teal-500/30 via-cyan-400/30 to-blue-500/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse" />

          {/* Icon Box */}
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-tr from-teal-500 via-cyan-400 to-blue-500 flex items-center justify-center shadow-2xl shadow-teal-500/40 border border-teal-300/30">
            <Shield className="h-11 w-11 text-slate-950 stroke-[2.5]" />
          </div>

          {/* Sub badge */}
          <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-teal-500/50 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold text-teal-300 shadow-md">
            v0.1
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1.5 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            ContainBench
          </h1>
          <p className="text-sm font-semibold text-teal-400/90 tracking-wide uppercase font-mono text-[11px]">
            Crash-test your AI agent before production
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed pt-1">
            Plataforma de contención adversarial y auditoría forense para agentes autónomos.
          </p>
        </div>

        {/* Dynamic Progress Card */}
        <div className="w-full bg-slate-900/80 backdrop-blur border border-slate-800/90 rounded-2xl p-5 shadow-2xl shadow-cyan-950/30 space-y-4">
          {/* Progress Header */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-2 text-slate-300 font-semibold truncate">
              <StepIcon className="h-3.5 w-3.5 text-teal-400 shrink-0 animate-pulse" />
              <span className="truncate">{currentStep.text}</span>
            </span>
            <span className="text-teal-400 font-bold shrink-0 ml-2">{progress}%</span>
          </div>

          {/* Glowing Progress Track */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
            <div
              className="bg-gradient-to-r from-teal-500 via-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500 ease-out shadow-lg shadow-teal-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Mini Security Badges */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
            <div className="flex items-center justify-center gap-1 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Docker Cgroups</span>
            </div>
            <div className="flex items-center justify-center gap-1 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>Vultr Inference</span>
            </div>
            <div className="flex items-center justify-center gap-1 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              <span>Canary Secrets</span>
            </div>
          </div>
        </div>

        {/* Skip button for instant enter */}
        <button
          onClick={handleSkip}
          className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-900/60 border border-transparent hover:border-slate-800"
        >
          <span>Saltar intro e ir al Dashboard</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-6 flex items-center gap-2 text-[11px] font-mono text-slate-500">
        <Server className="h-3.5 w-3.5 text-teal-400/80" />
        <span>Vultr Cloud & Serverless Inference Architecture</span>
      </div>
    </div>
  );
}

