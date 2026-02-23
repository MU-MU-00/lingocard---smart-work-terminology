import React, { useState, useEffect } from 'react';
import { TermData, Group } from '../types';
import { ArrowLeft, Volume2, Trash2, Undo2, FolderInput, ChevronLeft, ChevronRight, X, Plus, Settings, GripVertical, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence, useAnimation, PanInfo, Reorder } from 'framer-motion';
import SwipeCard from './SwipeCard';

const SWIPE_WIDTH = 210; // Back 70 + Move 70 + Delete 70

interface GroupDetailProps {
  group: Group;
  groups: Group[];
  terms: TermData[];
  onBack: () => void;
  onPlayAudio: (text: string) => void;
  onDeleteTerm: (termId: string) => void;
  onUpdateTerm: (termId: string, updates: Partial<TermData>) => void;
  onMoveTerm: (termId: string, newGroupId: string) => void;
  onOpenNewGroupForMove: (onCreated: (newGroupId: string) => void) => void;
  onAddNewTerm: () => void;
  onReorderTerms: (orderedTermIds: string[]) => void;
  onRequestDeleteGroup: () => void;
  onRequestExportGroup: () => void;
  onRequestImportGroup: () => void;
}

const ListItem: React.FC<{ term: TermData; onPlay: () => void; onDelete: () => void; onMove: () => void; onClick: () => void }> = ({ term, onPlay, onDelete, onMove, onClick }) => {
  const controls = useAnimation();
  const [isOpen, setIsOpen] = useState(false);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -50 || velocity < -500) {
      setIsOpen(true);
      await controls.start({ x: -SWIPE_WIDTH });
    } else {
      setIsOpen(false);
      await controls.start({ x: 0 });
    }
  };

  const closeSwipe = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen(false);
      controls.start({ x: 0 });
  }

  return (
    <div className="relative mb-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[80px]">
        {/* Background Layer (Menu): Back | Move | Delete */}
        <div className="absolute inset-y-0 right-0 flex" style={{ width: SWIPE_WIDTH }}>
             <button 
                type="button"
                onClick={closeSwipe}
                className="touch-target min-h-[80px] w-[70px] bg-gray-200 text-gray-600 flex flex-col items-center justify-center active:bg-gray-300 transition-colors"
             >
                 <Undo2 size={20} />
                 <span className="text-[10px] font-bold mt-1">Back</span>
             </button>
             <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onMove(); }}
                className="touch-target min-h-[80px] w-[70px] bg-primary text-white flex flex-col items-center justify-center active:bg-primary/90 transition-colors"
             >
                 <FolderInput size={20} />
                 <span className="text-[10px] font-bold mt-1">Move</span>
             </button>
             <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="touch-target min-h-[80px] w-[70px] bg-red-500 text-white flex flex-col items-center justify-center active:bg-red-600 transition-colors"
             >
                 <Trash2 size={20} />
                 <span className="text-[10px] font-bold mt-1">Delete</span>
             </button>
        </div>

        {/* Foreground Layer (Content) - 手指左滑露出 Back / Move / Delete */}
        <motion.div
            drag="x"
            dragConstraints={{ left: -SWIPE_WIDTH, right: 0 }}
            dragElastic={0.12}
            animate={controls}
            onDragEnd={handleDragEnd}
            onClick={!isOpen ? onClick : undefined}
            style={{ touchAction: 'pan-y' }}
            className="relative bg-white h-full px-4 flex justify-between items-center z-10 w-full cursor-pointer active:bg-gray-50/50"
        >
            <div className="flex-1 min-w-0 mr-2">
                <h3 className="font-bold text-gray-800 text-lg truncate">{term.term}</h3>
                <p className="text-gray-500 text-xs truncate">{term.definitionCn}</p>
            </div>
            <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onPlay(); }}
                className="touch-target min-w-[44px] min-h-[44px] shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary hover:bg-primary/20 active:scale-95 transition-all"
            >
                <Volume2 size={20} />
            </button>
        </motion.div>
    </div>
  )
}

const GroupDetail: React.FC<GroupDetailProps> = ({ group, groups, terms, onBack, onPlayAudio, onDeleteTerm, onUpdateTerm, onMoveTerm, onOpenNewGroupForMove, onAddNewTerm, onReorderTerms, onRequestDeleteGroup, onRequestExportGroup, onRequestImportGroup }) => {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);
  const [moveTermId, setMoveTermId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<TermData[]>([]);
  const [showGroupActions, setShowGroupActions] = useState(false);

  useEffect(() => {
    if (reorderMode) setReorderList([...terms]);
  }, [reorderMode]);

  const handleReorderDone = () => {
    onReorderTerms(reorderList.map(t => t.id));
    setReorderMode(false);
  };

  const handleNext = () => {
    if (zoomIndex !== null && zoomIndex < terms.length - 1) {
      setDirection(1);
      setZoomIndex(zoomIndex + 1);
    }
  };

  const handlePrev = () => {
    if (zoomIndex !== null && zoomIndex > 0) {
      setDirection(-1);
      setZoomIndex(zoomIndex - 1);
    }
  };

  const handleZoomDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      handleNext();
    } else if (info.offset.x > threshold) {
      handlePrev();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    })
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      {/* List Header */}
      <div className="bg-white p-4 shadow-sm z-20 flex items-center sticky top-0">
        <button type="button" onClick={onBack} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 mr-2 hover:bg-gray-100 rounded-full text-gray-600 active:bg-gray-200">
            <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-xl text-gray-800">{group.name}</h1>
        <div className="flex-1" />
        {reorderMode ? (
          <button type="button" onClick={handleReorderDone} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-primary text-white text-sm font-bold px-3 hover:bg-primary/90 active:bg-primary/80">
            完成
          </button>
        ) : showGroupActions ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => { onRequestDeleteGroup(); setShowGroupActions(false); }} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-red-600 hover:bg-red-50 active:bg-red-100" title="删除">
              <Trash2 size={22} />
            </button>
            <button type="button" onClick={() => { onRequestImportGroup(); setShowGroupActions(false); }} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 active:bg-gray-200" title="导入">
              <Upload size={22} />
            </button>
            <button type="button" onClick={() => { onRequestExportGroup(); setShowGroupActions(false); }} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 active:bg-gray-200" title="导出">
              <Download size={22} />
            </button>
            <button type="button" onClick={() => setShowGroupActions(false)} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-primary text-white text-sm font-bold px-3 hover:bg-primary/90 active:bg-primary/80">
              完成
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowGroupActions(true)}
              className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200"
              title="设置"
            >
              <Settings size={22} />
            </button>
            <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-full ml-1">
              {terms.length} Terms
            </span>
          </>
        )}
      </div>

      {/* List Content - min-h-0 保证在 flex 下可滚动 */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 no-scrollbar space-y-3 pb-10">
        {terms.length === 0 && !reorderMode ? (
            <div className="h-40 flex flex-col items-center justify-center text-gray-400 opacity-50">
                <span className="text-4xl mb-2">📭</span>
                <p>No terms in this group</p>
            </div>
        ) : reorderMode ? (
            <>
              <p className="text-sm text-gray-500 mb-2">拖拽卡片上下调整顺序，完成后点击右上角「完成」</p>
              <Reorder.Group axis="y" values={reorderList} onReorder={setReorderList} className="space-y-3">
                {reorderList.map((term) => (
                  <Reorder.Item key={term.id} value={term} className="cursor-grab active:cursor-grabbing">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[80px] flex items-center px-4 gap-3 touch-target">
                      <div className="text-gray-400 shrink-0">
                        <GripVertical size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-lg truncate">{term.term}</h3>
                        <p className="text-gray-500 text-xs truncate">{term.definitionCn}</p>
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </>
        ) : (
            <div>
                {terms.map((term, idx) => (
                    <ListItem 
                        key={term.id} 
                        term={term} 
                        onPlay={() => onPlayAudio(term.term)}
                        onDelete={() => onDeleteTerm(term.id)}
                        onMove={() => setMoveTermId(term.id)}
                        onClick={() => { setDirection(0); setZoomIndex(idx); }}
                    />
                ))}
            </div>
        )}

        {/* Add Card Button Placeholder - 仅在非排序模式显示 */}
        {!reorderMode && (
          <button 
            type="button"
            onClick={onAddNewTerm}
            className="w-full min-h-[80px] py-6 bg-white border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-300 hover:border-primary hover:text-primary active:bg-gray-50 transition-all group touch-target"
          >
            <div className="flex flex-col items-center">
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold mt-1">新增术语</span>
            </div>
          </button>
        )}
      </div>

      {/* Move term: 选择词库 / 新建词组 */}
      <AnimatePresence>
        {moveTermId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoveTermId(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">修改词位置</h2>
                <button type="button" onClick={() => setMoveTermId(null)} className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">选择要移动到的词库，或新建词库</p>
              <div className="space-y-2">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      if (g.id === group.id) return;
                      onMoveTerm(moveTermId, g.id);
                      setMoveTermId(null);
                    }}
                    disabled={g.id === group.id}
                    className="w-full p-4 rounded-xl bg-gray-50 text-left font-bold hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                  >
                    {g.name}
                    {g.id === group.id && <span className="text-xs text-gray-400">(当前)</span>}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onOpenNewGroupForMove((newGroupId) => {
                      onMoveTerm(moveTermId, newGroupId);
                      setMoveTermId(null);
                    });
                    setMoveTermId(null);
                  }}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-primary/40 text-primary font-bold hover:bg-primary/10 transition-colors touch-target flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  新建词组
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Zoomed Card View */}
      <AnimatePresence>
        {zoomIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6"
          >
            <button 
              type="button"
              onClick={() => setZoomIndex(null)}
              className="absolute top-6 right-6 touch-target min-w-[48px] min-h-[48px] flex items-center justify-center text-white bg-white/10 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors z-[60]"
            >
              <X size={28} />
            </button>

            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-white/50 font-bold text-sm tracking-widest z-40">
                {zoomIndex + 1} / {terms.length}
            </div>

            <div className="relative w-full max-w-sm h-[550px] flex items-center justify-center">
              {/* 桌面端：左右箭头 */}
              <button 
                type="button"
                onClick={handlePrev}
                disabled={zoomIndex === 0}
                className={`absolute -left-12 text-white/40 hover:text-white transition-colors hidden md:flex touch-target ${zoomIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <ChevronLeft size={48} />
              </button>
              <button 
                type="button"
                onClick={handleNext}
                disabled={zoomIndex === terms.length - 1}
                className={`absolute -right-12 text-white/40 hover:text-white transition-colors hidden md:flex touch-target ${zoomIndex === terms.length - 1 ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <ChevronRight size={48} />
              </button>
              {/* 手机端：底部左右箭头，大触控区 */}
              <div className="md:hidden absolute bottom-0 left-0 right-0 flex justify-between px-4 py-3 z-[55] pointer-events-none">
                <button 
                  type="button"
                  onClick={handlePrev}
                  disabled={zoomIndex === 0}
                  className={`pointer-events-auto touch-target min-w-[56px] min-h-[48px] rounded-xl flex items-center justify-center text-white/70 hover:text-white active:bg-white/10 disabled:opacity-0 disabled:pointer-events-none ${zoomIndex === 0 ? 'invisible' : ''}`}
                >
                  <ChevronLeft size={36} />
                </button>
                <button 
                  type="button"
                  onClick={handleNext}
                  disabled={zoomIndex === terms.length - 1}
                  className={`pointer-events-auto touch-target min-w-[56px] min-h-[48px] rounded-xl flex items-center justify-center text-white/70 hover:text-white active:bg-white/10 disabled:opacity-0 disabled:pointer-events-none ${zoomIndex === terms.length - 1 ? 'invisible' : ''}`}
                >
                  <ChevronRight size={36} />
                </button>
              </div>

              <motion.div 
                key={terms[zoomIndex].id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={handleZoomDragEnd}
                style={{ touchAction: 'none' }}
                className="w-full h-full cursor-grab active:cursor-grabbing"
              >
                <SwipeCard 
                  data={terms[zoomIndex]} 
                  onPlayAudio={onPlayAudio}
                  isStatic={true}
                  onUpdate={(updates) => onUpdateTerm(terms[zoomIndex].id, updates)}
                />
              </motion.div>
            </div>

            <div className="mt-8 text-white/20 text-[10px] uppercase tracking-widest font-bold">
               手指左右滑动卡片切换 · 或点击底部箭头
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupDetail;