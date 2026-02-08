import { getSupabase, isSupabaseConfigured } from './supabase';
import type { Group, TermData } from '../types';

const GROUPS_TABLE = 'groups';
const TERMS_TABLE = 'terms';
const LOCAL_TERMS_KEY = 'lingocard_terms';
const LOCAL_GROUPS_KEY = 'lingocard_groups';

// ---------- 本地 fallback ----------
function getLocalTerms(): TermData[] {
  try {
    const s = localStorage.getItem(LOCAL_TERMS_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function getLocalGroups(): Group[] {
  try {
    const s = localStorage.getItem(LOCAL_GROUPS_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function setLocalTerms(terms: TermData[]) {
  localStorage.setItem(LOCAL_TERMS_KEY, JSON.stringify(terms));
}

function setLocalGroups(groups: Group[]) {
  localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(groups));
}

// ---------- 从 Supabase 拉取 ----------
export async function fetchGroups(): Promise<Group[]> {
  if (!isSupabaseConfigured()) return getLocalGroups();
  const supabase = await getSupabase();
  if (!supabase) return getLocalGroups();
  try {
    const { data, error } = await supabase.from(GROUPS_TABLE).select('*').order('created_at', { ascending: true });
    if (error) throw error;
    const list = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      isDefault: !!row.is_default,
    }));
    setLocalGroups(list);
    return list;
  } catch (e) {
    console.warn('Supabase fetch groups failed, using localStorage', e);
    return getLocalGroups();
  }
}

export async function fetchTerms(): Promise<TermData[]> {
  if (!isSupabaseConfigured()) return getLocalTerms();
  const supabase = await getSupabase();
  if (!supabase) return getLocalTerms();
  try {
    const { data, error } = await supabase.from(TERMS_TABLE).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const list = (data ?? []).map((row: any) => ({
      id: row.id,
      term: row.term,
      phonetic: row.phonetic ?? '',
      termTranslation: row.term_translation ?? undefined,
      definitionEn: row.definition_en ?? '',
      definitionCn: row.definition_cn ?? '',
      example: row.example ?? '',
      wrongDefinitions: Array.isArray(row.wrong_definitions) ? row.wrong_definitions : [],
      groupId: row.group_id,
      createdAt: row.created_at ?? 0,
      status: row.status ?? 'new',
      nextReviewDate: row.next_review_date ?? Date.now(),
      reviewStage: row.review_stage ?? 0,
      consecutiveFailures: row.consecutive_failures ?? 0,
    }));
    setLocalTerms(list);
    return list;
  } catch (e) {
    console.warn('Supabase fetch terms failed, using localStorage', e);
    return getLocalTerms();
  }
}

// ---------- 写入 Supabase（并同步到本地） ----------
export async function persistGroups(groups: Group[]): Promise<void> {
  setLocalGroups(groups);
  if (!isSupabaseConfigured()) return;
  const supabase = await getSupabase();
  if (!supabase) return;
  try {
    const rows = groups.map((g) => ({
      id: g.id,
      name: g.name,
      is_default: g.isDefault,
    }));
    await supabase.from(GROUPS_TABLE).upsert(rows, { onConflict: 'id' });
  } catch (e) {
    console.warn('Supabase persist groups failed', e);
  }
}

export async function persistTerms(terms: TermData[]): Promise<void> {
  setLocalTerms(terms);
  if (!isSupabaseConfigured()) return;
  const supabase = await getSupabase();
  if (!supabase) return;
  try {
    const rows = terms.map((t) => ({
      id: t.id,
      term: t.term,
      phonetic: t.phonetic ?? '',
      term_translation: t.termTranslation ?? null,
      definition_en: t.definitionEn ?? '',
      definition_cn: t.definitionCn ?? '',
      example: t.example ?? '',
      wrong_definitions: t.wrongDefinitions ?? [],
      group_id: t.groupId,
      created_at: t.createdAt,
      status: t.status ?? 'new',
      next_review_date: t.nextReviewDate,
      review_stage: t.reviewStage ?? 0,
      consecutive_failures: t.consecutiveFailures ?? 0,
    }));
    await supabase.from(TERMS_TABLE).upsert(rows, { onConflict: 'id' });
  } catch (e) {
    console.warn('Supabase persist terms failed', e);
  }
}
