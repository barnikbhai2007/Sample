import React, { useState, useEffect } from 'react';
import { UserPlus, Vote, BarChart3, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoterCard } from './VoterCard';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { VotingGuide } from './VotingGuide';
import { HelpCircle, Bot } from 'lucide-react';
import { ScrollingReviews } from './ScrollingReviews';
import { AIChatbot } from './AIChatbot';

interface HomePageProps {
  onNavigate: (page: 'register' | 'vote' | 'results' | 'admin') => void;
  isAdmin?: boolean;
  profile?: { name: string, school: string } | null;
  user?: any;
  onSecretClick?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, isAdmin, profile, user, onSecretClick }) => {
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [settings, setSettings] = useState({ registrationEnabled: true, votingEnabled: true, resultsEnabled: true });
  const [showGuide, setShowGuide] = useState(false);
  const [guideSource, setGuideSource] = useState<'button' | 'vote' | null>(null);

  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, 'stats', 'global'), (snap) => {
      if (snap.exists()) {
        setVisitCount(snap.data().visitCount);
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          registrationEnabled: data.registrationEnabled ?? true,
          votingEnabled: data.votingEnabled ?? true,
          resultsEnabled: data.resultsEnabled ?? true,
        });
      }
    });

    return () => {
      unsubStats();
      unsubSettings();
    };
  }, []);

  const options = [
    { id: 'register', label: 'Register', icon: UserPlus, color: 'from-blue-500 to-blue-700', enabled: settings.registrationEnabled },
    { id: 'vote', label: 'Vote', icon: Vote, color: 'from-indigo-500 to-indigo-700', enabled: settings.votingEnabled },
    { id: 'results', label: 'Live Results', icon: BarChart3, color: 'from-emerald-500 to-emerald-700', enabled: settings.resultsEnabled },
  ] as const;

  const handleOptionClick = (id: 'register' | 'vote' | 'results') => {
    if (id === 'vote') {
      setGuideSource('vote');
      setShowGuide(true);
    } else {
      onNavigate(id);
    }
  };

  const handleGuideClose = () => {
    setShowGuide(false);
    setGuideSource(null);
  };

  const handleGuideFinish = () => {
    if (guideSource === 'vote') {
      onNavigate('vote');
    }
    handleGuideClose();
  };

  const visibleOptions = options.filter(o => o.enabled || isAdmin);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full mb-8">
        <ScrollingReviews />
      </div>
      {profile && user && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-12 text-center"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Hi, {profile.name}!</h2>
          <VoterCard 
            name={profile.name}
            school={profile.school === 'others' ? profile.customSchool : profile.school}
            photoURL={user.photoURL || ''}
            voterId={profile.voterId}
            showDownload={true}
          />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
        {visibleOptions.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleOptionClick(option.id)}
            className={`group relative overflow-hidden rounded-2xl p-6 h-32 flex flex-row items-center justify-start gap-4 bg-gradient-to-br ${option.color} transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/20 ${!option.enabled && isAdmin ? 'opacity-50 grayscale-[0.5]' : ''}`}
          >
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <option.icon className="w-10 h-10 text-white" strokeWidth={1.5} />
            <div className="flex flex-col items-start">
              <span className="text-lg font-semibold text-white tracking-wide">{option.label}</span>
              {!option.enabled && isAdmin && <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Disabled for users</span>}
            </div>
          </motion.button>
        ))}
      </div>

      <div className="flex flex-col gap-4 items-center">
        {isAdmin && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => onNavigate('admin')}
            className="flex items-center gap-2 text-gray-500 hover:text-indigo-400 transition-colors font-medium"
          >
            <Settings size={18} /> Admin Panel
          </motion.button>
        )}

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            setGuideSource('button');
            setShowGuide(true);
          }}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors font-bold bg-indigo-500/10 px-6 py-2 rounded-full border border-indigo-500/20"
        >
          <HelpCircle size={18} /> How to Vote?
        </motion.button>
      </div>

      <AnimatePresence>
        {showGuide && (
          <VotingGuide 
            onClose={handleGuideClose} 
            onFinish={handleGuideFinish}
            onSecretClick={onSecretClick} 
          />
        )}
      </AnimatePresence>

      {profile && <AIChatbot />}

      <div className="mt-auto py-8 text-center text-gray-600 text-sm">
        <p>Voting panel made by Barnik</p>
        {visitCount !== null && <p className="mt-1">Total visits: {visitCount}</p>}
      </div>
    </div>
  );
};
