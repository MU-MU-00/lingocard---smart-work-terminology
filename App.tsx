
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Group, TermData, SwipeDirection, AppView } from './types';
import { generateTermDetails, playPronunciation } from './services/geminiService';
import { fetchTerms, fetchGroups, persistTerms, persistGroups } from './services/supabaseData';
import {
  exportGroup,
  parseImportFile,
  FORMAT_OPTIONS,
  FORMAT_DESCRIPTIONS,
  type ExportFormat,
  guessFormatFromFilename,
} from './services/exportImport';
import SwipeCard from './components/SwipeCard';
import Sidebar from './components/Sidebar';
import ReviewSession from './components/ReviewSession';
import GroupDetail from './components/GroupDetail';
import { Loader2, Plus, X, FolderOpen, Check, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_GROUPS: Group[] = [
  { id: 'default', name: 'Default Group', isDefault: true },
  { id: 'group-1', name: 'Tech Terms', isDefault: false },
];

function getInitialTerms(): TermData[] {
  try {
    const s = localStorage.getItem('lingocard_terms');
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function getInitialGroups(): Group[] {
  try {
    const s = localStorage.getItem('lingocard_groups');
    return s ? JSON.parse(s) : DEFAULT_GROUPS;
  } catch {
    return DEFAULT_GROUPS;
  }
}

const CHECKIN_LAST_KEY = 'lingocard_checkin_last';
const CHECKIN_STREAK_KEY = 'lingocard_checkin_streak';

function getCheckinState(): { streak: number; lastDate: string } {
  try {
    const last = localStorage.getItem(CHECKIN_LAST_KEY) || '';
    const streak = parseInt(localStorage.getItem(CHECKIN_STREAK_KEY) || '0', 10) || 0;
    return { streak, lastDate: last };
  } catch {
    return { streak: 0, lastDate: '' };
  }
}

function recordCheckin(): number {
  const today = new Date().toISOString().slice(0, 10);
  const { streak, lastDate } = getCheckinState();
  if (lastDate === today) return streak;
  let next = 1;
  if (lastDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    next = lastDate === yesterdayStr ? streak + 1 : 1;
  }
  try {
    localStorage.setItem(CHECKIN_LAST_KEY, today);
    localStorage.setItem(CHECKIN_STREAK_KEY, String(next));
  } catch (_) {}
  return next;
}

export default function App() {
  const [terms, setTerms] = useState<TermData[]>(getInitialTerms);
  const [groups, setGroups] = useState<Group[]>(getInitialGroups);
  const [dataReady, setDataReady] = useState(false);

  const [inputTerm, setInputTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<Omit<TermData, 'groupId' | 'createdAt' | 'status' | 'nextReviewDate' | 'reviewStage' | 'consecutiveFailures'> | null>(null);
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [selectedReviewGroupId, setSelectedReviewGroupId] = useState<string | null>(null);
  const [preSelectedSaveGroup, setPreSelectedSaveGroup] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [sidebarEditMode, setSidebarEditMode] = useState(false);
  const [groupsOrderSnapshot, setGroupsOrderSnapshot] = useState<Group[] | null>(null);
  const [exportModalGroupId, setExportModalGroupId] = useState<string | null>(null);
  const [exportStep, setExportStep] = useState<'format' | 'filename'>('format');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportFilename, setExportFilename] = useState('');
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<Group | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTargetGroupId, setImportTargetGroupId] = useState<string | 'new' | null>(null);
  const [importFromGroupId, setImportFromGroupId] = useState<string | null>(null);
  const pendingImportFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinStreak, setCheckinStreak] = useState(0);

  // 首屏从 Supabase 拉取（若已配置），否则用本地缓存
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [nextTerms, nextGroups] = await Promise.all([fetchTerms(), fetchGroups()]);
      if (cancelled) return;
      setTerms(nextTerms);
      if (nextGroups.length > 0) {
        setGroups(nextGroups);
      } else {
        setGroups(DEFAULT_GROUPS);
        await persistGroups(DEFAULT_GROUPS);
      }
      setDataReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Fixed viewport height for consistent mobile experience
  useEffect(() => {
    const setVh = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    persistTerms(terms);
  }, [terms, dataReady]);

  useEffect(() => {
    if (!dataReady) return;
    persistGroups(groups);
  }, [groups, dataReady]);

  const handleGenerate = async () => {
    if (!inputTerm.trim()) return;
    setIsGenerating(true);
    setGeneratedCard(null);
    try {
      const data = await generateTermDetails(inputTerm);
      setGeneratedCard(data);
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error('Generate error:', e);
      alert(errorMsg || "生成失败：请检查网络，或在 .env.local 中配置有效的 GEMINI_API_KEY（豆包 API 密钥）。");
    } finally {
      setIsGenerating(false);
      setInputTerm('');
    }
  };

  const saveTerm = (card: any, groupId: string) => {
    const newTerm: TermData = {
      ...card,
      groupId,
      createdAt: Date.now(),
      status: 'new',
      nextReviewDate: Date.now(),
      reviewStage: 0,
      consecutiveFailures: 0
    };
    setTerms(prev => [newTerm, ...prev]);
    setGeneratedCard(null);
    setPreSelectedSaveGroup(null);
    setShowGroupSelector(false);
  };

  const handleSwipe = (direction: SwipeDirection) => {
    if (!generatedCard) return;
    if (direction === SwipeDirection.UP) setGeneratedCard(null);
    else if (direction === SwipeDirection.DOWN) saveTerm(generatedCard, preSelectedSaveGroup || 'default');
    else if (direction === SwipeDirection.RIGHT) setShowGroupSelector(true);
  };

  const handleUpdateTerm = (id: string, updates: Partial<TermData>) => {
    setTerms(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTerm = (id: string) => {
    setTerms(prev => prev.filter(t => t.id !== id));
  };

  const [pendingNewGroupCallback, setPendingNewGroupCallback] = useState<((newGroupId: string) => void) | null>(null);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const newGroup: Group = { id: uuidv4(), name: newGroupName, isDefault: false };
    setGroups(prev => [...prev, newGroup]);
    if (pendingNewGroupCallback) {
      pendingNewGroupCallback(newGroup.id);
      setPendingNewGroupCallback(null);
    } else if (generatedCard) saveTerm(generatedCard, newGroup.id);
    setIsNewGroupModalOpen(false);
    setNewGroupName('');

    const fileToImport = pendingImportFileRef.current;
    if (fileToImport) {
      pendingImportFileRef.current = null;
      const format = guessFormatFromFilename(fileToImport.name) || 'json';
      try {
        const { terms: parsed } = await parseImportFile(fileToImport, format);
        const valid = parsed.filter(t => String(t?.term ?? '').trim());
        if (valid.length === 0) {
          alert('文件内容不符合或无法识别为有效词条，未导入。');
          return;
        }
        const newTerms: TermData[] = valid.map(t => ({
          ...t,
          id: uuidv4(),
          groupId: newGroup.id,
          createdAt: Date.now(),
          status: 'new' as const,
          nextReviewDate: Date.now(),
          reviewStage: 0,
          consecutiveFailures: 0,
        }));
        setTerms(prev => [...newTerms, ...prev]);
      } catch (err) {
        console.error(err);
        alert('导入失败，请检查文件格式。');
      }
    }
  };

  const handleMoveTerm = (termId: string, newGroupId: string) => {
    setTerms(prev => prev.map(t => t.id === termId ? { ...t, groupId: newGroupId } : t));
  };

  const handleCheckinAndReview = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    const streak = recordCheckin();
    setCheckinStreak(streak);
    setShowCheckinModal(true);
  };

  const handleCheckinDaily = () => {
    setShowCheckinModal(false);
    setView(AppView.REVIEW_SELECTION);
  };

  const handleReorderTerms = (orderedTermIds: string[]) => {
    if (!selectedGroupId) return;
    setTerms(prev => {
      const firstIdx = prev.findIndex(t => t.groupId === selectedGroupId);
      if (firstIdx === -1) return prev;
      const groupIndices = prev.map((_, i) => i).filter(i => prev[i].groupId === selectedGroupId);
      const groupTerms = groupIndices.map(i => prev[i]);
      const orderMap = new Map(orderedTermIds.map((id, i) => [id, i]));
      const reordered = [...groupTerms].sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
      const before = prev.slice(0, firstIdx);
      const after = prev.slice(firstIdx + groupTerms.length);
      return [...before, ...reordered, ...after];
    });
  };

  const handleSidebarGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    setView(AppView.GROUP_DETAIL);
  };

  const handleReorderGroups = (newGroups: Group[]) => {
    setGroups(newGroups);
  };

  const handleDeleteGroupConfirm = () => {
    if (!deleteConfirmGroup) return;
    const id = deleteConfirmGroup.id;
    setTerms(prev => prev.filter(t => t.groupId !== id));
    setGroups(prev => prev.filter(g => g.id !== id));
    setDeleteConfirmGroup(null);
    if (selectedGroupId === id) {
      setSelectedGroupId(null);
      setView(AppView.HOME);
    }
  };

  const handleExportGroup = (groupId: string) => {
    setExportModalGroupId(groupId);
    setExportStep('format');
    setExportFormat('json');
    const g = groups.find(x => x.id === groupId);
    const defaultName = g ? `${g.name}_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}` : 'export';
    setExportFilename(defaultName);
  };

  const handleExportConfirm = () => {
    if (!exportModalGroupId) return;
    const g = groups.find(x => x.id === exportModalGroupId);
    if (!g) return;
    if (exportStep === 'format') {
      setExportStep('filename');
      return;
    }
    exportGroup(g, terms, exportFormat, exportFilename);
    setExportModalGroupId(null);
    setExportStep('format');
  };

  const triggerImportFile = (fromGroupId: string | null) => {
    setImportFromGroupId(fromGroupId);
    setImportFile(null);
    setImportTargetGroupId(null);
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportFile(file);
    setImportTargetGroupId(null);
  };

  const handleImportConfirm = async () => {
    if (!importFile || importTargetGroupId === null) return;
    const format = guessFormatFromFilename(importFile.name) || 'json';
    try {
      const { terms: parsed, groupName } = await parseImportFile(importFile, format);
      const valid = parsed.filter(t => String(t?.term ?? '').trim());
      if (valid.length === 0) {
        alert('文件内容不符合或无法识别为有效词条（需至少包含术语），拒绝导入。');
        return;
      }
      let targetId = importTargetGroupId;
      if (importTargetGroupId === 'new') {
        const newGroup: Group = { id: uuidv4(), name: groupName || '导入的词库', isDefault: false };
        setGroups(prev => [...prev, newGroup]);
        targetId = newGroup.id;
      }
      const newTerms: TermData[] = valid.map(t => ({
        ...t,
        id: uuidv4(),
        groupId: targetId as string,
        createdAt: Date.now(),
        status: 'new' as const,
        nextReviewDate: Date.now(),
        reviewStage: 0,
        consecutiveFailures: 0,
      }));
      setTerms(prev => [...newTerms, ...prev]);
      setImportFile(null);
      setImportTargetGroupId(null);
      setImportFromGroupId(null);
    } catch (err) {
      console.error(err);
      alert('文件格式错误或内容不符合要求，拒绝导入。请检查文件格式与内容。');
    }
  };

  const handleBack = () => {
    if (view === AppView.GROUP_DETAIL) {
      setView(AppView.HOME);
      setSelectedGroupId(null);
    } else if (view === AppView.REVIEW_SELECTION) {
      setView(AppView.HOME);
    } else if (view === AppView.REVIEW_SESSION) {
      setView(AppView.REVIEW_SELECTION);
    }
  };

  const getReviewableTerms = (groupId: string | null) => {
    const now = Date.now();
    let pool = terms.filter(t => t.nextReviewDate <= now);
    if (groupId) pool = pool.filter(t => t.groupId === groupId);
    return pool.sort((a, b) => a.nextReviewDate - b.nextReviewDate);
  };

  const handleReviewComplete = (results: { termId: string; success: boolean }[]) => {
    setTerms(prev => prev.map(term => {
      const result = results.find(r => r.termId === term.id);
      if (!result) return term;

      let nextStage = term.reviewStage;
      let nextReviewDate = term.nextReviewDate;
      let status = term.status;

      if (result.success) {
        nextStage = Math.min(5, term.reviewStage + 1);
        status = 'learned';
        const intervals = [1, 2, 4, 7, 14, 21];
        nextReviewDate = Date.now() + (intervals[term.reviewStage] || 1) * 24 * 60 * 60 * 1000;
      } else {
        nextStage = 0;
        status = 'learning';
        nextReviewDate = Date.now() + 12 * 60 * 60 * 1000;
      }

      return {
        ...term,
        reviewStage: nextStage,
        nextReviewDate,
        status: status as any
      };
    }));
    setView(AppView.HOME);
  };

  return (
    <div className="bg-orange-50 font-sans text-gray-900 overflow-hidden flex" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.txt,.md,.xlsx,.xls,.doc,.docx"
        className="hidden"
        onChange={handleImportFileChange}
      />
      <Sidebar 
        groups={groups}
        onSelectGroup={handleSidebarGroupSelect}
        selectedGroupId={selectedGroupId}
        onAddNewGroup={() => setIsNewGroupModalOpen(true)}
        onImportFromSidebar={() => triggerImportFile(null)}
        editMode={sidebarEditMode}
        onToggleEditMode={() => setSidebarEditMode(false)}
        onEnterEditMode={() => { setGroupsOrderSnapshot([...groups]); setSidebarEditMode(true); }}
        onReorderGroups={handleReorderGroups}
      />

      <div className="flex-1 relative h-full flex flex-col overflow-hidden">
        {/* 编辑词库顺序时，页面中央显示「保存顺序」和「退出编辑」 */}
        {sidebarEditMode && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto flex gap-4">
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => { setSidebarEditMode(false); setGroupsOrderSnapshot(null); }}
                className="touch-target px-8 py-4 rounded-2xl bg-orange-500 text-white font-bold shadow-lg hover:bg-orange-600 active:scale-95 transition-all"
              >
                保存顺序
              </motion.button>
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  if (groupsOrderSnapshot) setGroups(groupsOrderSnapshot);
                  setSidebarEditMode(false);
                  setGroupsOrderSnapshot(null);
                }}
                className="touch-target px-8 py-4 rounded-2xl bg-gray-500 text-white font-bold shadow-lg hover:bg-gray-600 active:scale-95 transition-all"
              >
                退出编辑
              </motion.button>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {view === AppView.HOME && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 flex flex-col relative bg-gray-50"
            >
              <div className="flex-none flex justify-end items-center pr-4 pt-4 pb-1">
                {(() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const { streak, lastDate } = getCheckinState();
                  const alreadyCheckedInToday = lastDate === today;
                  if (alreadyCheckedInToday) {
                    return (
                      <span className="px-4 py-2.5 rounded-xl bg-orange-50 text-orange-600 text-sm font-bold">
                        已打卡{streak}天
                      </span>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={handleCheckinAndReview}
                      className="touch-target px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold shadow-sm hover:bg-orange-600 active:scale-[0.98] transition-all"
                    >
                      打卡并开始复习
                    </button>
                  );
                })()}
              </div>
              {generatedCard ? (
                  <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
                      <div className="relative w-full h-[500px] max-w-sm">
                          <SwipeCard 
                              data={generatedCard} 
                              onSwipe={handleSwipe}
                              onPlayAudio={playPronunciation}
                              onUpdate={(updates) => setGeneratedCard(prev => prev ? {...prev, ...updates} : null)}
                          />
                          <button 
                            type="button"
                            onClick={() => setGeneratedCard(null)} 
                            className="absolute -top-12 right-0 touch-target min-w-[44px] min-h-[44px] flex items-center justify-center text-white font-bold bg-black/20 rounded-full active:scale-90 transition-transform"
                          >
                            <X size={24} />
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 max-w-lg mx-auto w-full">
                      <div className="text-center mb-4">
                          <h1 className="text-3xl font-black text-gray-800 tracking-tight">LingoCard</h1>
                          <p className="text-gray-400 text-sm">
                            {preSelectedSaveGroup ? `Adding to: ${groups.find(g => g.id === preSelectedSaveGroup)?.name}` : 'Master your work terminology'}
                          </p>
                      </div>
                      <div className="w-full relative shadow-xl rounded-2xl bg-white border border-gray-100 overflow-hidden group focus-within:ring-2 ring-orange-300 transition-all">
                          <input 
                              type="text" 
                              value={inputTerm}
                              onChange={(e) => setInputTerm(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                              placeholder="Type a term to learn..."
                              className="w-full py-6 px-6 outline-none text-lg text-gray-700 placeholder-gray-300 text-center font-medium"
                              disabled={isGenerating}
                          />
                          <button 
                            type="button"
                            onClick={handleGenerate} 
                            disabled={isGenerating || !inputTerm} 
                            className="absolute right-2 top-2 bottom-2 min-w-[48px] min-h-[48px] aspect-square bg-gray-100 hover:bg-orange-500 hover:text-white rounded-xl text-gray-400 flex items-center justify-center transition-colors active:scale-95"
                          >
                              {isGenerating ? <Loader2 className="animate-spin" /> : <Plus />}
                          </button>
                      </div>
                      <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setView(AppView.REVIEW_SELECTION)}
                          className="w-full h-24 bg-white rounded-3xl shadow-lg border-2 border-gray-100 flex items-center justify-between px-8 text-gray-700 hover:border-orange-500 hover:text-orange-500 transition-all"
                      >
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                                   <FolderOpen size={24} />
                              </div>
                              <div className="text-left">
                                  <div className="font-bold text-lg">Daily Review</div>
                                  <div className="text-sm text-gray-400">{getReviewableTerms(null).length} cards pending</div>
                              </div>
                          </div>
                          <Check className="text-gray-200" />
                      </motion.button>
                  </div>
              )}
            </motion.div>
          )}

          {view === AppView.REVIEW_SELECTION && (
            <motion.div key="review-selection" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex-1 bg-white p-6 overflow-y-auto">
              <div className="flex items-center mb-8">
                <button type="button" onClick={handleBack} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center mr-2 hover:bg-gray-100 rounded-full active:bg-gray-200"><X size={24} /></button>
                <h1 className="text-2xl font-bold">Select Group</h1>
              </div>
              <div className="space-y-4">
                <button 
                  onClick={() => { setSelectedReviewGroupId(null); setView(AppView.REVIEW_SESSION); }}
                  className="w-full p-6 rounded-2xl border-2 border-gray-100 text-left hover:border-orange-500 transition-colors flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">Review All Groups</h3>
                    <p className="text-sm text-gray-500">{getReviewableTerms(null).length} items ready</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500"><Check size={20} /></div>
                </button>
                {groups.map(g => (
                  <button 
                    key={g.id}
                    onClick={() => { setSelectedReviewGroupId(g.id); setView(AppView.REVIEW_SESSION); }}
                    className="w-full p-6 rounded-2xl border-2 border-gray-100 text-left hover:border-orange-500 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{g.name}</h3>
                      <p className="text-sm text-gray-500">{getReviewableTerms(g.id).length} items ready</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {view === AppView.REVIEW_SESSION && (
            <motion.div key="review-session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
              <ReviewSession 
                terms={getReviewableTerms(selectedReviewGroupId)}
                onComplete={handleReviewComplete}
                onExit={handleBack}
              />
            </motion.div>
          )}

          {view === AppView.GROUP_DETAIL && selectedGroupId && (
            <motion.div key="group-detail" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex-1 min-h-0 flex flex-col">
              <GroupDetail 
                group={groups.find(g => g.id === selectedGroupId)!}
                groups={groups}
                terms={terms.filter(t => t.groupId === selectedGroupId)}
                onBack={handleBack}
                onPlayAudio={playPronunciation}
                onDeleteTerm={handleDeleteTerm}
                onUpdateTerm={handleUpdateTerm}
                onMoveTerm={handleMoveTerm}
                onOpenNewGroupForMove={(cb) => { setPendingNewGroupCallback(() => cb); setIsNewGroupModalOpen(true); }}
                onAddNewTerm={() => { setPreSelectedSaveGroup(selectedGroupId); setView(AppView.HOME); }}
                onReorderTerms={handleReorderTerms}
                onRequestDeleteGroup={() => setDeleteConfirmGroup(groups.find(g => g.id === selectedGroupId) || null)}
                onRequestExportGroup={() => selectedGroupId && handleExportGroup(selectedGroupId)}
                onRequestImportGroup={() => selectedGroupId && triggerImportFile(selectedGroupId)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 打卡弹窗 */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={() => setShowCheckinModal(false)}>
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
          >
            <p className="text-gray-600 text-lg mb-6">已打卡 <span className="font-bold text-orange-500">{checkinStreak}</span> 天</p>
            <button
              type="button"
              onClick={handleCheckinDaily}
              className="w-full py-4 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 active:scale-[0.98] transition-all touch-target"
            >
              daily
            </button>
          </motion.div>
        </div>
      )}

      {/* Modal for creating a new group */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-6">New Group</h2>
            <input 
              type="text" 
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full p-4 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-orange-500 mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button
              onClick={() => {
                if (pendingImportFileRef.current) {
                  setImportFile(pendingImportFileRef.current);
                  pendingImportFileRef.current = null;
                }
                setPendingNewGroupCallback(null);
                setIsNewGroupModalOpen(false);
              }}
              className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
              <button onClick={handleCreateGroup} className="flex-1 py-4 font-bold text-white bg-orange-500 rounded-xl">Create</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating group selector for saving a newly generated term */}
      {showGroupSelector && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Save to Group</h2>
              <button onClick={() => setShowGroupSelector(false)} className="p-2"><X size={24} /></button>
            </div>
            <div className="space-y-3">
              {groups.map(g => (
                <button 
                  key={g.id}
                  onClick={() => saveTerm(generatedCard, g.id)}
                  className="w-full p-4 rounded-xl bg-gray-50 text-left font-bold hover:bg-orange-50 hover:text-orange-500 transition-colors flex items-center justify-between"
                >
                  {g.name}
                  <Plus size={18} />
                </button>
              ))}
              <button 
                onClick={() => { setShowGroupSelector(false); setIsNewGroupModalOpen(true); }}
                className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 font-bold hover:border-orange-500 hover:text-orange-500 transition-colors"
              >
                + Create New Group
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 删除词库确认 */}
      {deleteConfirmGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-2">确认删除词库</h2>
            <p className="text-gray-600 mb-6">删除「{deleteConfirmGroup.name}」后，该词库下所有词条将一并删除，且无法恢复。确定继续？</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmGroup(null)} className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl">取消</button>
              <button onClick={handleDeleteGroupConfirm} className="flex-1 py-4 font-bold text-white bg-red-500 rounded-xl">确认删除</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 导出词库：选择格式 + 问号说明 → 命名文件 → 确认 */}
      {exportModalGroupId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative">
            <h2 className="text-xl font-bold mb-4">导出词库</h2>
            {exportStep === 'format' ? (
              <>
                <p className="text-gray-600 text-sm mb-3">选择导出格式</p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 flex flex-wrap gap-2">
                    {FORMAT_OPTIONS.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setExportFormat(f.id)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium ${exportFormat === f.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFormatHelp(!showFormatHelp)}
                    className="touch-target min-w-[44px] min-h-[44px] rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                    title="各格式说明"
                  >
                    <HelpCircle size={22} />
                  </button>
                </div>
                {showFormatHelp && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-xl text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto">
                    {FORMAT_OPTIONS.map(f => (
                      <p key={f.id}><strong>{f.label}</strong>：{FORMAT_DESCRIPTIONS[f.id]}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-600 text-sm mb-2">文件名（不含扩展名将自动补全）</p>
                <input
                  type="text"
                  value={exportFilename}
                  onChange={(e) => setExportFilename(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-xl outline-none border-2 border-transparent focus:border-orange-500 mb-4"
                  placeholder="词库名_时间"
                />
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setExportModalGroupId(null); setExportStep('format'); setShowFormatHelp(false); }}
                className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl"
              >
                取消
              </button>
              <button onClick={handleExportConfirm} className="flex-1 py-4 font-bold text-white bg-orange-500 rounded-xl">
                {exportStep === 'format' ? '下一步' : '确认导出'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 导入词库：已选文件后选择导入到哪个词库或新建 */}
      {importFile && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">导入词库</h2>
              <button onClick={() => { setImportFile(null); setImportTargetGroupId(null); setImportFromGroupId(null); }} className="p-2"><X size={24} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">已选择文件：{importFile.name}。请选择导入到哪个词库，或新建词库。</p>
            <div className="space-y-2">
              {importFromGroupId ? (
                <>
                  <button
                    type="button"
                    onClick={() => setImportTargetGroupId(importFromGroupId)}
                    className={`w-full p-4 rounded-xl text-left font-bold transition-colors touch-target ${importTargetGroupId === importFromGroupId ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 hover:bg-orange-50'}`}
                  >
                    导入到当前词库（{groups.find(g => g.id === importFromGroupId)?.name}）
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      pendingImportFileRef.current = importFile;
                      setImportFile(null);
                      setImportTargetGroupId(null);
                      setImportFromGroupId(null);
                      setIsNewGroupModalOpen(true);
                      setNewGroupName('');
                    }}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-orange-300 text-orange-600 font-bold hover:bg-orange-50 transition-colors touch-target"
                  >
                    + 新建词库（创建后自动导入）
                  </button>
                </>
              ) : (
                <>
                  {groups.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setImportTargetGroupId(g.id)}
                      className={`w-full p-4 rounded-xl text-left font-bold transition-colors touch-target ${importTargetGroupId === g.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 hover:bg-orange-50'}`}
                    >
                      {g.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      pendingImportFileRef.current = importFile;
                      setImportFile(null);
                      setImportTargetGroupId(null);
                      setImportFromGroupId(null);
                      setIsNewGroupModalOpen(true);
                      setNewGroupName('');
                    }}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-orange-300 text-orange-600 font-bold hover:bg-orange-50 transition-colors touch-target"
                  >
                    + 新建词库（创建后自动导入）
                  </button>
                </>
              )}
            </div>
            <button
              onClick={handleImportConfirm}
              disabled={importTargetGroupId === null}
              className="w-full mt-4 py-4 font-bold text-white bg-orange-500 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认导入
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
