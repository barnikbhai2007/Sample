import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface VVPATProps {
  candidateName: string;
  candidateLogo: string;
  onComplete: () => void;
}

export const VVPATComponent: React.FC<VVPATProps> = ({ candidateName, candidateLogo, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 5000); // Show for 5 seconds
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-md mx-auto text-center">
      <h2 className="text-xl font-bold text-white mb-6">VVPAT Audit Trail</h2>
      <div className="bg-gray-100 p-8 rounded-xl border-4 border-gray-400 relative overflow-hidden">
        {/* Glass effect */}
        <div className="absolute inset-0 bg-white/10 pointer-events-none"></div>
        
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white p-6 rounded shadow-lg border border-gray-300 inline-block"
        >
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">Voter Slip</div>
          <img 
            src={candidateLogo} 
            alt={candidateName} 
            className="w-24 h-24 object-contain mx-auto mb-4" 
            referrerPolicy="no-referrer"
          />
          <div className="text-lg font-bold text-gray-900">{candidateName}</div>
          <div className="mt-4 pt-4 border-t border-dashed border-gray-300 text-[10px] text-gray-400">
            SECURED VOTE • 2026 ELECTION
          </div>
        </motion.div>

        {/* Animation of the slip falling */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ times: [0, 0.1, 0.9, 1], duration: 5 }}
          className="mt-6 text-sm font-medium text-gray-600"
        >
          Verifying your choice...
        </motion.div>
      </div>
      <p className="text-gray-500 text-xs mt-4 italic">
        The slip will be visible for 5 seconds before being securely deposited.
      </p>
    </div>
  );
};
