import React, { useState, useEffect } from 'react';
import { Loader2, Send, Vote, User, School, CheckCircle2, AlertCircle, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { VoterCard } from './VoterCard';
import { TypingMessage } from './TypingMessage';
import { EVMComponent } from './EVMComponent';
import { FingerMarking } from './FingerMarking';
import { VVPATComponent } from './VVPATComponent';

export const VotingFlow: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    {role: 'assistant', text: 'Hello, I am Presiding Officer Yuvraj. Please provide your Name to start.'}
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [step, setStep] = useState<'name' | 'school' | 'login' | 'card' | 'finger-ask' | 'finger-marking' | 'evm' | 'vvpat' | 'reason' | 'complete'>('name');
  const [userInfo, setUserInfo] = useState({name: '', school: ''});
  const [user, setUser] = useState<any>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<{name: string, logo: string} | null>(null);
  const [voteReason, setVoteReason] = useState('');
  const [rating, setRating] = useState(0);
  const [votingEnabled, setVotingEnabled] = useState<boolean | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      setVotingEnabled(doc.exists() ? doc.data().votingEnabled : false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    setMessages(prev => [...prev, {role: 'user', text}]);
    setLoading(true);
    
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (step === 'name') {
      setUserInfo(prev => ({...prev, name: text}));
      setMessages(prev => [...prev, {role: 'assistant', text: 'Thank you. Now, please provide your School.'}]);
      setStep('school');
    } else if (step === 'school') {
      setUserInfo(prev => ({...prev, school: text}));
      setMessages(prev => [...prev, {role: 'assistant', text: 'Thank you. Now, please login with your registered Google account to verify your identity.'}]);
      setStep('login');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Simulate verification delay
      setMessages(prev => [...prev, {role: 'assistant', text: 'Authenticating...'}]);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        
        // Check if already voted (bypass cache to ensure reset works immediately)
        const voteSnap = await getDocFromServer(doc(db, 'votes', user.uid));
        if (voteSnap.exists()) {
          setAlreadyVoted(true);
          setMessages(prev => [...prev, {role: 'assistant', text: 'Verification complete. However, our records show you have already cast your vote in this election.'}]);
          setStep('complete');
          return;
        }

        setUser({...user, voterId: data.voterId});
        setUserInfo({
          name: data.name || userInfo.name,
          school: data.school || userInfo.school
        });
        setMessages(prev => [...prev, {role: 'assistant', text: 'Identity verified. Loading your digital voter card...'}]);
        setStep('card');
      } else {
        setMessages(prev => [...prev, {role: 'assistant', text: 'Access denied. Your account is not registered in our voter database.'}]);
      }
    } catch (err: any) {
      console.error('Login/Verification error:', err);
      let errorMessage = 'An error occurred during login. Please try again.';
      if (err.message && err.message.includes('permission-denied')) {
        errorMessage = 'Permission denied while verifying your records. Please contact the administrator.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login popup was closed. Please try again.';
      }
      setMessages(prev => [...prev, {role: 'assistant', text: errorMessage}]);
    } finally {
      setLoading(false);
    }
  };

  const triggerTransition = (nextStep: typeof step) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setTransitioning(false);
    }, 1500);
  };

  const handleVote = async (candidateId: string) => {
    setSelectedCandidate(candidateId);
    
    // Fetch candidate details for VVPAT
    try {
      const candSnap = await getDoc(doc(db, 'candidates', candidateId));
      if (candSnap.exists()) {
        const data = candSnap.data();
        setCandidateDetails({ name: data.name, logo: data.logoUrl });
      }
    } catch (err) {
      console.error("Error fetching candidate for VVPAT:", err);
    }
    
    triggerTransition('vvpat');
  };

  const submitVote = async () => {
    if (!user || !selectedCandidate) return;
    setLoading(true);
    try {
      const voteData = {
        voterId: user.uid,
        candidateId: selectedCandidate,
        voterName: userInfo.name,
        voterSchool: userInfo.school,
        reason: voteReason || '',
        rating: rating || 0,
        timestamp: serverTimestamp()
      };
      
      console.log('Submitting vote:', voteData);
      await setDoc(doc(db, 'votes', user.uid), voteData);
      triggerTransition('complete');
    } catch (err: any) {
      console.error('Vote submission error:', err);
      let errorMessage = 'An error occurred while submitting your vote. Please try again.';
      
      if (err.message && err.message.includes('permission-denied')) {
        errorMessage = 'Permission denied. Please ensure you are logged in correctly and haven\'t already voted.';
      }
      
      setMessages(prev => [...prev, {role: 'assistant', text: errorMessage}]);
    } finally {
      setLoading(false);
    }
  };

  if (votingEnabled === false) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Voting is Closed</h2>
          <p className="text-gray-400">The voting process has either not started yet or has been concluded by the administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {transitioning ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            <p className="text-indigo-300 font-medium">Processing...</p>
          </motion.div>
        ) : (
          <motion.div 
            key={step === 'finger-marking' || step === 'evm' || step === 'reason' || step === 'complete' ? step : 'chat-flow'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            {(step === 'name' || step === 'school' || step === 'login' || step === 'card' || step === 'finger-ask') && (
              <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex flex-col h-[80vh]">
                <div className="p-4 border-b border-gray-800 font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500 shrink-0">
                    <img 
                      src="https://res.cloudinary.com/speed-searches/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1775748565/IMG-20260409-WA0024_aznvrb.jpg" 
                      alt="Officer" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm">Presiding Officer</span>
                    <span className="text-xs text-indigo-400">Yuvraj</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-700 shrink-0">
                        <img 
                          src={m.role === 'assistant' 
                            ? "https://res.cloudinary.com/speed-searches/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1775748565/IMG-20260409-WA0024_aznvrb.jpg"
                            : (auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${userInfo.name || 'User'}&background=indigo&color=fff`)
                          } 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className={`p-3 rounded-2xl max-w-[80%] ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                        {m.role === 'assistant' ? <TypingMessage text={m.text} /> : m.text}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-indigo-500 text-sm italic">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Yuvraj is typing...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                {(step === 'name' || step === 'school') && (
                  <div className="p-4 border-t border-gray-800 flex gap-2">
                    <input 
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      className="flex-1 bg-gray-800 rounded-xl px-4 py-2 text-white"
                      placeholder={step === 'name' ? "Enter Name" : "Enter School"}
                    />
                    <button onClick={() => {sendMessage(input); setInput('')}} className="bg-indigo-600 p-2 rounded-xl text-white"><Send /></button>
                  </div>
                )}
                
                {step === 'login' && (
                  <div className="p-4 border-t border-gray-800">
                    <button onClick={handleLogin} className="w-full bg-white text-gray-900 p-3 rounded-xl font-bold">Login with Google</button>
                  </div>
                )}

                {step === 'card' && user && (
                  <div className="p-4 border-t border-gray-800 text-center space-y-4">
                    <VoterCard 
                      name={userInfo.name} 
                      school={userInfo.school} 
                      photoURL={user.photoURL || ''} 
                      voterId={user.voterId || user.uid.slice(0, 8).toUpperCase()} 
                      showDownload={false} 
                    />
                    <button 
                      onClick={async () => {
                        setLoading(true);
                        setMessages(prev => [...prev, {role: 'assistant', text: 'Verifying your voter card details...'}]);
                        // Simulate verification delay
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        setLoading(false);
                        setMessages(prev => [...prev, {role: 'assistant', text: 'Voter card verified. Please proceed to finger marking.'}]);
                        setStep('finger-ask');
                      }} 
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Verify Card'}
                    </button>
                  </div>
                )}

                {step === 'finger-ask' && (
                  <div className="p-4 border-t border-gray-800">
                    <button 
                      onClick={() => triggerTransition('finger-marking')} 
                      className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold"
                    >
                      Proceed to Finger Marking
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 'finger-marking' && (
              <FingerMarking onComplete={() => triggerTransition('evm')} />
            )}

            {step === 'evm' && (
              <EVMComponent onVote={handleVote} />
            )}

            {step === 'vvpat' && candidateDetails && (
              <VVPATComponent 
                candidateName={candidateDetails.name} 
                candidateLogo={candidateDetails.logo} 
                onComplete={() => triggerTransition('reason')} 
              />
            )}

            {step === 'reason' && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">Rate your experience</h2>
                <div className="flex gap-2 mb-6 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-full transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-600'}`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
                <h2 className="text-xl font-bold text-white mb-4">Why did you vote for this candidate?</h2>
                <textarea 
                  value={voteReason}
                  onChange={e => setVoteReason(e.target.value)}
                  className="w-full h-32 bg-gray-800 rounded-xl p-4 text-white mb-4 border border-gray-700 focus:border-indigo-500 outline-none"
                  placeholder="Tell us the reason for your choice..."
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setVoteReason('No reason provided'); submitVote(); }}
                    className="flex-1 bg-gray-800 text-gray-400 p-3 rounded-xl font-bold hover:bg-gray-700"
                  >
                    Skip
                  </button>
                  <button 
                    onClick={submitVote}
                    disabled={rating === 0 || loading}
                    className="flex-[2] bg-indigo-600 text-white p-3 rounded-xl font-bold disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : "Confirm Vote"}
                  </button>
                </div>
              </div>
            )}

            {step === 'complete' && (
              <div className="bg-gray-900 rounded-2xl p-8 text-center text-white border border-gray-800 shadow-2xl">
                {alreadyVoted ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-10 h-10 text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-bold">Already Voted</h2>
                    <p className="text-gray-400 mt-2 mb-6">Our records show that you have already participated in this election. Each voter is allowed only one vote.</p>
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold">Your vote has been registered!</h2>
                    <p className="text-gray-400 mt-2 mb-6">Thank you for participating in the democratic process.</p>
                  </>
                )}
                <button 
                  onClick={onBack} 
                  className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold"
                >
                  Back to Home
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
