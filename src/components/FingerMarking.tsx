import React, { useState, useEffect } from 'react';
import { Fingerprint, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FingerMarking: React.FC<{onComplete: () => void}> = ({ onComplete }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isHolding && !isDone) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsDone(true);
            setTimeout(onComplete, 2000);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isHolding, isDone, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-8">Voter Marking</h2>
      
      <div className="relative w-48 h-64 flex items-center justify-center mb-8">
        {/* Hand/Finger Silhouette */}
        <svg viewBox="0 0 100 120" className="w-full h-full text-gray-700 fill-current">
          <path d="M30,100 Q30,40 40,30 Q45,20 55,30 Q65,40 65,100" />
          {/* Pinky Finger */}
          <motion.path 
            d="M75,100 Q75,60 80,55 Q85,50 90,55 Q95,60 95,100" 
            className="text-gray-600"
          />
          {/* Ink Marking on Pinky */}
          <motion.path 
            d="M80,55 Q85,50 90,55"
            fill="none"
            stroke="#1e1b4b"
            strokeWidth="10"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress / 100 }}
            className="drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]"
          />
        </svg>

        {/* Scanner Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
                animate={{ 
                    scale: isHolding ? 1.1 : 1,
                    opacity: isDone ? 0 : 1
                }}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors ${isHolding ? 'bg-indigo-600/20 border-2 border-indigo-500' : 'bg-gray-800 border-2 border-gray-700'}`}
                onMouseDown={() => setIsHolding(true)}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={() => setIsHolding(true)}
                onTouchEnd={() => setIsHolding(false)}
            >
                <AnimatePresence mode="wait">
                    {isDone ? (
                        <motion.div
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-green-500 p-2 rounded-full"
                        >
                            <Check className="text-white w-8 h-8" />
                        </motion.div>
                    ) : (
                        <Fingerprint className={`w-12 h-12 transition-colors ${isHolding ? 'text-indigo-400' : 'text-gray-500'}`} />
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-gray-300 font-medium">
            {isDone ? "Finger Marked Successfully!" : isHolding ? "Applying Indelible Ink..." : "Hold to Apply Ink"}
        </p>
        <p className="text-xs text-gray-500 uppercase tracking-widest">
            {isDone ? "Redirecting to EVM..." : `Progress: ${Math.round(progress)}%`}
        </p>
      </div>

      <div className="w-full h-1.5 bg-gray-800 rounded-full mt-8 overflow-hidden">
        <motion.div 
          className="h-full bg-indigo-500" 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
};
