import React, { useState, useEffect } from 'react';
import { ClubMember, SkillLevel } from '../../types';
import {
  getClubMembers,
  deleteClubMember,
  saveClubMember,
  syncReclubMembers,
  fetchAndSyncReclubFromUrl,
} from '../../services/reclub/reclubSyncService';
import { joinSessionAsParticipant } from '../../services/sessions/sessionService';
import { SkillBadge } from '../ui/Badge';
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Award,
  Upload,
  X,
  Plus,
  UserCheck,
  Globe,
  Link2,
  FileText,
} from 'lucide-react';

interface ClubMemberManagementProps {
  activeSessionId?: string | null;
  onMembersAddedToQueue?: () => void;
}

export const ClubMemberManagement: React.FC<ClubMemberManagementProps> = ({
  activeSessionId,
  onMembersAddedToQueue,
}) => {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<'all' | SkillLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Deletion Modal state
  const [memberToDelete, setMemberToDelete] = useState<ClubMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState<string | null>(null);

  // Add Member Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newSurname, setNewSurname] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDupr, setNewDupr] = useState('');
  const [newSkill, setNewSkill] = useState<SkillLevel>('intermediate');
  const [isSaving, setIsSaving] = useState(false);

  // Reclub Sync Modal state
  const [showReclubModal, setShowReclubModal] = useState(false);
  const [syncTab, setSyncTab] = useState<'url' | 'paste' | 'file'>('url');
  const [reclubUrl, setReclubUrl] = useState('');
  const [reclubInput, setReclubInput] = useState('');
  const [reclubClubId, setReclubClubId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    imported: number;
    updated: number;
  } | null>(null);

  // Queue Check-in state
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await getClubMembers();
      setMembers(data);
    } catch (err) {
      console.error('Error loading club members:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Delete Member
  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      await deleteClubMember(memberToDelete.id);
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setSelectedMemberIds((prev) => prev.filter((id) => id !== memberToDelete.id));
      setDeleteSuccessNotice(`Successfully deleted member ${memberToDelete.name}.`);
      setMemberToDelete(null);
      setTimeout(() => setDeleteSuccessNotice(null), 3500);
    } catch (err: any) {
      alert(`Could not delete member: ${err?.message || 'Permission denied'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler: Save New Member
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newSurname.trim()) return;

    setIsSaving(true);
    try {
      const duprNum = parseFloat(newDupr);
      const saved = await saveClubMember({
        name: `${newFirstName.trim()} ${newSurname.trim()}`,
        firstName: newFirstName.trim(),
        surname: newSurname.trim(),
        email: newEmail.trim() || undefined,
        duprRating: !isNaN(duprNum) && duprNum > 0 ? duprNum : undefined,
        skillLevel: newSkill,
        status: 'active',
        source: 'manual',
      });

      setMembers((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === saved.id);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });

      setShowAddModal(false);
      setNewFirstName('');
      setNewSurname('');
      setNewEmail('');
      setNewDupr('');
    } catch (err: any) {
      alert(`Error saving member: ${err?.message || 'Failed'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Reclub Direct URL Sync Execution
  const handleRunReclubUrlSync = async () => {
    const raw = reclubUrl.trim();
    if (!raw) {
      alert('Please provide a Reclub club URL, API endpoint, or published roster link.');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await fetchAndSyncReclubFromUrl(raw, reclubClubId || undefined);

      if (result.success || result.importedCount > 0 || result.updatedCount > 0) {
        setSyncResult({
          success: true,
          message: `Reclub URL sync complete: ${result.importedCount} new members added, ${result.updatedCount} existing members updated.`,
          imported: result.importedCount,
          updated: result.updatedCount,
        });
        await loadMembers();
      } else {
        setSyncResult({
          success: false,
          message: result.errors.join(' • ') || 'Reclub synchronization could not parse any member records from this URL link.',
          imported: 0,
          updated: 0,
        });
      }
    } catch (err: any) {
      console.error('Reclub URL sync failure:', err);
      setSyncResult({
        success: false,
        message: `Sync error: ${err?.message || 'Network or CORS transaction error'}`,
        imported: 0,
        updated: 0,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: File Upload for Roster Import (JSON / CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setReclubInput(content);
        await handleRunReclubSync(content);
      }
    };
    reader.readAsText(file);
  };

  // Handler: Reclub Payload Sync Execution
  const handleRunReclubSync = async (payloadToUse?: string) => {
    const raw = payloadToUse !== undefined ? payloadToUse : reclubInput;
    if (!raw.trim()) {
      alert('Please provide Reclub JSON, CSV, or roster text to synchronize.');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await syncReclubMembers(raw, reclubClubId || undefined);

      if (result.success || result.importedCount > 0 || result.updatedCount > 0) {
        setSyncResult({
          success: true,
          message: `Reclub sync complete: ${result.importedCount} new members added, ${result.updatedCount} existing members updated.`,
          imported: result.importedCount,
          updated: result.updatedCount,
        });
        await loadMembers();
      } else {
        setSyncResult({
          success: false,
          message: result.errors.join(' • ') || 'Reclub synchronization could not parse any member records.',
          imported: 0,
          updated: 0,
        });
      }
    } catch (err: any) {
      console.error('Reclub sync failure:', err);
      setSyncResult({
        success: false,
        message: `Sync error: ${err?.message || 'Network or Firestore transaction error'}`,
        imported: 0,
        updated: 0,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler: Check-in selected members into live session
  const handleCheckInSelected = async () => {
    if (!activeSessionId) {
      alert('No active session currently open to check in players.');
      return;
    }

    const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
    if (selectedMembers.length === 0) return;

    setIsCheckingIn(true);
    try {
      for (const m of selectedMembers) {
        await joinSessionAsParticipant(activeSessionId, {
          name: m.name,
          firstName: m.firstName,
          surname: m.surname,
          skillLevel: m.skillLevel,
          avatarUrl: m.avatarUrl,
        });
      }

      setCheckInSuccess(`Successfully checked in ${selectedMembers.length} member(s) into the live open-play queue!`);
      setSelectedMemberIds([]);
      if (onMembersAddedToQueue) onMembersAddedToQueue();
      setTimeout(() => setCheckInSuccess(null), 4000);
    } catch (err: any) {
      alert(`Could not check in members: ${err?.message || 'Error'}`);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    if (skillFilter !== 'all' && m.skillLevel !== skillFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="clay-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center clay-subcard shrink-0">
              <Users className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                  Club Member Management
                </h2>
                <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-xl clay-pill font-mono">
                  {members.length} Members
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Verified club membership roster, DUPR ratings & Reclub synchronization
              </p>
            </div>
          </div>

          {/* Action Buttons: Note NO "Load Demo Roster" button to prevent unauthorized injection */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowReclubModal(true)}
              className="px-3.5 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-slate-800 text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer hover:border-emerald-300"
            >
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              <span>Sync Reclub Roster</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-primary text-white text-xs font-black flex items-center gap-2 shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>

            {activeSessionId && selectedMemberIds.length > 0 && (
              <button
                onClick={handleCheckInSelected}
                disabled={isCheckingIn}
                className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-primary bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer animate-pulse"
              >
                <UserCheck className="w-4 h-4" />
                <span>Check In ({selectedMemberIds.length}) to Queue</span>
              </button>
            )}
          </div>
        </div>

        {/* Notices */}
        {deleteSuccessNotice && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{deleteSuccessNotice}</span>
          </div>
        )}

        {checkInSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{checkInSuccess}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              placeholder="Search member by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full clay-inset rounded-2xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <div className="clay-inset rounded-2xl px-2.5 py-1 text-slate-700 font-bold flex items-center gap-1">
              <span className="text-slate-400 text-[10px] uppercase">Skill:</span>
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value as any)}
                className="bg-transparent focus:outline-hidden text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="all">All Skills</option>
                <option value="beginner">Beginner (&lt; 3.0)</option>
                <option value="intermediate">Intermediate (3.0 - 4.0)</option>
                <option value="advanced">Advanced (4.0+)</option>
              </select>
            </div>

            <div className="clay-inset rounded-2xl px-2.5 py-1 text-slate-700 font-bold flex items-center gap-1">
              <span className="text-slate-400 text-[10px] uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent focus:outline-hidden text-xs font-bold text-slate-800 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Members</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="clay-card rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-bold">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading club membership roster...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-black text-slate-700 text-sm">No members found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
              {searchQuery
                ? 'No club members match your search criteria.'
                : 'Your club member roster is ready. Add members or sync directly from Reclub.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl clay-btn clay-btn-primary text-xs font-black shadow-xs"
              >
                Add First Member
              </button>
              <button
                onClick={() => setShowReclubModal(true)}
                className="px-4 py-2 rounded-xl clay-btn clay-btn-secondary text-xs font-black shadow-xs"
              >
                Sync Reclub Roster
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/70 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredMembers.length > 0 &&
                        filteredMembers.every((m) => selectedMemberIds.includes(m.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMemberIds(filteredMembers.map((m) => m.id));
                        } else {
                          setSelectedMemberIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      aria-label="Select all members"
                    />
                  </th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Skill Level / DUPR</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Games</th>
                  <th className="py-3 px-4 text-center">Win Rate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredMembers.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedMemberIds((prev) =>
                              prev.includes(member.id)
                                ? prev.filter((id) => id !== member.id)
                                : [...prev, member.id]
                            );
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          aria-label={`Select ${member.name}`}
                        />
                      </td>

                      {/* Name & Avatar */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                              {(member.name.trim() || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="block font-black text-sm">{member.name}</span>
                            {member.email && (
                              <span className="text-[11px] text-slate-400 font-mono block">
                                {member.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Skill & DUPR */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <SkillBadge skill={member.skillLevel} />
                          {member.duprRating && (
                            <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              DUPR {member.duprRating.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">
                        {member.source === 'reclub' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-xl bg-sky-100 text-sky-800 clay-pill">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <span>Reclub</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500">
                            Club Direct
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                            member.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>

                      {/* Games */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {member.gamesPlayed || 0}
                      </td>

                      {/* Win Rate */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                        {(member.gamesPlayed || 0) > 0 ? `${member.winRate}%` : '—'}
                      </td>

                      {/* Actions: Prominent Delete Member button as requested! */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setMemberToDelete(member)}
                          className="px-3 py-1.5 rounded-xl clay-btn clay-btn-danger text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs cursor-pointer hover:bg-rose-700 transition-colors"
                          title="Delete member from club roster"
                          aria-label={`Delete ${member.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Deleting Member */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="clay-card rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border-2 border-rose-300 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3.5 clay-subcard">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>

            <h3 className="font-black text-slate-900 text-base text-center">Delete Club Member?</h3>
            <p className="text-xs text-slate-600 text-center mt-1 leading-relaxed font-medium">
              Are you sure you want to delete <strong className="text-slate-900 font-bold">{memberToDelete.name}</strong> from the club roster?
              This action cannot be undone.
            </p>

            <div className="mt-5 space-y-2">
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full py-3 clay-btn clay-btn-danger text-white rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Member'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleting}
                className="w-full py-2.5 clay-btn clay-btn-secondary text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="clay-card rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-base">Add Club Member</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marcus"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                    Surname <span className="text-rose-500">*</span>
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vance"
                      value={newSurname}
                      onChange={(e) => setNewSurname(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="clay-inset rounded-2xl px-3 py-2">
                  <input
                    type="email"
                    placeholder="marcus@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                    DUPR Rating
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2">
                    <input
                      type="number"
                      step="0.05"
                      min="1.0"
                      max="7.0"
                      placeholder="e.g. 3.75"
                      value={newDupr}
                      onChange={(e) => setNewDupr(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                    Skill Tier
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2">
                    <select
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value as SkillLevel)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    >
                      <option value="beginner">Beginner (&lt; 3.0)</option>
                      <option value="intermediate">Intermediate (3.0 - 4.0)</option>
                      <option value="advanced">Advanced (4.0+)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newFirstName.trim() || !newSurname.trim()}
                  className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md disabled:opacity-40"
                >
                  {isSaving ? 'Saving...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reclub Sync Modal */}
      {showReclubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="clay-card rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs">
                  🎾
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Reclub Member Sync</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Import or synchronize club members, ratings, and DUPRs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReclubModal(false)}
                className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {syncResult && (
              <div
                className={`mb-4 p-3.5 rounded-2xl border text-xs font-bold ${
                  syncResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {syncResult.message}
              </div>
            )}

            {/* Segmented Mode Selector */}
            <div className="flex rounded-2xl bg-slate-100 p-1 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSyncTab('url')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'url'
                    ? 'bg-white text-emerald-800 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Web URL Link</span>
              </button>
              <button
                type="button"
                onClick={() => setSyncTab('paste')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'paste'
                    ? 'bg-white text-emerald-800 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Payload</span>
              </button>
              <button
                type="button"
                onClick={() => setSyncTab('file')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  syncTab === 'file'
                    ? 'bg-white text-emerald-800 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* TAB 1: SYNC VIA URL LINK */}
              {syncTab === 'url' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                      Reclub Club URL or Public Roster Link
                    </label>
                    <div className="clay-inset rounded-2xl px-3 py-2.5 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="url"
                        value={reclubUrl}
                        onChange={(e) => setReclubUrl(e.target.value)}
                        placeholder="https://reclub.co/clubs/sunset-pickleball or roster CSV URL"
                        className="w-full bg-transparent text-xs font-medium text-slate-900 focus:outline-hidden"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">
                      Syncs members directly via web URL link. Supports Reclub club URLs, API endpoints, and published spreadsheet CSV rosters.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                      Reclub Club ID or Slug (Optional)
                    </label>
                    <div className="clay-inset rounded-2xl px-3 py-2">
                      <input
                        type="text"
                        value={reclubClubId}
                        onChange={(e) => setReclubClubId(e.target.value)}
                        placeholder="e.g. sunset-pickleball-club"
                        className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowReclubModal(false)}
                      className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleRunReclubUrlSync}
                      disabled={isSyncing || !reclubUrl.trim()}
                      className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Fetching & Syncing...' : 'Sync from URL Link'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: PASTE PAYLOAD (NO DEMO INJECTION BUTTONS) */}
              {syncTab === 'paste' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                      Reclub Export Payload (JSON or CSV)
                    </label>
                    <div className="clay-inset rounded-2xl p-3">
                      <textarea
                        rows={6}
                        value={reclubInput}
                        onChange={(e) => setReclubInput(e.target.value)}
                        placeholder={`Paste Reclub JSON export or CSV text here:\n[\n  { "name": "Player Name", "email": "player@club.com", "duprRating": 3.75, "status": "active" }\n]`}
                        className="w-full bg-transparent text-xs font-mono font-medium text-slate-900 focus:outline-hidden resize-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Accepts Reclub JSON exports, nested API responses, or CSV lines (Name, Email, Rating, DUPR).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                      Reclub Club ID or Handle (Optional)
                    </label>
                    <div className="clay-inset rounded-2xl px-3 py-2">
                      <input
                        type="text"
                        value={reclubClubId}
                        onChange={(e) => setReclubClubId(e.target.value)}
                        placeholder="e.g. sunset-pickleball-club"
                        className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowReclubModal(false)}
                      className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunReclubSync()}
                      disabled={isSyncing || !reclubInput.trim()}
                      className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Synchronizing...' : 'Sync Members Now'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: FILE UPLOAD */}
              {syncTab === 'file' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-300 transition-colors">
                    <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <label className="block text-xs font-black text-slate-800 cursor-pointer mb-1">
                      <span>Click to upload roster file</span>
                      <input
                        type="file"
                        accept=".json,.csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Select your exported Reclub JSON, CSV, or text roster file from your device.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowReclubModal(false)}
                      className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
