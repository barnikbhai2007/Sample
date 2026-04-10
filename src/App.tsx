/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, increment, onSnapshot, runTransaction } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, LogOut, Loader2, ShieldCheck } from 'lucide-react';
import { VoterCard } from './components/VoterCard';
import { HomePage } from './components/HomePage';
import { VotingFlow } from './components/VotingFlow';
import { FingerMarking } from './components/FingerMarking';
import { AdminPanel } from './components/AdminPanel';
import { Results } from './components/Results';
import { Chatbot } from './components/Chatbot';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const SCHOOLS = [
  "Sudarshanpur DPU Vidyachakra",
  "Raiganj Coronation High School",
  "Raiganj Girls High School",
  "Raiganj Sri Sri Ramkrishna Vidyabhaban",
  "others"
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ registrationEnabled: true, votingEnabled: true, resultsEnabled: true });
  const [profile, setProfile] = useState<{name: string, school: string, customSchool: string, voterId: string} | null>(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmergencyAdmin, setIsEmergencyAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [form, setForm] = useState({ name: '', school: '', customSchool: '' });
  const [page, setPage] = useState<'home' | 'register' | 'vote' | 'results' | 'finger-verification' | 'admin'>(
    (new URLSearchParams(window.location.search).get('page') as any) || 'home'
  );

  const getClientData = async () => {
    let ip = 'unknown';
    let country = 'unknown';
    
    const fetchIP = async (url: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return await res.json();
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    };

    try {
      // Primary: ipapi.co (includes country)
      const data = await fetchIP('https://ipapi.co/json/');
      ip = data.ip || 'unknown';
      country = data.country_name || 'unknown';
    } catch (e) {
      console.warn('Primary IP service failed, trying fallback 1...');
      try {
        // Fallback 1: ipify (IPv4/IPv6)
        const data = await fetchIP('https://api64.ipify.org?format=json');
        ip = data.ip || 'unknown';
      } catch (e2) {
        console.warn('Fallback 1 failed, trying fallback 2...');
        try {
          // Fallback 2: icanhazip
          const res = await fetch('https://icanhazip.com');
          ip = (await res.text()).trim();
        } catch (e3) {
          console.error('All IP services failed', e3);
        }
      }
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      (navigator as any).hardwareConcurrency || 'unknown',
      (navigator as any).deviceMemory || 'unknown'
    ].join('|');

    // Simple but robust hash for fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const fpId = Math.abs(hash).toString(36);
    console.log('Client Data Generated:', { ip, country, fpId });

    return { ip, country, fingerprint, fpId };
  };

  const isAdmin = (user?.email?.toLowerCase() === 'barnikbhowmik2@gmail.com') || isEmergencyAdmin;

  const handleEmergencyLogin = async () => {
    if (adminSecret === 'brokenaqua@2000#7') {
      try {
        // Create the bypass document to allow Firestore writes even if unauthenticated
        await setDoc(doc(db, 'admin_bypass', 'brokenaqua_2000_7'), {
          active: true,
          timestamp: serverTimestamp()
        });
        setIsEmergencyAdmin(true);
        setShowAdminModal(false);
        setPage('home');
      } catch (err) {
        console.error('Failed to create admin bypass:', err);
        setError('Secret correct, but failed to activate backend access. Check console.');
      }
    } else {
      setError('Invalid Admin Secret');
      setShowAdminModal(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.name && data.school) {
              setProfile({ name: data.name, school: data.school, customSchool: data.customSchool || '', voterId: data.voterId || '' });
            }
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('visited')) return;
    const incrementVisits = async () => {
      try {
        const statsRef = doc(db, 'stats', 'global');
        const statsSnap = await getDoc(statsRef);
        if (statsSnap.exists()) {
          await updateDoc(statsRef, { visitCount: increment(1) });
        } else {
          await setDoc(statsRef, { visitCount: 1 });
        }
        sessionStorage.setItem('visited', 'true');
      } catch (err) {
        console.error("Failed to increment visits:", err);
      }
    };
    incrementVisits();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          registrationEnabled: data.registrationEnabled ?? true,
          votingEnabled: data.votingEnabled ?? true,
          resultsEnabled: data.resultsEnabled ?? true,
        });
      }
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    setRegistering(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        try {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            registeredAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'users/' + user.uid);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to show an error
        setRegistering(false);
        return;
      }
      console.error(err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setRegistering(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setRegistering(true);
    setError(null);
    try {
      const { ip, country, fingerprint, fpId } = await getClientData();
      
      // Run security checks in background so they don't block registration
      const runSecurityChecks = async () => {
        try {
          // 1. Local Storage Check
          const previousRegLocal = localStorage.getItem('voter_registration_detected');
          if (previousRegLocal && previousRegLocal !== user.uid) {
            const alertId = `${user.uid}_local_${Date.now()}`;
            await setDoc(doc(db, 'security_alerts', alertId), {
              uid: user.uid, // This is the UID of the user who triggered the alert
              email: user.email,
              ip,
              country,
              fingerprint,
              reason: 'Multiple registrations detected from same browser (localStorage match)',
              timestamp: serverTimestamp()
            });
          }

          // 2. IP Registry Check (Skip if unknown)
          if (ip !== 'unknown') {
            // Use a safe key for Firestore document ID (replace dots, colons, etc)
            const ipKey = btoa(ip).replace(/[/+=]/g, '_');
            console.log('Checking IP Registry for:', ip, 'Key:', ipKey);
            
            const ipSnap = await getDoc(doc(db, 'ip_registry', ipKey));
            if (ipSnap.exists()) {
              const existingUid = ipSnap.data().uid;
              console.log('IP Registry Match Found. Existing UID:', existingUid, 'Current UID:', user.uid);
              
              if (existingUid !== user.uid) {
                const alertId = `${user.uid}_ip_${Date.now()}`;
                await setDoc(doc(db, 'security_alerts', alertId), {
                  uid: user.uid,
                  email: user.email,
                  ip,
                  country,
                  fingerprint,
                  reason: `Duplicate IP registration detected (${ip}). Previous registration by UID: ${existingUid}`,
                  timestamp: serverTimestamp()
                });
                console.log('Security Alert Created: Duplicate IP');
              }
            }
            await setDoc(doc(db, 'ip_registry', ipKey), { uid: user.uid, lastSeen: serverTimestamp() });
          }

          // 3. Fingerprint Registry Check
          const fpSnap = await getDoc(doc(db, 'fingerprint_registry', fpId));
          if (fpSnap.exists()) {
            const existingUid = fpSnap.data().uid;
            console.log('Fingerprint Registry Match Found. Existing UID:', existingUid, 'Current UID:', user.uid);
            
            if (existingUid !== user.uid) {
              const alertId = `${user.uid}_fp_${Date.now()}`;
              await setDoc(doc(db, 'security_alerts', alertId), {
                uid: user.uid,
                email: user.email,
                ip,
                country,
                fingerprint,
                reason: 'Duplicate device fingerprint detected',
                timestamp: serverTimestamp()
              });
              console.log('Security Alert Created: Duplicate Fingerprint');
            }
          }
          await setDoc(doc(db, 'fingerprint_registry', fpId), { uid: user.uid, lastSeen: serverTimestamp() });
        } catch (secErr) {
          console.error('Security check background error:', secErr);
        }
      };

      // Trigger checks but don't await them for the main flow
      runSecurityChecks();

      // Get the next voter ID number
      const statsRef = doc(db, 'stats', 'voterIdCounter');
      let nextId = 1;
      await runTransaction(db, async (transaction) => {
        const statsSnap = await transaction.get(statsRef);
        if (statsSnap.exists()) {
          nextId = statsSnap.data().lastId + 1;
          transaction.update(statsRef, { lastId: nextId });
        } else {
          transaction.set(statsRef, { lastId: 1 });
        }
      });
      
      const voterId = `CKP-16-04-2026-${nextId.toString().padStart(4, '0')}`;

      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name,
        school: form.school,
        customSchool: form.school === 'others' ? form.customSchool : '',
        voterId: voterId,
        ip,
        country,
        fingerprint,
        registeredAt: serverTimestamp()
      });

      localStorage.setItem('voter_registration_detected', user.uid);
      setProfile({ name: form.name, school: form.school, customSchool: form.school === 'others' ? form.customSchool : '', voterId: voterId });
    } catch (err: any) {
      console.error(err);
      setError('Failed to save profile: ' + (err instanceof Error ? err.message : String(err)));
      handleFirestoreError(err, OperationType.UPDATE, 'users/' + user.uid);
    } finally {
      setRegistering(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setPage('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-gray-500 text-sm animate-pulse">Initializing ChunabKeParva...</p>
      </div>
    );
  }

  let content;

  if (page === 'home') {
    content = <HomePage onNavigate={setPage} isAdmin={isAdmin} profile={profile} user={user} onSecretClick={() => setShowAdminModal(true)} />;
  } else if (page === 'vote') {
    if (!settings.votingEnabled && !isAdmin) {
      setPage('home');
      content = null;
    } else {
      content = <VotingFlow onBack={() => setPage('home')} />;
    }
  } else if (page === 'results') {
    if (!settings.resultsEnabled && !isAdmin) {
      setPage('home');
      content = null;
    } else {
      content = <Results onBack={() => setPage('home')} />;
    }
  } else if (page === 'admin') {
    if (!isAdmin) {
      setPage('home');
      content = null;
    } else {
      content = (
        <div className="relative">
          <button 
            onClick={() => setPage('home')}
            className="fixed top-4 left-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-700 transition-all"
          >
            ← Back
          </button>
          <AdminPanel isEmergency={isEmergencyAdmin} />
        </div>
      );
    }
  } else if (page === 'finger-verification') {
    content = <FingerMarking onComplete={() => { window.close(); }} />;
  } else {
    content = (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800"
        >
          {user ? (
            profile ? (
              <div className="p-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <img src="https://res.cloudinary.com/speed-searches/image/upload/v1775643609/FINAL_20260408_154719_0000_nkldtb.png" alt="Logo" className="w-10 h-10 object-contain" />
                  <h1 className="text-xl font-bold text-white">ChunabKeParva v3.0</h1>
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-20 h-20 bg-green-900/30 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Registration Complete!</h2>
                <p className="text-gray-400 mb-8 leading-relaxed">
                  That's your registration done. Kindly vote on <strong className="text-indigo-400 font-semibold">16th April</strong>.
                </p>

                <VoterCard 
                  name={profile.name}
                  school={profile.school === 'others' ? profile.customSchool : profile.school}
                  photoURL={user.photoURL || 'https://ui-avatars.com/api/?name=' + profile.name}
                  voterId={profile.voterId}
                />

                <div className="flex flex-col gap-2 mt-8">
                  <button 
                    onClick={() => setPage('home')}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    Back to Home
                  </button>
                  <button 
                    onClick={handleSignOut}
                    className="text-sm text-gray-500 hover:text-gray-300 flex items-center justify-center gap-2 mx-auto transition-colors py-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            ) : !settings.registrationEnabled && !isAdmin ? (
              <div className="p-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <img src="https://res.cloudinary.com/speed-searches/image/upload/v1775643609/FINAL_20260408_154719_0000_nkldtb.png" alt="Logo" className="w-10 h-10 object-contain" />
                  <h1 className="text-xl font-bold text-white">ChunabKeParva v3.0</h1>
                </div>
                <div className="w-20 h-20 bg-red-900/30 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Registration Closed</h2>
                <p className="text-gray-400 mb-8 leading-relaxed">
                  Registration for the election is currently closed by the administrator.
                </p>
                <button 
                  onClick={() => setPage('home')}
                  className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-all"
                >
                  Back to Home
                </button>
              </div>
            ) : (
              <div className="p-8">
                <button 
                  onClick={() => setPage('home')}
                  className="text-gray-400 hover:text-white mb-4 flex items-center gap-1 text-sm"
                >
                  ← Back to Home
                </button>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <img src="https://res.cloudinary.com/speed-searches/image/upload/v1775643609/FINAL_20260408_154719_0000_nkldtb.png" alt="Logo" className="w-10 h-10 object-contain" />
                  <h1 className="text-xl font-bold text-white">ChunabKeParva v3.0</h1>
                </div>
                <h2 className="text-2xl font-bold text-white mb-6">Complete your profile</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                    <input 
                      required
                      type="text"
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">School</label>
                    <div className="space-y-2">
                      {SCHOOLS.map(s => (
                        <label key={s} className="flex items-center p-3 bg-gray-800 border border-gray-700 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors">
                          <input
                            required
                            type="radio"
                            name="school"
                            value={s}
                            checked={form.school === s}
                            onChange={e => setForm({...form, school: e.target.value})}
                            className="w-4 h-4 text-indigo-500 focus:ring-indigo-500"
                          />
                          <span className="ml-3 text-sm text-gray-200">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {form.school === 'others' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Mention School</label>
                      <input 
                        required
                        type="text"
                        value={form.customSchool}
                        onChange={e => setForm({...form, customSchool: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <button 
                    disabled={registering}
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {registering ? 'Saving...' : 'Complete Registration'}
                  </button>
                </form>
              </div>
            )
          ) : (
            <div className="p-8">
              <button 
                onClick={() => setPage('home')}
                className="text-gray-400 hover:text-white mb-4 flex items-center gap-1 text-sm"
              >
                ← Back to Home
              </button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-900/30 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-white">Voter Registration</h1>
                <p className="text-gray-400 mt-2">Register securely to participate in the upcoming election.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogleSignIn}
                disabled={registering}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-3.5 rounded-xl font-medium hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                {registering ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {registering ? 'Signing in...' : 'Sign in with Google'}
              </button>

              <p className="text-center text-xs text-gray-500 mt-6">
                By registering, you confirm your eligibility to vote.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-950">
      {content}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-900 border border-gray-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-4">Admin Access</h2>
              <input 
                type="password"
                placeholder="Enter Secret Code"
                value={adminSecret}
                onChange={e => setAdminSecret(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white mb-6 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAdminModal(false)}
                  className="flex-1 px-4 py-2 text-gray-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEmergencyLogin}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700"
                >
                  Login
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
