import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, onSnapshot, doc, setDoc, updateDoc, 
  deleteDoc, query, orderBy, getDocs, writeBatch,
  getDocsFromServer
} from 'firebase/firestore';
import { 
  Users, Vote, Settings, Plus, Trash2, Play, 
  Square, RefreshCw, Download, Trophy, UserCheck,
  UserPlus, UploadCloud, BarChart3, ShieldCheck,
  AlertTriangle, Fingerprint, Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Candidate {
  id: string;
  name: string;
  logoUrl: string;
  order: number;
}

interface VoteRecord {
  id: string;
  voterId: string;
  candidateId: string;
  voterName: string;
  voterSchool: string;
  reason: string;
  timestamp: any;
}

interface RegisteredUser {
  uid: string;
  name: string;
  school: string;
  email: string;
  registeredAt: any;
  voterId?: string;
  ip?: string;
  fingerprint?: string;
}

interface SecurityAlert {
  id: string;
  uid: string;
  email: string;
  ip: string;
  fingerprint: string;
  reason: string;
  timestamp: any;
}

export const AdminPanel: React.FC<{ isEmergency?: boolean }> = ({ isEmergency }) => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'voters' | 'results' | 'registered' | 'reviews' | 'security'>('candidates');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [resultsEnabled, setResultsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [newCandidate, setNewCandidate] = useState({ name: '', logoUrl: '', order: 1 });

  const handleEditCandidate = async () => {
    if (!editingCandidate) return;
    await updateDoc(doc(db, 'candidates', editingCandidate.id), editingCandidate);
    setEditingCandidate(null);
  };

  useEffect(() => {
    const unsubCandidates = onSnapshot(query(collection(db, 'candidates'), orderBy('order', 'asc')), (snap) => {
      setCandidates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
    });

    const unsubVotes = onSnapshot(collection(db, 'votes'), (snap) => {
      setVotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoteRecord & { id: string })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setVotingEnabled(data.votingEnabled ?? false);
        setRegistrationEnabled(data.registrationEnabled ?? true);
        setResultsEnabled(data.resultsEnabled ?? true);
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setRegisteredUsers(snap.docs.map(doc => doc.data() as RegisteredUser));
    });

    const unsubReviews = onSnapshot(collection(db, 'votes'), (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSecurityAlerts = onSnapshot(query(collection(db, 'security_alerts'), orderBy('timestamp', 'desc')), (snap) => {
      setSecurityAlerts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SecurityAlert)));
    });

    setLoading(false);
    return () => {
      unsubCandidates();
      unsubVotes();
      unsubSettings();
      unsubUsers();
      unsubReviews();
      unsubSecurityAlerts();
    };
  }, []);

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.logoUrl) return;
    const id = doc(collection(db, 'candidates')).id;
    await setDoc(doc(db, 'candidates', id), { ...newCandidate, id });
    setNewCandidate({ name: '', logoUrl: '', order: candidates.length + 1 });
  };

  const handleDeleteCandidate = async (id: string) => {
    await deleteDoc(doc(db, 'candidates', id));
  };

  const toggleVoting = async () => {
    await updateDoc(doc(db, 'settings', 'global'), { votingEnabled: !votingEnabled });
  };

  const toggleRegistration = async () => {
    await updateDoc(doc(db, 'settings', 'global'), { registrationEnabled: !registrationEnabled });
  };

  const toggleResults = async () => {
    await updateDoc(doc(db, 'settings', 'global'), { resultsEnabled: !resultsEnabled });
  };

  const resetVotes = async () => {
    if (!window.confirm('Are you sure you want to reset all votes and published results? This cannot be undone.')) return;
    try {
      setLoading(true);
      console.log('Starting reset process...');
      console.log('Current Admin Email:', auth.currentUser?.email);
      
      const voteDocs = await getDocsFromServer(collection(db, 'votes'));
      console.log(`Found ${voteDocs.size} votes to delete.`);
      
      const batch = writeBatch(db);
      let count = 0;
      
      voteDocs.forEach(doc => {
        console.log('Adding vote to batch delete:', doc.id);
        batch.delete(doc.ref);
        count++;
      });
      
      // Also delete published results if they exist
      batch.delete(doc(db, 'settings', 'results'));
      
      console.log('Committing batch...');
      await batch.commit();
      console.log(`Successfully deleted ${count} votes and reset settings.`);
      alert(`Reset successful! Deleted ${count} votes.`);
    } catch (error) {
      console.error('Error resetting votes:', error);
      alert('Failed to reset votes: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVote = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this vote? The user will be able to vote again.')) return;
    try {
      setLoading(true);
      console.log('Attempting to delete vote with ID:', docId);
      console.log('Current Admin Email:', auth.currentUser?.email);
      await deleteDoc(doc(db, 'votes', docId));
      console.log('Vote deleted successfully from Firestore.');
      alert('Vote deleted successfully.');
    } catch (error) {
      console.error('Error deleting vote:', error);
      alert('Failed to delete vote: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user registration? This will remove their voter card and profile.')) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'users', uid));
      alert('User registration deleted successfully.');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this security alert?')) return;
    try {
      await deleteDoc(doc(db, 'security_alerts', id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete alert.');
    }
  };

  const publishResults = async () => {
    setPublishing(true);
    try {
      const results = getResults().map(r => ({
        id: r.id,
        name: r.name,
        count: r.count,
        logoUrl: r.logoUrl
      }));
      
      await setDoc(doc(db, 'settings', 'results'), {
        publishedAt: new Date().toISOString(),
        totalVotes: votes.length,
        totalRegistered: registeredUsers.length,
        results: results
      });
      alert('Results published successfully!');
    } catch (error) {
      console.error('Error publishing results:', error);
      alert('Failed to publish results.');
    } finally {
      setPublishing(false);
    }
  };

  const escapeCSV = (value: any) => {
    const stringValue = String(value ?? '');
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const exportUsersToCSV = () => {
    const headers = ['Name', 'School', 'Email', 'Voter ID', 'Registered At', 'IP', 'Country', 'Fingerprint'];
    const rows = registeredUsers.map(u => [
      u.name || 'N/A',
      u.school || 'N/A',
      u.email,
      u.voterId || 'N/A',
      u.registeredAt?.toDate().toLocaleString() || '',
      u.ip || 'N/A',
      u.country || 'N/A',
      u.fingerprint || 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "registered_users.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = () => {
    const headers = ['Voter Name', 'School', 'Voted For', 'Reason', 'Timestamp'];
    const rows = votes.map(v => [
      v.voterName,
      v.voterSchool,
      candidates.find(c => c.id === v.candidateId)?.name || 'Unknown',
      v.reason,
      v.timestamp?.toDate().toLocaleString() || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "voting_records.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getResults = () => {
    const counts: Record<string, number> = {};
    votes.forEach(v => {
      counts[v.candidateId] = (counts[v.candidateId] || 0) + 1;
    });
    return candidates.map(c => ({
      ...c,
      count: counts[c.id] || 0
    })).sort((a, b) => b.count - a.count);
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading Admin Panel...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {isEmergency && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldCheck size={24} />
              <div>
                <p className="font-bold">Emergency Admin Bypass Active</p>
                <p className="text-sm opacity-80">You are using a secret backdoor to access this panel. Backend writes are enabled via a temporary bypass document.</p>
              </div>
            </div>
            <button 
              onClick={async () => {
                if (window.confirm('Deactivate emergency bypass? You will lose write access until you use the backdoor again.')) {
                  await deleteDoc(doc(db, 'admin_bypass', 'brokenaqua_2000_7'));
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm transition-all"
            >
              Deactivate Bypass
            </button>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="text-indigo-500" /> Admin Dashboard
            </h1>
            <p className="text-gray-400">Manage candidates, voters, and results</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={toggleRegistration}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${registrationEnabled ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-800 hover:bg-gray-700'}`}
              title="Toggle Registration Feature"
            >
              {registrationEnabled ? <UserPlus size={18} /> : <UserPlus size={18} className="opacity-50" />}
              Reg: {registrationEnabled ? 'ON' : 'OFF'}
            </button>
            <button 
              onClick={toggleVoting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${votingEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {votingEnabled ? <Square size={18} /> : <Play size={18} />}
              Vote: {votingEnabled ? 'ON' : 'OFF'}
            </button>
            <button 
              onClick={toggleResults}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${resultsEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              <BarChart3 size={18} />
              Results: {resultsEnabled ? 'ON' : 'OFF'}
            </button>
            <button 
              onClick={resetVotes}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold"
            >
              <RefreshCw size={18} /> Reset
            </button>
          </div>
        </header>

        <nav className="flex gap-4 mb-8 border-b border-gray-800 overflow-x-auto flex-nowrap scrollbar-hide">
          <button 
            onClick={() => setActiveTab('candidates')}
            className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'candidates' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
          >
            Candidates
          </button>
          <button 
            onClick={() => setActiveTab('voters')}
            className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'voters' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
          >
            Voter Records
          </button>
          <button 
            onClick={() => setActiveTab('registered')}
            className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'registered' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
          >
            Registered Users
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'results' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
          >
            Results
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'reviews' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
          >
            Reviews
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'security' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'} flex items-center gap-2`}
          >
            Security {securityAlerts.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{securityAlerts.length}</span>}
          </button>
        </nav>

        <main>
          {activeTab === 'candidates' && (
            <div className="space-y-8">
              <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Plus size={20} /> Add Candidate (Max 7)</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input 
                    placeholder="Candidate Name"
                    value={newCandidate.name}
                    onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
                    className="bg-gray-800 rounded-xl px-4 py-2 border border-gray-700 outline-none focus:border-indigo-500"
                  />
                  <input 
                    placeholder="Logo URL"
                    value={newCandidate.logoUrl}
                    onChange={e => setNewCandidate({...newCandidate, logoUrl: e.target.value})}
                    className="bg-gray-800 rounded-xl px-4 py-2 border border-gray-700 outline-none focus:border-indigo-500"
                  />
                  <input 
                    type="number"
                    placeholder="Order"
                    value={newCandidate.order}
                    onChange={e => setNewCandidate({...newCandidate, order: parseInt(e.target.value) || 1})}
                    className="bg-gray-800 rounded-xl px-4 py-2 border border-gray-700 outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={handleAddCandidate}
                    disabled={candidates.length >= 7}
                    className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold disabled:opacity-50"
                  >
                    Add Candidate
                  </button>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map((c, index) => (
                  <div key={c.id} className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex items-center gap-4">
                    <img 
                      src={c.logoUrl} 
                      alt={c.name} 
                      className="w-16 h-16 object-contain bg-white rounded-lg p-1" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&color=fff&size=128`;
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{c.name}</h3>
                      <p className="text-gray-400 text-sm">Position: {index + 1}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingCandidate(c)} className="text-indigo-500 hover:bg-indigo-500/10 p-2 rounded-lg">
                        <Settings size={20} />
                      </button>
                      <button onClick={() => handleDeleteCandidate(c.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {editingCandidate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                  <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Edit Candidate</h2>
                    <input 
                      value={editingCandidate.name}
                      onChange={e => setEditingCandidate({...editingCandidate, name: e.target.value})}
                      className="w-full bg-gray-800 rounded-xl px-4 py-2 mb-4 border border-gray-700 outline-none"
                    />
                    <input 
                      value={editingCandidate.logoUrl}
                      onChange={e => setEditingCandidate({...editingCandidate, logoUrl: e.target.value})}
                      className="w-full bg-gray-800 rounded-xl px-4 py-2 mb-4 border border-gray-700 outline-none"
                    />
                    <input 
                      type="number"
                      value={editingCandidate.order}
                      onChange={e => setEditingCandidate({...editingCandidate, order: parseInt(e.target.value) || 1})}
                      className="w-full bg-gray-800 rounded-xl px-4 py-2 mb-4 border border-gray-700 outline-none"
                      placeholder="Display Order"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingCandidate(null)} className="flex-1 bg-gray-700 py-2 rounded-xl">Cancel</button>
                      <button onClick={handleEditCandidate} className="flex-1 bg-indigo-600 py-2 rounded-xl">Save</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'voters' && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><UserCheck size={20} /> Voting Records</h2>
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl font-bold text-sm"
                >
                  <Download size={16} /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-800 text-gray-400 text-sm uppercase">
                    <tr>
                      <th className="px-6 py-4">Voter</th>
                      <th className="px-6 py-4">School</th>
                      <th className="px-6 py-4">Choice</th>
                      <th className="px-6 py-4">Reason</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {votes.map((v, i) => (
                      <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{v.voterName}</td>
                        <td className="px-6 py-4 text-gray-400">{v.voterSchool}</td>
                        <td className="px-6 py-4">
                          <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded text-xs font-bold">
                            {candidates.find(c => c.id === v.candidateId)?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{v.reason}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {v.timestamp?.toDate().toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteVote(v.id)}
                            className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                            title="Delete Vote"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'registered' && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><UserPlus size={20} /> Registered Users</h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="text-sm font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    Sort by Time ({sortOrder === 'asc' ? 'Oldest First' : 'Newest First'})
                  </button>
                  <button 
                    onClick={exportUsersToCSV}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl font-bold text-sm"
                  >
                    <Download size={16} /> Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-800 text-gray-400 text-sm uppercase">
                    <tr>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Voter ID</th>
                      <th className="px-6 py-4">School</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">IP Address</th>
                      <th className="px-6 py-4">Country</th>
                      <th className="px-6 py-4">Fingerprint</th>
                      <th className="px-6 py-4">Registered At</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {[...registeredUsers].sort((a, b) => {
                      const dateA = a.registeredAt?.toDate().getTime() || 0;
                      const dateB = b.registeredAt?.toDate().getTime() || 0;
                      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                    }).map((u, i) => {
                      const hasAlert = securityAlerts.some(a => a.uid === u.uid);
                      return (
                        <tr key={u.uid} className={`hover:bg-gray-800/50 transition-colors ${hasAlert ? 'bg-red-500/5' : ''}`}>
                          <td className="px-6 py-4">
                            {hasAlert ? (
                              <span className="flex items-center gap-1 text-red-500 text-[10px] font-bold uppercase animate-pulse">
                                <AlertTriangle size={12} /> Flagged
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold uppercase">
                                <ShieldCheck size={12} /> Safe
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium">{u.name || 'N/A'}</td>
                        <td className="px-6 py-4 font-mono text-indigo-400">{u.voterId || 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-400">{u.school || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{u.email}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">{u.ip || 'N/A'}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{u.country || 'N/A'}</td>
                        <td className="px-6 py-4 text-[10px] text-gray-600 font-mono break-all min-w-[150px]" title={u.fingerprint}>{u.fingerprint || 'N/A'}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {u.registeredAt?.toDate().toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteUser(u.uid)}
                            className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                            title="Delete Registration"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-red-500"><AlertTriangle size={20} /> Security Alerts</h2>
                    <p className="text-sm text-gray-400 mt-1">Suspicious registration attempts detected by the system.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!auth.currentUser) return;
                      const alertId = `${auth.currentUser.uid}_test_${Date.now()}`;
                      await setDoc(doc(db, 'security_alerts', alertId), {
                        uid: auth.currentUser.uid,
                        email: auth.currentUser.email,
                        ip: '127.0.0.1',
                        country: 'Test Country',
                        fingerprint: 'TEST_FINGERPRINT',
                        reason: 'Manual Test Alert',
                        timestamp: new Date()
                      });
                      alert('Test alert created! Check the list below.');
                    }}
                    className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg font-bold transition-all"
                  >
                    Generate Test Alert
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-800 text-gray-400 text-sm uppercase">
                      <tr>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4">User/Email</th>
                        <th className="px-6 py-4">IP Address</th>
                        <th className="px-6 py-4">Country</th>
                        <th className="px-6 py-4">Fingerprint</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {securityAlerts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            No security alerts detected. System is secure.
                          </td>
                        </tr>
                      ) : (
                        securityAlerts.map((alert) => (
                          <tr key={alert.id} className="hover:bg-red-500/5 transition-colors">
                            <td className="px-6 py-4">
                              <span className="bg-red-500/10 text-red-500 text-xs px-2 py-1 rounded-full font-bold">
                                {alert.reason}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium">{alert.email}</div>
                              <div className="text-[10px] text-gray-500 font-mono">{alert.uid}</div>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-gray-400 flex items-center gap-1">
                              <Globe size={12} /> {alert.ip}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500">
                              {alert.country || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-[10px] font-mono text-gray-600 break-all min-w-[200px]" title={alert.fingerprint}>
                              <Fingerprint size={12} className="inline mr-1" /> {alert.fingerprint}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500">
                              {alert.timestamp?.toDate().toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDeleteAlert(alert.id)}
                                className="text-gray-500 hover:text-red-500 p-2 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="font-bold text-indigo-400 flex items-center gap-2 mb-2">
                  <ShieldCheck size={18} /> How Detection Works
                </h3>
                <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
                  <li><strong>Browser Fingerprinting:</strong> Captures unique browser characteristics to identify the same device even if the IP changes.</li>
                  <li><strong>IP Tracking:</strong> Logs the public IP address of every registration.</li>
                  <li><strong>Local Storage Check:</strong> Detects if a different user account was recently used to register on the same browser.</li>
                  <li><strong>Real-time Alerts:</strong> Suspicious patterns trigger immediate alerts visible in this panel.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-8">
              <div className="flex justify-end">
                <button 
                  onClick={publishResults}
                  disabled={publishing}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  <UploadCloud size={20} />
                  {publishing ? 'Publishing...' : 'Publish Results to Public'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
                  <Users className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm uppercase tracking-widest">Total Registered</p>
                  <h3 className="text-4xl font-bold">{registeredUsers.length}</h3>
                </div>
                <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
                  <Vote className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm uppercase tracking-widest">Total Voted</p>
                  <h3 className="text-4xl font-bold">{votes.length}</h3>
                </div>
                <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-center">
                  <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm uppercase tracking-widest">Current Leader</p>
                  <h3 className="text-4xl font-bold">
                    {getResults()[0]?.name || 'No votes yet'}
                  </h3>
                </div>
              </div>

              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-xl font-bold mb-6">Vote Distribution</h2>
                <div className="space-y-6">
                  {getResults().map((c, i) => (
                    <div key={c.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{i + 1}. {c.name}</span>
                          {i === 0 && votes.length > 0 && <Trophy size={16} className="text-yellow-500" />}
                        </div>
                        <span className="font-bold text-indigo-400">{c.count} votes</span>
                      </div>
                      <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(c.count / (votes.length || 1)) * 100}%` }}
                          className="h-full bg-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'reviews' && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold flex items-center gap-2">Reviews</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-800 text-gray-400 text-sm uppercase">
                    <tr>
                      <th className="px-6 py-4">Voter</th>
                      <th className="px-6 py-4">Rating</th>
                      <th className="px-6 py-4">Comment</th>
                      <th className="px-6 py-4 text-right">Highlight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {reviews.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{r.voterName}</td>
                        <td className="px-6 py-4 text-yellow-500">{r.rating} stars</td>
                        <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{r.reason}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={async () => {
                              await updateDoc(doc(db, 'votes', r.id), { highlighted: !r.highlighted });
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold ${r.highlighted ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                          >
                            {r.highlighted ? 'Highlighted' : 'Highlight'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
