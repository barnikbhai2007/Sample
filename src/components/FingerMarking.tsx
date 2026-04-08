import React, { useState, useEffect, useRef } from 'react';
import { Check, Paintbrush } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FingerMarking: React.FC<{onComplete: () => void}> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [inkPoints, setInkPoints] = useState<number>(0);
  const targetPoints = 100; // Slightly reduced for better mobile feel

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set internal resolution (fixed for coordinate mapping)
    canvas.width = 300;
    canvas.height = 400;
    
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#1e1b4b'; 
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDone) return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isDone) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Map screen coordinates to fixed canvas resolution
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    // Target: Index Finger area (adjusted for refined organic paths)
    // Index finger is roughly at x: 110-170, y: 30-210
    if (x > 105 && x < 175 && y > 25 && y < 215) {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      setInkPoints(prev => {
        const next = prev + 1;
        const newProgress = Math.min((next / targetPoints) * 100, 100);
        setProgress(newProgress);
        if (newProgress >= 100 && !isDone) {
          setIsDone(true);
          setTimeout(onComplete, 2000);
        }
        return next;
      });
    } else {
      ctx.beginPath(); 
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-gray-950 rounded-3xl border border-gray-800 shadow-2xl w-full max-w-md mx-auto overflow-hidden">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Voter Verification</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="h-px w-8 bg-indigo-500/30"></span>
          <p className="text-indigo-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">Indelible Ink</p>
          <span className="h-px w-8 bg-indigo-500/30"></span>
        </div>
      </div>
      
      <div className="relative w-full max-w-[280px] aspect-[3/4] flex items-center justify-center mb-8 bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] border border-gray-800 shadow-[0_0_40px_rgba(0,0,0,0.5),inset_0_2px_20px_rgba(0,0,0,0.8)] overflow-hidden cursor-crosshair group">
        {/* Border Glow */}
        <div className="absolute inset-0 rounded-[2.5rem] border border-indigo-500/10 pointer-events-none"></div>
        
        {/* Atmospheric Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none"></div>
        
        {/* Realistic Hand Silhouette with better curves */}
        <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-700 group-hover:opacity-100">
          <defs>
            <radialGradient id="handGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="40%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>
            <filter id="handShadow">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.5"/>
            </filter>
            <filter id="skinTexture" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
              <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
            </filter>
          </defs>
          
          <g filter="url(#handShadow)" fill="url(#handGradient)">
            <g filter="url(#skinTexture)">
              {/* Wrist and Palm Base */}
              <path d="M70,400 C70,400 65,340 65,300 C65,260 75,230 95,215 C115,200 185,200 205,215 C225,230 235,260 235,300 C235,340 230,400 230,400 L70,400 Z" />
              
              {/* Inner Glow Stroke */}
              <path d="M70,400 C70,400 65,340 65,300 C65,260 75,230 95,215 C115,200 185,200 205,215 C225,230 235,260 235,300 C235,340 230,400 230,400 L70,400 Z" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="2" />
              
              {/* Thumb */}
              <path d="M85,230 C65,225 35,210 30,180 C25,150 50,135 75,155 C90,170 100,205 105,220" />
              <path d="M35,175 Q32,165 40,155 Q48,145 55,160" fill="rgba(255,255,255,0.05)" /> {/* Thumb nail */}
              
              {/* Index Finger (Target) */}
              <motion.path 
                d="M110,210 C110,160 105,90 120,60 C135,30 155,30 165,60 C175,90 170,160 170,210" 
                className={`${isDone ? 'opacity-30' : 'opacity-100'} transition-opacity duration-500`}
                animate={isDrawing && !isDone ? { scale: [1, 1.01, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <path d="M125,65 Q140,40 155,65" fill="rgba(255,255,255,0.05)" /> {/* Index nail */}
              
              {/* Middle Finger */}
              <path d="M175,210 C175,150 180,70 195,40 C210,10 230,10 240,40 C250,70 245,150 245,210" />
              <path d="M195,45 Q215,20 235,45" fill="rgba(255,255,255,0.05)" /> {/* Middle nail */}
              
              {/* Ring Finger */}
              <path d="M250,215 C250,170 255,100 270,70 C285,40 300,50 305,80 C310,110 295,170 285,215" />
              <path d="M270,75 Q285,55 300,75" fill="rgba(255,255,255,0.05)" /> {/* Ring nail */}
            </g>
            
            {/* Hand Creases */}
            <g stroke="rgba(255,255,255,0.03)" strokeWidth="1" fill="none">
              <path d="M100,230 Q130,220 160,235" />
              <path d="M110,250 Q140,240 180,260" />
              <path d="M90,280 Q120,270 150,290" />
              {/* Finger joints */}
              <path d="M115,140 Q135,135 155,140" />
              <path d="M180,140 Q205,135 230,140" />
              <path d="M255,150 Q275,145 295,150" />
            </g>
          </g>
          
          {/* Highlight for Index Finger - Subtle pulse */}
          {!isDone && (
            <motion.path 
              d="M110,210 C110,160 105,90 120,60 C135,30 155,30 165,60 C175,90 170,160 170,210" 
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeDasharray="10 10"
              animate={{ strokeDashoffset: [0, -40], opacity: [0.2, 0.6, 0.2] }}
              transition={{ 
                strokeDashoffset: { repeat: Infinity, duration: 2, ease: "linear" },
                opacity: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
              }}
            />
          )}
        </svg>

        {/* Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 z-10"
        />

        {/* Success Overlay */}
        <AnimatePresence>
          {isDone && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-30 bg-indigo-950/40 flex flex-col items-center justify-center backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="bg-green-500 p-6 rounded-full shadow-[0_0_40px_rgba(34,197,94,0.6)] border-4 border-white/20"
              >
                <Check className="text-white w-14 h-14 stroke-[3]" />
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-center"
              >
                <p className="text-white font-black text-xl tracking-[0.2em] uppercase">Verified</p>
                <p className="text-indigo-200 text-[10px] font-medium uppercase tracking-widest mt-1 opacity-80">Physical ID Confirmed</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Brush Tooltip */}
        {!isDone && !isDrawing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-[18%] left-[40%] pointer-events-none z-20 flex flex-col items-center gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-40 animate-pulse"></div>
              <div className="relative bg-indigo-600 p-2.5 rounded-2xl shadow-2xl border border-indigo-400/30 animate-bounce">
                <Paintbrush size={22} className="text-white" />
              </div>
            </div>
            <div className="bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/5 shadow-2xl">
              <span className="text-[9px] sm:text-[11px] text-white font-bold tracking-[0.15em] uppercase">
                Mark Finger
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="w-full space-y-4 px-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Verification Progress</span>
          <span className="text-indigo-400 font-mono font-bold text-sm">{Math.round(progress)}%</span>
        </div>
        
        <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800 p-0.5 shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-indigo-700 via-indigo-500 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }} 
          />
        </div>
        
        <div className="bg-indigo-950/10 border border-indigo-500/10 p-4 rounded-2xl backdrop-blur-sm">
          <p className="text-[10px] sm:text-[11px] text-indigo-300/80 leading-relaxed text-center font-medium">
            {isDone 
              ? "Identity physically verified. Proceeding to the Electronic Voting Machine." 
              : "Apply the indelible ink to your left index finger to confirm your physical presence."}
          </p>
        </div>
      </div>
    </div>
  );
};
