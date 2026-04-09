import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, UserPlus, Fingerprint, Vote, FileCheck, BarChart3 } from 'lucide-react';

interface Step {
  title: string;
  description: string;
  icon: any;
  color: string;
  details: string[];
}

const STEPS: Step[] = [
  {
    title: "Registration",
    description: "Get your official Voter Card",
    icon: UserPlus,
    color: "bg-blue-500",
    details: [
      "Sign in with your Google account",
      "Provide your full name and school",
      "Download your unique digital Voter Card"
    ]
  },
  {
    title: "Verification",
    description: "Physical ID Confirmation",
    icon: Fingerprint,
    color: "bg-purple-500",
    details: [
      "The Presiding Officer verifies your identity",
      "Indelible ink is applied to your index finger",
      "This prevents multiple voting and ensures integrity"
    ]
  },
  {
    title: "Electronic Voting",
    description: "Cast your vote on the EVM",
    icon: Vote,
    color: "bg-indigo-500",
    details: [
      "Enter the private voting compartment",
      "Press the blue button next to your candidate",
      "Wait for the long beep to confirm registration"
    ]
  },
  {
    title: "VVPAT Audit",
    description: "Verify your choice visually",
    icon: FileCheck,
    color: "bg-emerald-500",
    details: [
      "The VVPAT screen displays your selected candidate",
      "The slip is visible for 7 seconds",
      "It then drops into a secure box for manual auditing"
    ]
  },
  {
    title: "Counting & Results",
    description: "How every vote matters",
    icon: BarChart3,
    color: "bg-amber-500",
    details: [
      "Votes are stored securely in the encrypted database",
      "The system aggregates totals in real-time",
      "Results are published only after official verification"
    ]
  }
];

export const VotingGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => currentStep < STEPS.length - 1 && setCurrentStep(s => s + 1);
  const prev = () => currentStep > 0 && setCurrentStep(s => s - 1);

  const step = STEPS[currentStep];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gray-950/95 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="max-w-2xl w-full bg-gray-900 rounded-[2.5rem] border border-gray-800 shadow-2xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-6 flex justify-between items-center border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${step.color} bg-opacity-20`}>
              <step.icon className={`w-6 h-6 ${step.color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Voting Guide</h3>
              <p className="text-gray-500 text-xs uppercase tracking-widest">Step {currentStep + 1} of {STEPS.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="text-3xl font-black text-white mb-2">{step.title}</h2>
                <p className="text-indigo-400 font-medium">{step.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {step.details.map((detail, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="flex items-start gap-4 bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{detail}</p>
                  </motion.div>
                ))}
              </div>

              {/* Visual Representation (Abstract) */}
              <div className="h-32 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className={`w-24 h-24 rounded-3xl ${step.color} bg-opacity-10 flex items-center justify-center border-2 border-dashed ${step.color.replace('bg-', 'border-')}`}
                >
                  <step.icon className={`w-12 h-12 ${step.color.replace('bg-', 'text-')}`} />
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 bg-gray-800/30 border-t border-gray-800 flex items-center justify-between">
          <button 
            onClick={prev}
            disabled={currentStep === 0}
            className="flex items-center gap-2 text-gray-400 hover:text-white disabled:opacity-0 transition-all font-bold"
          >
            <ChevronLeft /> Previous
          </button>

          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div 
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? `w-8 ${step.color}` : 'w-1.5 bg-gray-700'}`}
              />
            ))}
          </div>

          <button 
            onClick={currentStep === STEPS.length - 1 ? onClose : next}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${currentStep === STEPS.length - 1 ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-indigo-400 hover:text-white'}`}
          >
            {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
