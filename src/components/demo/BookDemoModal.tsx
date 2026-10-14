import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { DemoRequest } from '../../types';
import {
  Calendar,
  X,
  CheckCircle,
  Building,
  Mail,
  User,
  Phone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { firePickleballBurst } from '../../services/fx/pickleballBurst';

interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}

export const BookDemoModal: React.FC<BookDemoModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
}) => {
  const [clubName, setClubName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [numberOfCourts, setNumberOfCourts] = useState<number>(4);
  const [estimatedMembers, setEstimatedMembers] = useState('100-250 members');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName.trim() || !contactName.trim() || !email.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const demoData: DemoRequest = {
        clubName: clubName.trim(),
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        numberOfCourts: Number(numberOfCourts) || 4,
        estimatedMembers,
        notes: notes.trim() || undefined,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'demo_requests'), demoData);

      try {
        firePickleballBurst(window.innerWidth / 2, window.innerHeight * 0.4);
      } catch {}

      setSubmitted(true);
    } catch (err: any) {
      console.warn('Could not write demo request to Firestore, saving to local cache:', err);
      // Save locally as fallback
      try {
        const existing = JSON.parse(localStorage.getItem('picklequeue_demo_requests') || '[]');
        existing.push({
          clubName,
          contactName,
          email,
          phone,
          numberOfCourts,
          estimatedMembers,
          notes,
          submittedAt: new Date().toISOString(),
        });
        localStorage.setItem('picklequeue_demo_requests', JSON.stringify(existing));
        setSubmitted(true);
      } catch {
        setErrorMessage('Unable to submit demo request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="clay-card rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl border-2 border-emerald-400 animate-in zoom-in-95 duration-150">
        {submitted ? (
          <div className="p-7 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-md clay-subcard">
              <CheckCircle className="w-9 h-9 text-emerald-600" />
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full clay-pill">
                Request Confirmed
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                Demo Walkthrough Requested!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto mt-2 leading-relaxed">
                Thank you, <strong className="font-bold text-slate-900">{contactName}</strong>. Our team will review{' '}
                <strong className="font-bold text-slate-900">{clubName}</strong>'s court configuration and reach out to{' '}
                <strong className="font-bold text-emerald-800">{email}</strong> within 24 hours.
              </p>
            </div>

            <div className="p-4 clay-subcard rounded-2xl text-left text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Facility / Club:</span>
                <span className="font-black text-slate-900">{clubName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pickleball Courts:</span>
                <span className="font-black text-emerald-700">{numberOfCourts} Courts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member Base:</span>
                <span className="font-black text-slate-900">{estimatedMembers}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 clay-btn clay-btn-primary rounded-2xl text-xs sm:text-sm font-black shadow-md cursor-pointer"
              >
                Close & Return Home
              </button>
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLogin();
                  }}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Already have an authenticated admin account? Sign In
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-black uppercase tracking-wider mb-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-200" />
                <span>Enterprise & Club Access</span>
              </div>

              <h2 className="text-2xl font-black tracking-tight leading-tight">
                Book a Platform Demo
              </h2>
              <p className="text-xs text-white/90 font-semibold mt-1">
                Full system access is reserved for authenticated club admins. Schedule a walkthrough for your venue.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-bold">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Club / Facility Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2 flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pacific Pickle Club"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      required
                      placeholder="sarah@club.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Phone (Optional)
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Number of Courts
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      max="48"
                      value={numberOfCourts}
                      onChange={(e) => setNumberOfCourts(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Club Member Count
                  </label>
                  <div className="clay-inset rounded-2xl px-3 py-2">
                    <select
                      value={estimatedMembers}
                      onChange={(e) => setEstimatedMembers(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden"
                    >
                      <option value="Under 50 members">&lt; 50 members</option>
                      <option value="50-100 members">50 – 100 members</option>
                      <option value="100-250 members">100 – 250 members</option>
                      <option value="250-500 members">250 – 500 members</option>
                      <option value="500+ members">500+ members</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Venue Goals & Questions
                </label>
                <div className="clay-inset rounded-2xl p-2.5">
                  <textarea
                    rows={2}
                    placeholder="Tell us about your open-play schedule, Reclub integration, or current rotation bottlenecks..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium text-slate-900 focus:outline-hidden resize-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 clay-btn clay-btn-primary rounded-2xl text-xs sm:text-sm font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting Request...' : 'Submit Demo Request'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {onOpenLogin && (
                <div className="text-center pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLogin();
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Club Admin Sign In</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
