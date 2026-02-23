import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Group } from '../types';
import { Plus, GripVertical, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LONG_PRESS_MS = 3000;

/** 是否主要为指针设备（桌面）：用于长按/拖拽分支 */
function isHoverCapable(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(pointer: fine)').matches;
}

interface SidebarProps {
  groups: Group[];
  onSelectGroup: (groupId: string) => void;
  selectedGroupId: string | null;
  onAddNewGroup: () => void;
  onImportFromSidebar: () => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  onEnterEditMode: () => void;
  onReorderGroups: (newGroups: Group[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  groups,
  onSelectGroup,
  selectedGroupId,
  onAddNewGroup,
  onImportFromSidebar,
  editMode,
  onToggleEditMode,
  onEnterEditMode,
  onReorderGroups,
}) => {
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [contextMenuGroupId, setContextMenuGroupId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [draggingFromIndex, setDraggingFromIndex] = useState<number>(-1);
  const lastOverIndexRef = useRef<number>(-1);
  const fromIndexRef = useRef<number>(-1);
  const longPressTarget = useRef<string | null>(null);
  const longPressTriggeredRef = useRef(false);
  const hoverCapable = isHoverCapable();

  const handlePointerDown = useCallback((groupId: string) => {
    if (hoverCapable) return;
    longPressTarget.current = groupId;
    longPressTriggeredRef.current = false;
    const t = setTimeout(() => {
      if (longPressTarget.current) {
        longPressTriggeredRef.current = true;
        onEnterEditMode();
      }
      setLongPressTimer(null);
    }, LONG_PRESS_MS);
    setLongPressTimer(t);
  }, [hoverCapable, onEnterEditMode]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    longPressTarget.current = null;
  }, [longPressTimer]);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    longPressTarget.current = null;
  }, [longPressTimer]);

  const handleContextMenu = (e: React.MouseEvent, groupId: string) => {
    e.preventDefault();
    if (editMode) return; // 编辑态下右键用于拖拽，不弹出菜单
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setContextMenuGroupId(groupId);
    setContextMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom + 4 });
  };

  useEffect(() => {
    const closeContext = () => setContextMenuGroupId(null);
    document.addEventListener('click', closeContext);
    return () => document.removeEventListener('click', closeContext);
  }, []);

  const handleEnterEditFromContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEnterEditMode();
    setContextMenuGroupId(null);
  };

  const moveGroup = (index: number, delta: number) => {
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= groups.length) return;
    const next = [...groups];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    onReorderGroups(next);
  };

  const doReorder = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    const row = el?.closest('[data-group-index]');
    const overIndex = row ? parseInt((row as HTMLElement).dataset.groupIndex ?? '-1', 10) : -1;
    if (overIndex >= 0 && overIndex < groups.length && overIndex !== lastOverIndexRef.current) {
      lastOverIndexRef.current = overIndex;
      const from = fromIndexRef.current;
      if (from >= 0 && from !== overIndex) {
        const next = [...groups];
        const [removed] = next.splice(from, 1);
        next.splice(overIndex, 0, removed);
        onReorderGroups(next);
        fromIndexRef.current = overIndex;
      }
    }
  }, [groups, onReorderGroups]);

  const clearDrag = useCallback(() => {
    setDraggingGroupId(null);
    setDraggingFromIndex(-1);
    lastOverIndexRef.current = -1;
    fromIndexRef.current = -1;
  }, []);

  useEffect(() => {
    if (!editMode || !draggingGroupId) return;
    if (hoverCapable) {
      const handleMouseMove = (e: MouseEvent) => doReorder(e.clientX, e.clientY);
      const handleMouseUp = () => {
        clearDrag();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    } else {
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length) doReorder(e.touches[0].clientX, e.touches[0].clientY);
      };
      const handleTouchEnd = () => {
        clearDrag();
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [editMode, hoverCapable, draggingGroupId, doReorder, clearDrag]);

  return (
    <div className="h-full w-20 bg-orange-500 flex flex-col items-center py-6 space-y-4 shadow-lg flex-shrink-0 z-30 relative">
      <div className="flex-1 overflow-y-auto overflow-x-visible flex flex-col items-center space-y-4 no-scrollbar">
        {groups.map((group, index) => {
          const isSelected = selectedGroupId === group.id;
          return (
            <div
              key={group.id}
              className="relative flex items-center gap-0"
              data-group-id={group.id}
              data-group-index={index}
            >
              <button
                type="button"
                onPointerDown={() => handlePointerDown(group.id)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onContextMenu={(e) => handleContextMenu(e, group.id)}
                onMouseDown={(e) => {
                  if (editMode && hoverCapable && e.button === 2) {
                    e.preventDefault();
                    setDraggingGroupId(group.id);
                    setDraggingFromIndex(index);
                    fromIndexRef.current = index;
                    lastOverIndexRef.current = index;
                  }
                }}
                onTouchStart={(e) => {
                  if (editMode && !hoverCapable) {
                    setDraggingGroupId(group.id);
                    fromIndexRef.current = index;
                    lastOverIndexRef.current = index;
                  }
                }}
                onClick={() => {
                  if (longPressTimer) return;
                  if (longPressTriggeredRef.current) {
                    longPressTriggeredRef.current = false;
                    return;
                  }
                  if (editMode) return;
                  onSelectGroup(group.id);
                }}
                className={`touch-target touch-manipulation min-w-[56px] min-h-[56px] w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all transform duration-200 active:scale-95
                  ${isSelected ? 'bg-orange-700 shadow-inner scale-95' : 'bg-orange-400 hover:bg-orange-600 shadow-md hover:scale-105'}
                  ${editMode ? 'ring-1 ring-white ring-inset cursor-grab active:cursor-grabbing' : ''}
                  ${editMode && draggingGroupId === group.id ? 'opacity-90' : ''}
                `}
              >
                {group.name.slice(0, 2)}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onImportFromSidebar}
          className="touch-target min-w-[48px] min-h-[48px] w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center text-white hover:bg-orange-600 active:scale-95 transition-colors"
          title="导入词库"
        >
          <Upload size={22} />
        </button>
        <span className="text-[10px] text-white/80">导入</span>
        <button
          type="button"
          onClick={onAddNewGroup}
          className="touch-target min-w-[48px] min-h-[48px] w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center text-white hover:bg-orange-600 active:scale-95 transition-colors"
          title="新建词库"
        >
          <Plus size={24} />
        </button>
        <span className="text-[10px] text-white/80">新建</span>
      </div>
      {/* 右键菜单：与词库水平居中，仅「编辑顺序」 */}
      <AnimatePresence>
        {contextMenuGroupId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ left: contextMenuPos.x, top: contextMenuPos.y, transform: 'translateX(-50%)' }}
            className="fixed z-[110] rounded-xl bg-white shadow-lg border border-gray-100 py-1 min-w-[120px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleEnterEditFromContext}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-gray-700 hover:bg-orange-50 text-sm font-medium"
            >
              <GripVertical size={16} /> 编辑顺序
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;
