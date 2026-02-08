
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Group, TermData, SwipeDirection, AppView } from './types';
import { generateTermDetails, playPronunciation } from './services/geminiService';
import SwipeCard from './components/SwipeCard';
import Sidebar from './components/Sidebar';
import ReviewSession from './components/ReviewSession';
import GroupDetail from './components/GroupDetail';
import { Loader2, Plus, X, FolderOpen, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_GROUPS: Group[] = [
  { id: 'default', name: 'Default Group', isDefault: true },
  { id: 'group-1', name: 'Tech Terms', isDefault: false },
];

// Exporting App as default to fix the import error in index.tsx
export default function App() {
  const [terms, setTerms] = useState<TermData[]>(() => {
    const saved = localStorage.getItem('lingocard_terms');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem('lingocard_groups');
    return saved ? JSON.parse(saved) : DEFAULT_GROUPS;
  });

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
    localStorage.setItem('lingocard_terms', JSON.stringify(terms));
  }, [terms]);

  useEffect(() => {
    localStorage.setItem('lingocard_groups', JSON.stringify(groups));
  }, [groups]);

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

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: Group = { id: uuidv4(), name: newGroupName, isDefault: false };
    setGroups(prev => [...prev, newGroup]);
    if (generatedCard) saveTerm(generatedCard, newGroup.id);
    setIsNewGroupModalOpen(false);
    setNewGroupName('');
  };

  const handleSidebarGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    setView(AppView.GROUP_DETAIL);
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
      <Sidebar 
        groups={groups}
        onSelectGroup={handleSidebarGroupSelect}
        selectedGroupId={selectedGroupId}
        onAddNewGroup={() => setIsNewGroupModalOpen(true)}
      />

      <div className="flex-1 relative h-full flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {view === AppView.HOME && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 flex flex-col relative bg-gray-50"
            >
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
            <motion.div key="group-detail" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex-1">
              <GroupDetail 
                group={groups.find(g => g.id === selectedGroupId)!}
                terms={terms.filter(t => t.groupId === selectedGroupId)}
                onBack={handleBack}
                onPlayAudio={playPronunciation}
                onDeleteTerm={handleDeleteTerm}
                onUpdateTerm={handleUpdateTerm}
                onAddNewTerm={() => { setPreSelectedSaveGroup(selectedGroupId); setView(AppView.HOME); }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              <button onClick={() => setIsNewGroupModalOpen(false)} className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl">Cancel</button>
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
    </div>
  );
}
