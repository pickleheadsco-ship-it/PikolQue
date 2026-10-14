import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ClubMember, SkillLevel, ReclubSyncResult } from '../../types';

const MEMBERS_COLLECTION = 'club_members';
const SYNC_LOGS_COLLECTION = 'reclub_sync';

/**
 * Normalizes Reclub rating (numeric DUPR, rating strings, or tier labels) to standard SkillLevel
 */
export function normalizeReclubSkill(ratingInput: any): { skillLevel: SkillLevel; duprRating?: number } {
  if (ratingInput === undefined || ratingInput === null || ratingInput === '') {
    return { skillLevel: 'intermediate' };
  }

  // If already a numeric DUPR rating (e.g. 3.25, 4.0, 2.75)
  const num = typeof ratingInput === 'number' ? ratingInput : parseFloat(String(ratingInput).replace(/[^\d.]/g, ''));
  if (!isNaN(num) && num > 0) {
    if (num < 3.0) return { skillLevel: 'beginner', duprRating: num };
    if (num >= 4.15) return { skillLevel: 'advanced', duprRating: num };
    return { skillLevel: 'intermediate', duprRating: num };
  }

  const str = String(ratingInput).toLowerCase().trim();
  if (str.includes('beg') || str.includes('nov') || str.includes('2.') || str.includes('1.')) {
    return { skillLevel: 'beginner' };
  }
  if (str.includes('adv') || str.includes('expert') || str.includes('pro') || str.includes('4.') || str.includes('5.')) {
    return { skillLevel: 'advanced' };
  }
  return { skillLevel: 'intermediate' };
}

/**
 * Robust parser for various Reclub payload formats (JSON, nested API response, array, or CSV text)
 */
export function parseReclubData(rawInput: string | any): Partial<ClubMember>[] {
  const members: Partial<ClubMember>[] = [];

  // Case 1: Raw JSON string or Object
  if (typeof rawInput === 'object' && rawInput !== null) {
    return extractMembersFromParsedJson(rawInput);
  }

  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    // Try JSON parse first
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractMembersFromParsedJson(parsed);
      } catch (e) {
        console.warn('Reclub payload is not valid JSON, falling back to CSV/text parser');
      }
    }

    // Case 2: CSV / Text line parser
    const lines = trimmed.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    let isHeader = true;
    let nameIdx = 0;
    let emailIdx = -1;
    let skillIdx = -1;
    let duprIdx = -1;
    let statusIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Split by comma, tab, or semicolon (supporting quoted strings)
      const parts = line.split(/[,\t;]/).map((p) => p.replace(/^["']|["']$/g, '').trim());

      if (isHeader && (line.toLowerCase().includes('name') || line.toLowerCase().includes('email') || line.toLowerCase().includes('rating'))) {
        parts.forEach((header, idx) => {
          const h = header.toLowerCase();
          if (h.includes('name')) nameIdx = idx;
          if (h.includes('mail')) emailIdx = idx;
          if (h.includes('rating') || h.includes('skill') || h.includes('level')) skillIdx = idx;
          if (h.includes('dupr')) duprIdx = idx;
          if (h.includes('status')) statusIdx = idx;
        });
        isHeader = false;
        continue;
      }

      if (parts.length > 0 && parts[0]) {
        const rawName = parts[nameIdx] || parts[0];
        if (!rawName || rawName.length < 2) continue;

        // Skip headers if encountered again
        if (rawName.toLowerCase() === 'name' || rawName.toLowerCase() === 'first name') continue;

        const email = emailIdx !== -1 ? parts[emailIdx] : parts.find((p) => p.includes('@'));
        const skillRaw = skillIdx !== -1 ? parts[skillIdx] : duprIdx !== -1 ? parts[duprIdx] : undefined;
        const { skillLevel, duprRating } = normalizeReclubSkill(skillRaw);
        const nameParts = rawName.split(/\s+/);
        const firstName = nameParts[0] || 'Player';
        const surname = nameParts.slice(1).join(' ') || '';

        members.push({
          name: rawName,
          firstName,
          surname,
          email: email || undefined,
          skillLevel,
          duprRating,
          status: statusIdx !== -1 && parts[statusIdx]?.toLowerCase().includes('inact') ? 'inactive' : 'active',
          source: 'reclub',
        });
      }
    }
  }

  return members;
}

function extractMembersFromParsedJson(json: any): Partial<ClubMember>[] {
  const members: Partial<ClubMember>[] = [];

  // Check if Reclub wrapped in event attendees, group members, roster or plain array
  let list: any[] = [];
  if (Array.isArray(json)) {
    list = json;
  } else if (Array.isArray(json.attendees)) {
    list = json.attendees;
  } else if (Array.isArray(json.participants)) {
    list = json.participants;
  } else if (Array.isArray(json.confirmed)) {
    list = json.confirmed;
  } else if (Array.isArray(json.confirmed_attendees)) {
    list = json.confirmed_attendees;
  } else if (Array.isArray(json.confirmedPlayers)) {
    list = json.confirmedPlayers;
  } else if (Array.isArray(json.members)) {
    list = json.members;
  } else if (Array.isArray(json.data)) {
    list = json.data;
  } else if (json.event && Array.isArray(json.event.attendees)) {
    list = json.event.attendees;
  } else if (json.event && Array.isArray(json.event.participants)) {
    list = json.event.participants;
  } else if (json.event && Array.isArray(json.event.confirmed)) {
    list = json.event.confirmed;
  } else if (json.group && Array.isArray(json.group.members)) {
    list = json.group.members;
  } else if (json.group && Array.isArray(json.group.roster)) {
    list = json.group.roster;
  } else if (json.club && Array.isArray(json.club.members)) {
    list = json.club.members;
  } else if (json.club && Array.isArray(json.club.roster)) {
    list = json.club.roster;
  } else if (Array.isArray(json.players)) {
    list = json.players;
  } else if (Array.isArray(json.rsvps)) {
    list = json.rsvps;
  } else if (Array.isArray(json.registrations)) {
    list = json.registrations;
  }

  for (const item of list) {
    if (!item) continue;

    // Handle nested Reclub user object: { user: { first_name, last_name, avatar_url, email } }
    const userObj = item.user || item.player || item.profile || item;

    // Skip if explicitly on waitlist, declined, or cancelled for event RSVPs (only confirmed players added)
    const rawRsvp = String(item.rsvp_status || item.attendance || item.status || userObj.status || '').toLowerCase();
    if (rawRsvp.includes('waitlist') || rawRsvp.includes('decline') || rawRsvp.includes('cancel') || rawRsvp.includes('not_going')) {
      continue;
    }

    const firstName = userObj.first_name || userObj.firstName || '';
    const surname = userObj.last_name || userObj.lastName || userObj.surname || '';
    const fullName = userObj.name || userObj.full_name || `${firstName} ${surname}`.trim() || 'Club Member';

    const email = userObj.email || item.email || undefined;
    const phone = userObj.phone || userObj.phone_number || item.phone || undefined;
    const avatarUrl = userObj.avatar_url || userObj.avatarUrl || userObj.photo_url || item.avatar_url || undefined;
    const reclubId = String(item.id || item.reclub_id || userObj.id || userObj.user_id || '').trim();

    const rawRating = item.rating ?? item.skill_level ?? item.dupr_rating ?? item.dupr ?? userObj.rating ?? userObj.dupr;
    const { skillLevel, duprRating } = normalizeReclubSkill(rawRating);

    const statusVal = String(item.status || userObj.status || 'active').toLowerCase();
    const status: 'active' | 'inactive' | 'suspended' = statusVal.includes('inact')
      ? 'inactive'
      : statusVal.includes('suspend')
      ? 'suspended'
      : 'active';

    members.push({
      reclubId: reclubId || undefined,
      name: fullName,
      firstName: firstName || fullName.split(/\s+/)[0],
      surname: surname || fullName.split(/\s+/).slice(1).join(' '),
      email,
      phone,
      avatarUrl,
      skillLevel,
      duprRating,
      status,
      source: 'reclub',
    });
  }

  return members;
}

/**
 * Helper to strip all undefined values from an object before Firestore writes
 */
function cleanFirestoreObject<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean as T;
}

/**
 * Fetch all club members from Firestore
 */
export async function getClubMembers(): Promise<ClubMember[]> {
  try {
    const q = query(collection(db, MEMBERS_COLLECTION), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const list: ClubMember[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as ClubMember);
    });
    return list;
  } catch (err) {
    console.warn('Error reading club members from Firestore, checking localStorage cache:', err);
    try {
      const cached = localStorage.getItem('picklequeue_club_members');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  }
}

/**
 * Delete a member from the club management view
 */
export async function deleteClubMember(memberId: string): Promise<boolean> {
  if (!memberId) return false;

  // 1. Immediately clean local cache so UI updates with zero lag
  try {
    const cached = localStorage.getItem('picklequeue_club_members');
    if (cached) {
      const list: ClubMember[] = JSON.parse(cached);
      const filtered = list.filter((m) => m.id !== memberId);
      localStorage.setItem('picklequeue_club_members', JSON.stringify(filtered));
    }
  } catch (cacheErr) {
    console.warn('Error updating local member cache on delete:', cacheErr);
  }

  // 2. Delete document in Firestore
  try {
    const docRef = doc(db, MEMBERS_COLLECTION, memberId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Warning deleting member doc in Firestore (cleaned locally):', err);
  }

  return true;
}

/**
 * Add or update a single club member
 */
export async function saveClubMember(member: Partial<ClubMember> & { name: string }): Promise<ClubMember> {
  const memberId = member.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const cleanName = member.name.trim();
  const nameParts = cleanName.split(/\s+/);

  const memberData: ClubMember = {
    id: memberId,
    reclubId: member.reclubId || undefined,
    name: cleanName,
    firstName: member.firstName || nameParts[0] || 'Player',
    surname: member.surname || nameParts.slice(1).join(' ') || '',
    email: member.email?.trim() || undefined,
    phone: member.phone?.trim() || undefined,
    avatarUrl: member.avatarUrl || undefined,
    skillLevel: member.skillLevel || 'intermediate',
    duprRating: member.duprRating || undefined,
    status: member.status || 'active',
    membershipTier: member.membershipTier || 'Regular',
    source: member.source || 'manual',
    gamesPlayed: member.gamesPlayed || 0,
    wins: member.wins || 0,
    winRate: member.winRate || 0,
    updatedAt: serverTimestamp(),
    createdAt: member.createdAt || serverTimestamp(),
  };

  // Keep local cache synced
  try {
    const cached = localStorage.getItem('picklequeue_club_members');
    const list: ClubMember[] = cached ? JSON.parse(cached) : [];
    const existingIndex = list.findIndex((m) => m.id === memberId);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...memberData };
    } else {
      list.unshift(memberData);
    }
    localStorage.setItem('picklequeue_club_members', JSON.stringify(list));
  } catch (cacheErr) {
    console.warn('Error caching saved member locally:', cacheErr);
  }

  try {
    const docRef = doc(db, MEMBERS_COLLECTION, memberId);
    const sanitized = cleanFirestoreObject(memberData);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Could not write member to Firestore (saved locally):', err);
  }

  return memberData;
}

/**
 * Executes a full sync of Reclub member data into Firestore
 * Handles chunking, deduplication, and error diagnostics
 */
export async function syncReclubMembers(rawPayload: string | any, clubId?: string): Promise<ReclubSyncResult> {
  const errors: string[] = [];
  const parsedMembers = parseReclubData(rawPayload);

  if (parsedMembers.length === 0) {
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: ['No valid Reclub member records found in the provided payload. Please check format.'],
      syncedAt: new Date().toISOString(),
    };
  }

  // Load existing members for deduplication
  const existingMembers = await getClubMembers();
  const existingByEmail = new Map<string, ClubMember>();
  const existingByReclubId = new Map<string, ClubMember>();
  const existingByName = new Map<string, ClubMember>();

  for (const m of existingMembers) {
    if (m.email) existingByEmail.set(m.email.toLowerCase(), m);
    if (m.reclubId) existingByReclubId.set(m.reclubId, m);
    existingByName.set(m.name.toLowerCase().trim(), m);
  }

  let importedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  // Process in batches of 200 (Firestore limit is 500)
  const batchSize = 200;
  for (let i = 0; i < parsedMembers.length; i += batchSize) {
    const chunk = parsedMembers.slice(i, i + batchSize);
    const batch = writeBatch(db);

    for (const item of chunk) {
      if (!item.name) {
        failedCount++;
        continue;
      }

      // Check for match
      let targetId: string | null = null;
      let matchedExisting: ClubMember | undefined;

      if (item.reclubId && existingByReclubId.has(item.reclubId)) {
        matchedExisting = existingByReclubId.get(item.reclubId);
        targetId = matchedExisting!.id;
      } else if (item.email && existingByEmail.has(item.email.toLowerCase())) {
        matchedExisting = existingByEmail.get(item.email.toLowerCase());
        targetId = matchedExisting!.id;
      } else if (existingByName.has(item.name.toLowerCase().trim())) {
        matchedExisting = existingByName.get(item.name.toLowerCase().trim());
        targetId = matchedExisting!.id;
      }

      const isUpdate = Boolean(targetId);
      const idToUse = targetId || `mem-rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const memberDocRef = doc(db, MEMBERS_COLLECTION, idToUse);

      const record: ClubMember = {
        id: idToUse,
        reclubId: item.reclubId || matchedExisting?.reclubId || undefined,
        name: item.name.trim(),
        firstName: item.firstName || item.name.split(/\s+/)[0],
        surname: item.surname || item.name.split(/\s+/).slice(1).join(' '),
        email: item.email || matchedExisting?.email,
        phone: item.phone || matchedExisting?.phone,
        avatarUrl: item.avatarUrl || matchedExisting?.avatarUrl,
        skillLevel: item.skillLevel || matchedExisting?.skillLevel || 'intermediate',
        duprRating: item.duprRating || matchedExisting?.duprRating,
        status: item.status || matchedExisting?.status || 'active',
        membershipTier: item.membershipTier || matchedExisting?.membershipTier || 'Reclub Member',
        source: 'reclub',
        gamesPlayed: matchedExisting?.gamesPlayed || 0,
        wins: matchedExisting?.wins || 0,
        winRate: matchedExisting?.winRate || 0,
        lastSyncedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAt: matchedExisting?.createdAt || serverTimestamp(),
      };

      const sanitizedRecord = cleanFirestoreObject(record);
      batch.set(memberDocRef, sanitizedRecord, { merge: true });

      if (isUpdate) {
        updatedCount++;
      } else {
        importedCount++;
      }
    }

    try {
      await batch.commit();
    } catch (batchErr: any) {
      console.warn('Batch write encountered error, executing resilient document recovery:', batchErr);
      // Fallback: commit individually so one bad record never cancels the rest of the members
      let recoverySuccess = 0;
      for (const item of chunk) {
        if (!item.name) continue;
        try {
          let targetId = item.reclubId && existingByReclubId.has(item.reclubId)
            ? existingByReclubId.get(item.reclubId)!.id
            : item.email && existingByEmail.has(item.email.toLowerCase())
            ? existingByEmail.get(item.email.toLowerCase())!.id
            : existingByName.has(item.name.toLowerCase().trim())
            ? existingByName.get(item.name.toLowerCase().trim())!.id
            : `mem-rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          
          const memberDocRef = doc(db, MEMBERS_COLLECTION, targetId);
          const singleRecord = cleanFirestoreObject({
            id: targetId,
            reclubId: item.reclubId || undefined,
            name: item.name.trim(),
            firstName: item.firstName || item.name.split(/\s+/)[0],
            surname: item.surname || item.name.split(/\s+/).slice(1).join(' '),
            email: item.email || undefined,
            phone: item.phone || undefined,
            avatarUrl: item.avatarUrl || undefined,
            skillLevel: item.skillLevel || 'intermediate',
            duprRating: item.duprRating || undefined,
            status: item.status || 'active',
            membershipTier: item.membershipTier || 'Reclub Member',
            source: 'reclub',
            updatedAt: serverTimestamp(),
          });
          await setDoc(memberDocRef, singleRecord, { merge: true });
          recoverySuccess++;
        } catch (indivErr) {
          failedCount++;
        }
      }
      if (recoverySuccess === 0) {
        errors.push(`Sync write error: ${batchErr?.message || 'Database permission or format error'}`);
      }
    }
  }

  // Record sync status log
  const syncResult: ReclubSyncResult = {
    success: errors.length === 0,
    importedCount,
    updatedCount,
    failedCount,
    errors,
    syncedAt: new Date().toISOString(),
    syncedMembers: parsedMembers,
  };

  try {
    const syncLogRef = doc(db, SYNC_LOGS_COLLECTION, 'latest');
    await setDoc(syncLogRef, {
      ...syncResult,
      clubId: clubId || 'default',
      totalMembersInDb: existingMembers.length + importedCount,
      timestamp: serverTimestamp(),
    });
  } catch (logErr) {
    console.warn('Could not record reclub_sync status log:', logErr);
  }

  // Refresh local cache
  try {
    const updatedAll = await getClubMembers();
    localStorage.setItem('picklequeue_club_members', JSON.stringify(updatedAll));
  } catch {}

  return syncResult;
}

/**
 * Extracts embedded JSON or member records from an HTML page (e.g. Next.js __NEXT_DATA__, JSON-LD, or script tags)
 */
function extractFromHtml(html: string): any | null {
  // 1. Look for Schema.org JSON-LD
  const jsonLdRegex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let ldMatch;
  while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const ldObj = JSON.parse(ldMatch[1]);
      if (Array.isArray(ldObj?.attendee)) return ldObj.attendee;
      if (Array.isArray(ldObj?.member)) return ldObj.member;
      if (Array.isArray(ldObj?.participants)) return ldObj.participants;
    } catch {}
  }

  // 2. Look for Next.js __NEXT_DATA__
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (nextDataMatch && nextDataMatch[1]) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]);
      if (parsed?.props?.pageProps) {
        return parsed.props.pageProps;
      }
      return parsed;
    } catch {}
  }

  // 3. Look for window.__INITIAL_STATE__ or state blobs
  const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/i);
  if (stateMatch && stateMatch[1]) {
    try {
      return JSON.parse(stateMatch[1]);
    } catch {}
  }

  // 4. Look for any script tag containing "members" or "players" or "roster" or "attendees"
  const scriptRegex = /<script(?:\s+type="application\/json")?>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1]?.trim();
    if (content.startsWith('{') || content.startsWith('[')) {
      try {
        const candidate = JSON.parse(content);
        if (
          Array.isArray(candidate) ||
          Array.isArray(candidate?.members) ||
          Array.isArray(candidate?.attendees) ||
          Array.isArray(candidate?.confirmed) ||
          Array.isArray(candidate?.data) ||
          Array.isArray(candidate?.club?.members) ||
          Array.isArray(candidate?.club?.roster) ||
          Array.isArray(candidate?.event?.attendees) ||
          Array.isArray(candidate?.group?.members)
        ) {
          return candidate;
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Fetches and synchronizes Reclub member data directly from a web URL link.
 * Handles Reclub club URLs, event RSVP links, group pages, API endpoints, published Google Sheets CSV links, and hosted roster JSONs.
 */
export async function fetchAndSyncReclubFromUrl(rawUrl: string, fallbackClubId?: string): Promise<ReclubSyncResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: ['Please enter a valid Reclub club URL, event link, or roster URL.'],
      syncedAt: new Date().toISOString(),
    };
  }

  // Ensure protocol
  const fullUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;

  // Extract club or event identifier if present in URL (e.g. reclub.co/clubs/sunset-pickleball or reclub.co/events/xyz)
  let extractedClubId = fallbackClubId;
  const clubMatch = fullUrl.match(/reclub\.co\/(?:clubs|events|groups|c|m)\/([a-zA-Z0-9_\-]+)/i);
  if (clubMatch && clubMatch[1]) {
    extractedClubId = clubMatch[1];
  }

  let textPayload: string | null = null;
  let parsedPayload: any | null = null;
  let fetchErrorMsg = '';

  // Attempt 1: Direct fetch with timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/csv, text/plain, text/html, */*',
      },
    });
    clearTimeout(timer);

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        parsedPayload = await res.json();
      } else {
        textPayload = await res.text();
      }
    } else {
      fetchErrorMsg = `HTTP ${res.status}: ${res.statusText}`;
    }
  } catch (err: any) {
    fetchErrorMsg = err?.message || 'Network or CORS restriction';
  }

  // Attempt 2: Resilient CORS proxy fallback if direct fetch was blocked by browser
  if (!parsedPayload && (!textPayload || textPayload.length === 0)) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            parsedPayload = JSON.parse(text);
          } catch {
            textPayload = text;
          }
        } else {
          textPayload = text;
        }
      }
    } catch (proxyErr: any) {
      console.warn('Proxy fetch attempt failed:', proxyErr);
    }
  }

  // Attempt 3: Secondary CORS proxy
  if (!parsedPayload && (!textPayload || textPayload.length === 0)) {
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(fullUrl)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        textPayload = await res.text();
      }
    } catch (corsProxyErr) {
      console.warn('CORS proxy backup failed:', corsProxyErr);
    }
  }

  // Process fetched result
  if (parsedPayload) {
    return syncReclubMembers(parsedPayload, extractedClubId);
  }

  if (textPayload && textPayload.trim()) {
    const trimmedText = textPayload.trim();

    // Check if it's JSON text
    if ((trimmedText.startsWith('{') && trimmedText.endsWith('}')) || (trimmedText.startsWith('[') && trimmedText.endsWith(']'))) {
      try {
        const jsonObj = JSON.parse(trimmedText);
        return syncReclubMembers(jsonObj, extractedClubId);
      } catch {}
    }

    // Check if HTML page with embedded state
    if (trimmedText.includes('<html') || trimmedText.includes('<!DOCTYPE') || trimmedText.includes('<script')) {
      const extractedFromHtml = extractFromHtml(trimmedText);
      if (extractedFromHtml) {
        const result = await syncReclubMembers(extractedFromHtml, extractedClubId);
        if (result.success && (result.importedCount > 0 || result.updatedCount > 0)) {
          return result;
        }
      }
    }

    // Attempt standard CSV or line parser
    const result = await syncReclubMembers(trimmedText, extractedClubId);
    if (result.success && (result.importedCount > 0 || result.updatedCount > 0)) {
      return result;
    }
  }

  return {
    success: false,
    importedCount: 0,
    updatedCount: 0,
    failedCount: 0,
    errors: [
      `Could not sync roster directly from link: ${fetchErrorMsg || 'No public roster data returned from this URL.'} Please verify the link is accessible or paste the Reclub roster export directly.`,
    ],
    syncedAt: new Date().toISOString(),
  };
}
