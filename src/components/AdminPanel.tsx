import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, onSnapshot, doc, setDoc, updateDoc, 
  deleteDoc, query, orderBy, getDocs, writeBatch,
  getDocsFromServer, serverTimestamp
} from 'firebase/firestore';
import { 
  Users, Vote, Settings, Plus, Trash2, Play, 
  Square, RefreshCw, Download, Trophy, UserCheck,
  UserPlus, UploadCloud, BarChart3, ShieldCheck,
  AlertTriangle, Fingerprint, Globe, Ban, Edit2, Key, EyeOff, Eye, ShieldAlert, CheckCircle2
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
  voterEmail?: string;
  reason: string;
  timestamp: any;
  voterIp?: string;
  googleDisplayName?: string;
  googlePhotoURL?: string;
  voterRegistrationId?: string;
  hidden?: boolean;
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
  isBanned?: boolean;
  customSchool?: string;
  googleDisplayName?: string;
  googlePhotoURL?: string;
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

interface AdminKey {
  id: string;
  key: string;
  label: string;
  permissions: {
    canViewCandidates: boolean;
    canViewVoters: boolean;
    canViewRegistered: boolean;
    canViewResults: boolean;
    canViewReviews: boolean;
    canViewSecurity: boolean;
  };
  createdAt: any;
}

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
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const AdminPanel: React.FC<{ 
  isEmergency?: boolean;
  permissions: {
    canViewCandidates: boolean;
    canViewVoters: boolean;
    canViewRegistered: boolean;
    canViewResults: boolean;
    canViewReviews: boolean;
    canViewSecurity: boolean;
    canDeleteVotes: boolean;
    canEditUsers: boolean;
    canViewParticipation: boolean;
    isFullAdmin: boolean;
  } | null;
}> = ({ isEmergency, permissions }) => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'voters' | 'results' | 'registered' | 'reviews' | 'security' | 'access-keys' | 'participation'>(
    permissions?.canViewCandidates ? 'candidates' : 
    permissions?.canViewVoters ? 'voters' :
    permissions?.canViewRegistered ? 'registered' : 
    permissions?.canViewParticipation ? 'participation' :
    permissions?.canViewResults ? 'results' : 
    permissions?.canViewReviews ? 'reviews' :
    permissions?.canViewSecurity ? 'security' :
    permissions?.isFullAdmin ? 'access-keys' : 'candidates'
  );
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [adminKeys, setAdminKeys] = useState<AdminKey[]>([]);
  const [editingUserName, setEditingUserName] = useState<{ uid: string, name: string } | null>(null);
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [resultsEnabled, setResultsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [voteSortOrder, setVoteSortOrder] = useState<'asc' | 'desc'>('desc');

  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [newCandidate, setNewCandidate] = useState({ name: '', logoUrl: '', order: 1 });
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState({
    canViewCandidates: false,
    canViewVoters: false,
    canViewRegistered: true,
    canViewResults: true,
    canViewReviews: false,
    canViewSecurity: false,
    canDeleteVotes: false,
    canEditUsers: false,
    canViewParticipation: false
  });

  const handleCreateKey = async () => {
    if (!newKeyLabel) return;
    setKeyError(null);
    const key = Math.random().toString(36).substring(2, 10).toUpperCase();
    const path = `admin_keys/${key}`;
    try {
      await setDoc(doc(db, 'admin_keys', key), {
        key,
        label: newKeyLabel,
        permissions: newKeyPermissions,
        createdAt: serverTimestamp()
      });
      setNewKeyLabel('');
      alert(`Key created: ${key}`);
    } catch (err) {
      setKeyError('Failed to create key. Please check permissions.');
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Delete this access key?')) return;
    const path = `admin_keys/${id}`;
    try {
      await deleteDoc(doc(db, 'admin_keys', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

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

    const unsubAdminKeys = onSnapshot(query(collection(db, 'admin_keys'), orderBy('createdAt', 'desc')), (snap) => {
      setAdminKeys(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminKey)));
    });

    setLoading(false);
    return () => {
      unsubCandidates();
      unsubVotes();
      unsubSettings();
      unsubUsers();
      unsubReviews();
      unsubSecurityAlerts();
      unsubAdminKeys();
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

  const handleToggleBan = async (uid: string, currentStatus: boolean) => {
    const action = currentStatus ? 'unban' : 'ban';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), { isBanned: !currentStatus });
      alert(`User ${action}ned successfully.`);
    } catch (err) {
      console.error(err);
      alert(`Failed to ${action} user.`);
    }
  };

  const handleBanIP = async (ip: string) => {
    if (!ip || ip === 'N/A') return;
    if (!window.confirm(`Are you sure you want to ban all access from IP: ${ip}?`)) return;
    try {
      await setDoc(doc(db, 'banned_ips', ip), {
        ip,
        bannedAt: serverTimestamp(),
        bannedBy: auth.currentUser?.email
      });
      alert(`IP ${ip} has been banned.`);
    } catch (err) {
      console.error(err);
      alert('Failed to ban IP.');
    }
  };

  const handleDeleteAllByIP = async (ip: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ALL votes from IP: ${ip}?`)) return;
    try {
      setLoading(true);
      const ipVotes = votes.filter(v => v.voterIp === ip);
      const batch = writeBatch(db);
      ipVotes.forEach(v => {
        batch.delete(doc(db, 'votes', v.id));
      });
      await batch.commit();
      alert(`Deleted ${ipVotes.length} votes from IP ${ip}.`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete votes by IP.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editingUserName) return;
    try {
      await updateDoc(doc(db, 'users', editingUserName.uid), { name: editingUserName.name });
      setEditingUserName(null);
      alert('Name updated successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to update name.');
    }
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

  const handleHideVote = async (docId: string) => {
    if (!window.confirm('Are you sure you want to hide this vote? It will be excluded from results.')) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, 'votes', docId), {
        hidden: true
      });
      alert('Vote hidden successfully.');
    } catch (error) {
      console.error('Error hiding vote:', error);
      alert('Failed to hide vote: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVote = async (docId: string) => {
    if (!window.confirm('PERMANENT DELETE: Are you sure? This cannot be undone and the vote will be gone forever.')) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'votes', docId));
      alert('Vote permanently deleted.');
    } catch (error) {
      console.error('Error deleting vote:', error);
      alert('Failed to delete vote.');
    } finally {
      setLoading(false);
    }
  };

  const [showManualVoteForm, setShowManualVoteForm] = useState(false);
  const [quickRemoveId, setQuickRemoveId] = useState('');

  const handleQuickRemove = async () => {
    if (!quickRemoveId) return;
    const voteToDelete = votes.find(v => v.id === quickRemoveId || v.voterRegistrationId === quickRemoveId || v.voterEmail === quickRemoveId);
    if (!voteToDelete) {
      alert('No vote found matching that ID or Email.');
      return;
    }
    await handleDeleteVote(voteToDelete.id);
    setQuickRemoveId('');
  };
  const [manualVote, setManualVote] = useState({
    voterName: '',
    voterEmail: '',
    voterSchool: '',
    candidateId: '',
    reason: 'Manual entry by admin'
  });

  const handleManualVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualVote.voterName || !manualVote.candidateId) {
      alert('Please fill in at least the name and candidate.');
      return;
    }
    try {
      setLoading(true);
      const tempId = `manual_${Date.now()}`;
      await setDoc(doc(db, 'votes', tempId), {
        ...manualVote,
        voterId: tempId,
        voterRegistrationId: 'MANUAL',
        voterIp: 'ADMIN_MANUAL',
        timestamp: serverTimestamp(),
        hidden: false
      });
      alert('Manual vote added successfully.');
      setShowManualVoteForm(false);
      setManualVote({ voterName: '', voterEmail: '', voterSchool: '', candidateId: '', reason: 'Manual entry by admin' });
    } catch (err) {
      console.error('Error adding manual vote:', err);
      alert('Failed to add manual vote.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserName = async () => {
    if (!editingUser) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', editingUser.uid), {
        name: editingUser.name
      });
      setEditingUser(null);
      alert('User name updated successfully.');
    } catch (err) {
      console.error('Error updating user name:', err);
      alert('Failed to update user name.');
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
        totalVotes: votes.filter(v => !v.hidden).length,
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
    const headers = ['Name', 'School', 'Email', 'Voter ID', 'Registered At', 'IP', 'Country', 'Fingerprint', 'Banned', 'Google Name'];
    const rows = registeredUsers.map(u => [
      u.name || 'N/A',
      u.school === 'others' ? (u.customSchool || 'Others') : (u.school || 'N/A'),
      u.email,
      u.voterId || 'N/A',
      u.registeredAt?.toDate().toLocaleString() || '',
      u.ip || 'N/A',
      u.country || 'N/A',
      u.fingerprint || 'N/A',
      u.isBanned ? 'YES' : 'NO',
      u.googleDisplayName || 'N/A'
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
    const headers = ['Voter Name', 'Voter ID', 'School', 'Voted For', 'Reason', 'IP Address', 'Google Name', 'Timestamp'];
    const rows = votes.map(v => [
      v.voterName,
      v.voterRegistrationId || 'N/A',
      v.voterSchool,
      candidates.find(c => c.id === v.candidateId)?.name || 'Unknown',
      v.reason,
      v.voterIp || 'N/A',
      v.googleDisplayName || 'N/A',
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

  const getVoteIpCounts = () => {
    const counts: Record<string, number> = {};
    votes.forEach(v => {
      if (v.voterIp && v.voterIp !== 'N/A') {
        counts[v.voterIp] = (counts[v.voterIp] || 0) + 1;
      }
    });
    return counts;
  };

  const getResults = () => {
    const counts: Record<string, number> = {};
    votes.filter(v => !v.hidden).forEach(v => {
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
          {permissions?.isFullAdmin && (
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
          )}
        </header>

        <nav className="flex gap-4 mb-8 border-b border-gray-800 overflow-x-auto flex-nowrap scrollbar-hide">
          {permissions?.canViewCandidates && (
            <button 
              onClick={() => setActiveTab('candidates')}
              className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'candidates' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
            >
              Candidates
            </button>
          )}
          {permissions?.canViewVoters && (
            <button 
              onClick={() => setActiveTab('voters')}
              className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'voters' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
            >
              Voter Records
            </button>
          )}
          {permissions?.canViewRegistered && (
            <button 
              onClick={() => setActiveTab('registered')}
              className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'registered' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
            >
              Registered Users
            </button>
          )}
          {permissions?.canViewParticipation && (
            <button 
              onClick={() => setActiveTab('participation')}
              className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'participation' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
            >
              Participation
            </button>
          )}
          {permissions?.canViewResults && (
            <button 
              onClick={() => setActiveTab('results')}
              className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'results' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
            >
              Results
            </button>
          )}
          {permissions?.canViewReviews && (
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'reviews' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'}`}
            >
              Reviews
            </button>
          )}
          {permissions?.canViewSecurity && (
            <button 
              onClick={() => setActiveTab('security')}
              className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'security' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'} flex items-center gap-2`}
            >
              Security {securityAlerts.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{securityAlerts.length}</span>}
            </button>
          )}
          {permissions?.isFullAdmin && (
            <button 
              onClick={() => setActiveTab('access-keys')}
              className={`pb-4 px-2 font-bold transition-all whitespace-nowrap ${activeTab === 'access-keys' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400'} flex items-center gap-2`}
            >
              <Key size={16} /> Access Keys
            </button>
          )}
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
            <div className="space-y-8">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-8">
                <h2 className="text-xl font-bold mb-4">Hidden Votes</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-400 text-sm border-b border-gray-800">
                        <th className="px-6 py-4">Voter</th>
                        <th className="px-6 py-4">Choice</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {votes.filter(v => v.hidden).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                            No hidden votes found.
                          </td>
                        </tr>
                      ) : (
                        votes.filter(v => v.hidden).map((v, i) => (
                          <tr key={v.id || i} className="hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4 font-medium">{v.voterName}</td>
                            <td className="px-6 py-4">
                              <span className="bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs font-bold">
                                {candidates.find(c => c.id === v.candidateId)?.name || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">{v.reason}</td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to unhide this vote?')) {
                                    await updateDoc(doc(db, 'votes', v.id), { hidden: false });
                                  }
                                }}
                                className="text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                                title="Unhide Vote"
                              >
                                <Eye size={16} /> Unhide
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2"><UserCheck size={20} /> Voting Records</h2>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowManualVoteForm(!showManualVoteForm)}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl font-bold text-sm"
                    >
                      <Plus size={16} /> Add Manual Vote
                    </button>
                    <button 
                      onClick={() => setVoteSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="text-sm font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      Sort: {voteSortOrder === 'asc' ? 'Oldest' : 'Newest'}
                    </button>
                    <button 
                      onClick={exportToCSV}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl font-bold text-sm"
                    >
                      <Download size={16} /> Export CSV
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-gray-800/30 border-b border-gray-800 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px] relative">
                    <input 
                      placeholder="Quick Remove by ID or Email..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm pr-10"
                      value={quickRemoveId}
                      onChange={e => setQuickRemoveId(e.target.value)}
                    />
                    <button 
                      onClick={handleQuickRemove}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-400"
                      title="Quick Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 italic">Enter Voter ID, Email, or Doc ID to instantly find and delete a vote.</p>
                </div>

                {showManualVoteForm && (
                  <div className="p-6 bg-gray-800/50 border-b border-gray-800">
                    <form onSubmit={handleManualVoteSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input 
                        placeholder="Voter Name"
                        className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm"
                        value={manualVote.voterName}
                        onChange={e => setManualVote({...manualVote, voterName: e.target.value})}
                        required
                      />
                      <input 
                        placeholder="Voter Email"
                        className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm"
                        value={manualVote.voterEmail}
                        onChange={e => setManualVote({...manualVote, voterEmail: e.target.value})}
                      />
                      <select 
                        className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm"
                        value={manualVote.candidateId}
                        onChange={e => setManualVote({...manualVote, candidateId: e.target.value})}
                        required
                      >
                        <option value="">Select Candidate</option>
                        {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input 
                        placeholder="School"
                        className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm"
                        value={manualVote.voterSchool}
                        onChange={e => setManualVote({...manualVote, voterSchool: e.target.value})}
                      />
                      <input 
                        placeholder="Reason"
                        className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm md:col-span-2"
                        value={manualVote.reason}
                        onChange={e => setManualVote({...manualVote, reason: e.target.value})}
                      />
                      <div className="md:col-span-3 flex justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => setShowManualVoteForm(false)}
                          className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold text-sm"
                        >
                          Add Vote
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-800 text-gray-400 text-sm uppercase">
                      <tr>
                        <th className="px-6 py-4">Google Account</th>
                        <th className="px-6 py-4">Voter</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Voter ID</th>
                        <th className="px-6 py-4">School</th>
                        <th className="px-6 py-4">Choice</th>
                        <th className="px-6 py-4">IP Address</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {(() => {
                        const ipCounts = getVoteIpCounts();
                        return votes
                          .filter(v => !v.hidden)
                          .sort((a, b) => {
                            const timeA = a.timestamp?.toMillis() || 0;
                            const timeB = b.timestamp?.toMillis() || 0;
                            return voteSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
                          })
                          .map((v, i) => {
                            const isDuplicateIp = v.voterIp && v.voterIp !== 'N/A' && ipCounts[v.voterIp] > 1;
                            
                            return (
                              <tr key={v.id || i} className="hover:bg-gray-800/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {v.googlePhotoURL ? (
                                    <img src={v.googlePhotoURL} alt="" className="w-8 h-8 rounded-full border border-gray-700" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-gray-500">?</div>
                                  )}
                                  <div className="text-xs text-gray-400 truncate max-w-[120px]" title={v.googleDisplayName}>
                                    {v.googleDisplayName || 'N/A'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-medium">
                                <div className="flex flex-col">
                                  <span>{v.voterName}</span>
                                  {isDuplicateIp && (
                                    <span className="text-[10px] text-amber-500 font-bold uppercase flex items-center gap-1">
                                      <ShieldAlert size={10} /> Duplicate IP
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-400">{v.voterEmail || 'N/A'}</td>
                              <td className="px-6 py-4 font-mono text-xs text-indigo-400">{v.voterRegistrationId || 'N/A'}</td>
                              <td className="px-6 py-4 text-gray-400">{v.voterSchool}</td>
                              <td className="px-6 py-4">
                                <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded text-xs font-bold">
                                  {candidates.find(c => c.id === v.candidateId)?.name || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className={`font-mono text-xs ${isDuplicateIp ? 'text-amber-500' : 'text-gray-500'}`}>
                                    {v.voterIp || 'N/A'}
                                  </span>
                                  {v.voterIp && v.voterIp !== 'N/A' && permissions?.isFullAdmin && (
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => handleBanIP(v.voterIp!)}
                                        className="text-[10px] text-red-500 hover:underline flex items-center gap-1 font-bold"
                                      >
                                        <Ban size={10} /> Ban IP
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteAllByIP(v.voterIp!)}
                                        className="text-[10px] text-orange-500 hover:underline flex items-center gap-1 font-bold"
                                        title="Delete all votes from this IP"
                                      >
                                        <Trash2 size={10} /> Clear IP
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate" title={v.reason}>{v.reason}</td>
                              <td className="px-6 py-4 text-xs text-gray-500">
                                {v.timestamp?.toDate().toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {(permissions?.isFullAdmin || permissions?.canDeleteVotes) && (
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => handleHideVote(v.id)}
                                      className="text-amber-500 hover:bg-amber-500/10 p-2 rounded-lg transition-colors"
                                      title="Hide Vote"
                                    >
                                      <EyeOff size={18} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteVote(v.id)}
                                      className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                                      title="Delete Permanently"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'registered' && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><UserPlus size={20} /> Registered Users</h2>
                {permissions?.isFullAdmin && (
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
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-800 text-gray-400 text-sm uppercase">
                    <tr>
                      {permissions?.isFullAdmin && <th className="px-6 py-4">Status</th>}
                      {permissions?.isFullAdmin && <th className="px-6 py-4">Google Account</th>}
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Voter ID</th>
                      <th className="px-6 py-4">School</th>
                      {permissions?.isFullAdmin && <th className="px-6 py-4">Email</th>}
                      {permissions?.isFullAdmin && <th className="px-6 py-4">IP Address</th>}
                      {permissions?.isFullAdmin && <th className="px-6 py-4">Country</th>}
                      {permissions?.isFullAdmin && <th className="px-6 py-4">Fingerprint</th>}
                      <th className="px-6 py-4">Registered At</th>
                      {permissions?.isFullAdmin && <th className="px-6 py-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {(() => {
                      const ipCounts: Record<string, number> = {};
                      const fpCounts: Record<string, number> = {};
                      
                      registeredUsers.forEach(u => {
                        if (u.ip && u.ip !== 'unknown') ipCounts[u.ip] = (ipCounts[u.ip] || 0) + 1;
                        if (u.fingerprint && u.fingerprint !== 'unknown') fpCounts[u.fingerprint] = (fpCounts[u.fingerprint] || 0) + 1;
                      });

                      return [...registeredUsers]
                        .sort((a, b) => {
                          const dateA = a.registeredAt?.toDate().getTime() || 0;
                          const dateB = b.registeredAt?.toDate().getTime() || 0;
                          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                        })
                        .map((u) => {
                          const hasExplicitAlert = securityAlerts.some(a => a.uid === u.uid);
                          const isDuplicateIP = u.ip && u.ip !== 'unknown' && ipCounts[u.ip] > 1;
                          const isDuplicateFP = u.fingerprint && u.fingerprint !== 'unknown' && fpCounts[u.fingerprint] > 1;
                          const isFlagged = hasExplicitAlert || isDuplicateIP || isDuplicateFP;

                          return (
                            <tr key={u.uid} className={`hover:bg-gray-800/50 transition-colors ${isFlagged && permissions?.isFullAdmin ? 'bg-red-500/5' : ''} ${u.isBanned ? 'opacity-60' : ''}`}>
                              {permissions?.isFullAdmin && (
                                <td className="px-6 py-4">
                                  {u.isBanned ? (
                                    <span className="flex items-center gap-1 text-red-600 text-[10px] font-bold uppercase">
                                      <Ban size={12} /> Banned
                                    </span>
                                  ) : isFlagged ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="flex items-center gap-1 text-red-500 text-[10px] font-bold uppercase animate-pulse">
                                        <AlertTriangle size={12} /> Flagged
                                      </span>
                                      <div className="flex flex-col gap-0.5">
                                        {isDuplicateIP && <span className="text-[8px] text-red-400/70 font-mono uppercase">Duplicate IP</span>}
                                        {isDuplicateFP && <span className="text-[8px] text-red-400/70 font-mono uppercase">Duplicate Device</span>}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold uppercase">
                                      <ShieldCheck size={12} /> Safe
                                    </span>
                                  )}
                                </td>
                              )}
                              {permissions?.isFullAdmin && (
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    {u.googlePhotoURL ? (
                                      <img src={u.googlePhotoURL} alt="" className="w-8 h-8 rounded-full border border-gray-700" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-gray-500">?</div>
                                    )}
                                    <div className="text-xs text-gray-400 truncate max-w-[120px]" title={u.googleDisplayName}>
                                      {u.googleDisplayName || 'N/A'}
                                    </div>
                                  </div>
                                </td>
                              )}
                              <td className="px-6 py-4 font-medium">
                                <div className="flex items-center gap-2 group">
                                  <span>{u.name || 'N/A'}</span>
                                  {(permissions?.isFullAdmin || permissions?.canEditUsers) && (
                                    <button 
                                      onClick={() => setEditingUserName({ uid: u.uid, name: u.name || '' })}
                                      className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-300 transition-opacity"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 font-mono text-indigo-400">{u.voterId || 'N/A'}</td>
                              <td className="px-6 py-4 text-gray-400">
                                {u.school === 'others' ? (
                                  <span className="flex flex-col">
                                    <span className="text-[10px] text-indigo-400 uppercase font-bold">Others</span>
                                    <span>{u.customSchool || 'N/A'}</span>
                                  </span>
                                ) : (
                                  u.school || 'N/A'
                                )}
                              </td>
                              {permissions?.isFullAdmin && <td className="px-6 py-4 text-sm text-gray-400">{u.email}</td>}
                              {permissions?.isFullAdmin && <td className="px-6 py-4 text-xs text-gray-500 font-mono">{u.ip || 'N/A'}</td>}
                              {permissions?.isFullAdmin && <td className="px-6 py-4 text-xs text-gray-500">{u.country || 'N/A'}</td>}
                              {permissions?.isFullAdmin && <td className="px-6 py-4 text-[10px] text-gray-600 font-mono break-all min-w-[150px]" title={u.fingerprint}>{u.fingerprint || 'N/A'}</td>}
                              <td className="px-6 py-4 text-xs text-gray-500">
                                {u.registeredAt?.toDate().toLocaleString()}
                              </td>
                              {permissions?.isFullAdmin && (
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => handleToggleBan(u.uid, !!u.isBanned)}
                                      className={`${u.isBanned ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-orange-500 hover:bg-orange-500/10'} p-2 rounded-lg transition-colors`}
                                      title={u.isBanned ? 'Unban User' : 'Ban User'}
                                    >
                                      <Ban size={18} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteUser(u.uid)}
                                      className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                                      title="Delete Registration"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        });
                    })()}
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
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={async () => {
                        if (!confirm('This will clear all IP and Fingerprint history. Detection will start fresh. Continue?')) return;
                        try {
                          const ipSnap = await getDocs(collection(db, 'ip_registry'));
                          const fpSnap = await getDocs(collection(db, 'fingerprint_registry'));
                          const batch = writeBatch(db);
                          ipSnap.docs.forEach(d => batch.delete(d.ref));
                          fpSnap.docs.forEach(d => batch.delete(d.ref));
                          await batch.commit();
                          alert('Detection history cleared successfully!');
                        } catch (err) {
                          console.error(err);
                          alert('Failed to clear history. Check console.');
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-red-400 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Clear Detection History
                    </button>
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

          {activeTab === 'participation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-900/20 border border-emerald-800 p-6 rounded-2xl text-center">
                  <UserCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest">Voted</p>
                  <h3 className="text-4xl font-bold text-emerald-500">
                    {registeredUsers.filter(u => votes.some(v => v.voterId === u.uid)).length}
                  </h3>
                </div>
                <div className="bg-red-900/20 border border-red-800 p-6 rounded-2xl text-center">
                  <Users className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <p className="text-red-400 text-sm font-bold uppercase tracking-widest">Not Voted Yet</p>
                  <h3 className="text-4xl font-bold text-red-500">
                    {registeredUsers.filter(u => !votes.some(v => v.voterId === u.uid)).length}
                  </h3>
                </div>
              </div>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                  <h2 className="text-xl font-bold">Participation Details</h2>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-full">
                      <CheckCircle2 size={12} /> Voted
                    </span>
                    <span className="flex items-center gap-1 text-xs text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded-full">
                      <AlertTriangle size={12} /> Pending
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-800 text-gray-400 text-sm uppercase">
                      <tr>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Voter Name</th>
                        <th className="px-6 py-4">School</th>
                        <th className="px-6 py-4">Voter ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {registeredUsers
                        .sort((a, b) => {
                          const aVoted = votes.some(v => v.voterId === a.uid);
                          const bVoted = votes.some(v => v.voterId === b.uid);
                          if (aVoted === bVoted) {
                            const nameA = a.name || '';
                            const nameB = b.name || '';
                            return nameA.localeCompare(nameB);
                          }
                          return aVoted ? 1 : -1; // Pending first
                        })
                        .map(u => {
                          const hasVoted = votes.some(v => v.voterId === u.uid);
                          return (
                            <tr key={u.uid} className="hover:bg-gray-800/50 transition-colors">
                              <td className="px-6 py-4">
                                {hasVoted ? (
                                  <span className="text-emerald-500 flex items-center gap-1 font-bold text-xs">
                                    <CheckCircle2 size={14} /> VOTED
                                  </span>
                                ) : (
                                  <span className="text-red-500 flex items-center gap-1 font-bold text-xs">
                                    <AlertTriangle size={14} /> PENDING
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold">{u.name}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{u.school}</td>
                              <td className="px-6 py-4 font-mono text-xs text-indigo-400">{u.voterId || 'N/A'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'access-keys' && permissions?.isFullAdmin && (
            <div className="space-y-8">
              <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Key size={20} /> Create Access Key</h2>
                {keyError && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-xl text-xs text-red-400">
                    {keyError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Key Label (e.g. "Staff Member")</label>
                      <input 
                        placeholder="Label"
                        value={newKeyLabel}
                        onChange={e => setNewKeyLabel(e.target.value)}
                        className="w-full bg-gray-800 rounded-xl px-4 py-2 border border-gray-700 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button 
                      onClick={handleCreateKey}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold transition-all"
                    >
                      Generate Key
                    </button>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <p className="text-sm font-bold mb-3 text-gray-300">Permissions</p>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(newKeyPermissions).map(([key, val]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={val}
                            onChange={e => setNewKeyPermissions({...newKeyPermissions, [key]: e.target.checked})}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                            {key
                              .replace('canView', 'View ')
                              .replace('canDelete', 'Delete ')
                              .replace('canEdit', 'Edit ')
                              .replace(/([A-Z])/g, ' $1')
                              .trim()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-800 text-gray-400 text-sm uppercase">
                    <tr>
                      <th className="px-6 py-4">Label</th>
                      <th className="px-6 py-4">Key</th>
                      <th className="px-6 py-4">Permissions</th>
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {adminKeys.map(k => (
                      <tr key={k.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold">{k.label}</td>
                        <td className="px-6 py-4 font-mono text-indigo-400">{k.key}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(k.permissions).filter(([_, v]) => v).map(([pk]) => (
                              <span key={pk} className="text-[10px] bg-gray-800 px-2 py-0.5 rounded border border-gray-700 text-gray-400">
                                {pk.replace('canView', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {k.createdAt?.toDate().toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteKey(k.id)}
                            className="text-red-500 hover:text-red-400 p-2"
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
        </main>
      </div>

      {editingUserName && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-gray-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl"
          >
            <h2 className="text-xl font-bold text-white mb-4">Edit Voter Name</h2>
            <p className="text-xs text-gray-500 mb-4">Update the name for this voter in the database.</p>
            <input 
              type="text"
              value={editingUserName.name}
              onChange={e => setEditingUserName({ ...editingUserName, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white mb-6 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Enter new name"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setEditingUserName(null)}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateName}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700"
              >
                Update
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
