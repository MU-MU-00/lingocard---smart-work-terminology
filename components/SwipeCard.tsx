import React, { useState, useEffect } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { TermData, SwipeDirection } from '../types';
import { Volume2, Info, Check, Trash2, FolderPlus, Edit3, Save } from 'lucide-react';

interface SwipeCardProps {
  data: Partial<TermData>;
  onSwipe?: (direction: SwipeDirection) => void;
  onPlayAudio: (text: string) => void;
  onUpdate?: (updatedData: Partial<TermData>) => void;
  isStatic?: boolean; 
}

const SwipeCard: React.FC<SwipeCardProps> = ({ data, onSwipe, onPlayAudio, onUpdate, isStatic = false }) => {
  const controls = useAnimation();
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    term: data.term || '',
    phonetic: data.phonetic || '',
    termTranslation: data.termTranslation ?? '',
    definitionCn: data.definitionCn || '',
    example: data.example || ''
  });

  useEffect(() => {
    setEditFields({
      term: data.term || '',
      phonetic: data.phonetic || '',
      termTranslation: data.termTranslation ?? '',
      definitionCn: data.definitionCn || '',
      example: data.example || ''
    });
  }, [data]);

  /** 名称翻译：仅显示名词对应的中/英文专业术语，不显示解释内容 */
  const displayTranslation = editFields.termTranslation ?? '';
  const translationLabel = /\p{Script=Han}/u.test(editFields.term) ? '英文' : '中文';

  const handleDragEnd = async (_: any, info: PanInfo) => {
    if (isStatic || isEditing) {
      controls.start({ x: 0, y: 0 });
      return;
    }

    const threshold = 100;
    const { x, y } = info.offset;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX > threshold || absY > threshold) {
      if (absX > absY) {
        if (x > 0) {
          onSwipe?.(SwipeDirection.RIGHT);
          await controls.start({ x: 500, opacity: 0 });
        } else {
           await controls.start({ x: 0, y: 0 });
        }
      } else {
        if (y < 0) {
          onSwipe?.(SwipeDirection.UP);
          await controls.start({ y: -500, opacity: 0 });
        } else {
          onSwipe?.(SwipeDirection.DOWN);
          await controls.start({ y: 500, opacity: 0 });
        }
      }
    } else {
      controls.start({ x: 0, y: 0 });
    }
  };

  const toggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      onUpdate?.(editFields);
    }
    setIsEditing(!isEditing);
  };

  const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <motion.div
      drag={!isEditing ? (isStatic ? false : true) : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.15}
      animate={controls}
      onDragEnd={handleDragEnd}
      style={{ touchAction: isEditing ? 'auto' : 'none' }}
      className="relative w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col cursor-grab active:cursor-grabbing select-none"
    >
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Fixed Header: Term + Sound */}
        <div className="pt-8 pb-4 px-6 flex flex-col items-center text-center shrink-0 bg-white z-20">
          {isEditing ? (
            <input 
              className="text-4xl font-bold text-center w-full bg-transparent border-none outline-none p-0 text-gray-800 tracking-tight"
              value={editFields.term}
              onChange={(e) => setEditFields({...editFields, term: e.target.value})}
              autoFocus
            />
          ) : (
            <h2 className="text-4xl font-bold text-gray-800 tracking-tight">{editFields.term}</h2>
          )}
          
          <div className="mt-4 flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full">
            {isEditing ? (
              <input 
                className="text-gray-500 font-mono text-sm bg-transparent border-none outline-none text-center p-0 w-24"
                value={editFields.phonetic}
                onChange={(e) => setEditFields({...editFields, phonetic: e.target.value})}
              />
            ) : (
              <span className="text-gray-500 font-mono text-sm">{editFields.phonetic}</span>
            )}
            {!isEditing && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onPlayAudio(editFields.term); }}
                className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center -m-2 rounded-full text-primary hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <Volume2 size={22} />
              </button>
            )}
          </div>
        </div>

        <div className="mx-6 h-px bg-gray-100 shrink-0"></div>

        {/* Scrollable Body Content - 触屏可垂直滑动 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-6 space-y-6 pb-24" style={{ touchAction: 'pan-y' }}>
          <div className="text-left space-y-6">
            {/* 名称翻译：名词为英文显示中文，名词为中文显示英文 */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-2 tracking-wider">名称翻译 {translationLabel && <span className="text-gray-400 font-normal">({translationLabel})</span>}</p>
              {isEditing ? (
                <input
                  type="text"
                  className="w-full p-0 bg-transparent border-none outline-none text-gray-800 font-medium text-base"
                  placeholder={translationLabel ? `输入${translationLabel}翻译` : '输入翻译'}
                  value={editFields.termTranslation}
                  onChange={(e) => setEditFields({ ...editFields, termTranslation: e.target.value })}
                />
              ) : (
                <p className="text-gray-800 font-medium text-base">{displayTranslation || '—'}</p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">名词解释</p>
              {isEditing ? (
                <textarea 
                  className="w-full p-0 bg-transparent border-none outline-none text-gray-700 font-medium text-lg leading-relaxed resize-none overflow-hidden"
                  value={editFields.definitionCn}
                  onChange={(e) => { setEditFields({...editFields, definitionCn: e.target.value}); handleAutoResize(e); }}
                  onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                />
              ) : (
                <p className="text-gray-700 font-medium text-lg leading-relaxed whitespace-pre-wrap">{editFields.definitionCn}</p>
              )}
            </div>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <p className="text-xs font-bold text-primary uppercase mb-2 tracking-wider">Usage Example</p>
              {isEditing ? (
                <textarea 
                  className="w-full p-0 bg-transparent border-none outline-none text-sm text-gray-600 italic leading-relaxed resize-none overflow-hidden"
                  value={editFields.example}
                  onChange={(e) => { setEditFields({...editFields, example: e.target.value}); handleAutoResize(e); }}
                  onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                />
              ) : (
                <p className="text-sm text-gray-600 italic leading-relaxed">"{editFields.example}"</p>
              )}
            </div>
          </div>
        </div>

        {/* Floating Edit/Save Button - 触屏最小 44px */}
        <button 
          type="button"
          onClick={toggleEdit}
          className={`absolute bottom-6 right-6 touch-target min-w-[48px] min-h-[48px] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 z-30
            ${isEditing ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}
          `}
        >
          {isEditing ? <Save size={20} /> : <Edit3 size={20} />}
        </button>

        {!isEditing && !isStatic && (
          <div className="absolute bottom-0 left-0 right-0 h-10 shrink-0 flex justify-center items-center text-gray-300 text-[10px] uppercase font-bold tracking-widest bg-white/80 backdrop-blur-sm border-t border-gray-50 z-20">
            <Info size={12} className="mr-1" /> Swipe to organize
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SwipeCard;