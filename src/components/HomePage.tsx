import React from 'react';
import { UserPlus, Vote, BarChart3, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { VoterCard } from './VoterCard';

interface HomePageProps {
  onNavigate: (page: 'register' | 'vote' | 'results' | 'admin') => void;
  isAdmin?: boolean;
  profile?: { name: string, school: string } | null;
  user?: any;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, isAdmin, profile, user }) => {
  const options = [
    { id: 'register', label: 'Register', icon: UserPlus, color: 'from-blue-500 to-blue-700' },
    { id: 'vote', label: 'Vote', icon: Vote, color: 'from-indigo-500 to-indigo-700' },
    { id: 'results', label: 'Live Results', icon: BarChart3, color: 'from-emerald-500 to-emerald-700' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {profile && user && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-12 text-center"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Hi, {profile.name}!</h2>
          <VoterCard 
            name={profile.name}
            school={profile.school}
            photoURL={user.photoURL || ''}
            voterId={user.uid.slice(0, 8).toUpperCase()}
            showDownload={true}
          />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
        {options.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onNavigate(option.id)}
            className={`group relative overflow-hidden rounded-2xl p-6 h-32 flex flex-row items-center justify-start gap-4 bg-gradient-to-br ${option.color} transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/20`}
          >
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <option.icon className="w-10 h-10 text-white" strokeWidth={1.5} />
            <span className="text-lg font-semibold text-white tracking-wide">{option.label}</span>
          </motion.button>
        ))}
      </div>

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
    </div>
  );
};
