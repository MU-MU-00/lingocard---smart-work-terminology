import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Group } from '../types';
import { Plus, GripVertical, Trash2, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LONG_PRESS_MS = 3000;

/** 是否主要为指针设备（桌面）：用于长按/拖拽分支，不用于 hover 菜单 */
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
  groupWithMenu: string | null;
  onSetGroupWithMenu: (id: string | null) => void;
  onDeleteGroup: (groupId: string) => void;
  onExportGroup: (groupId: string) => void;
  onImportToGroup: (groupId: string) => void;
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
  groupWithMenu,
  onSetGroupWithMenu,
  onDeleteGroup,
  onExportGroup,
  onImportToGroup,
  onReorderGroups,
}) => {
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [groupHoverId, setGroupHoverId] = useState<string | null>(null);
  const [contextMenuGroupId, setContextMenuGroupId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [draggingFromIndex, setDraggingFromIndex] = useState<number>(-1);
  const lastOverIndexRef = useRef<number>(-1);
  const fromIndexRef = useRef<number>(-1);
  const longPressTarget = useRef<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredButtonRef = useRef<HTMLButtonElement | null>(null);
  const hoverCapable = isHoverCapable();

  const handlePointerDown = useCallback((groupId: string) => {
    if (hoverCapable) return;
    if (editMode) return;
    longPressTarget.current = groupId;
    const t = setTimeout(() => {
      if (editMode) {
        onSetGroupWithMenu(groupId);
      } else {
        onEnterEditMode();
      }
      setLongPressTimer(null);
    }, LONG_PRESS_MS);
    setLongPressTimer(t);
  }, [editMode, onSetGroupWithMenu, onEnterEditMode]);

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
    onSetGroupWithMenu(null);
  };

  useEffect(() => {
    const closeContext = () => setContextMenuGroupId(null);
    document.addEventListener('click', closeContext);
    return () => document.removeEventListener('click', closeContext);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    };
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
          const showActionMenu = groupWithMenu === group.id || groupHoverId === group.id;
          return (
            <div
              key={group.id}
              className="relative flex items-center gap-0"
              data-group-id={group.id}
              data-group-index={index}
              onMouseEnter={(e) => {
                if (hoverCloseTimerRef.current) {
                  clearTimeout(hoverCloseTimerRef.current);
                  hoverCloseTimerRef.current = null;
                }
                const btn = (e.currentTarget as HTMLElement).querySelector('button');
                if (btn) hoveredButtonRef.current = btn as HTMLButtonElement;
                setGroupHoverId(group.id);
              }}
              onMouseLeave={(e) => {
                const toEl = e.relatedTarget as Node | null;
                if (toEl && actionMenuRef.current?.contains(toEl)) return;
                hoverCloseTimerRef.current = setTimeout(() => setGroupHoverId(null), 120);
              }}
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
                  if (editMode) return;
                  setGroupHoverId(null);
                  onSelectGroup(group.id);
                }}
                className={`touch-target min-w-[56px] min-h-[56px] w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all transform duration-200 active:scale-95
                  ${isSelected ? 'bg-orange-700 shadow-inner scale-95' : 'bg-orange-400 hover:bg-orange-600 shadow-md hover:scale-105'}
                  ${editMode ? 'ring-2 ring-white ring-offset-2 ring-offset-orange-500 cursor-grab active:cursor-grabbing' : ''}
                  ${editMode && draggingGroupId === group.id ? 'opacity-90' : ''}
                `}
              >
                {group.name.slice(0, 2)}
              </button>
              {showActionMenu && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                  <motion.div
                    ref={actionMenuRef}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    style={{
                      position: 'fixed',
                      left: (hoveredButtonRef.current?.getBoundingClientRect?.()?.right ?? 0) + 8,
                      top: hoveredButtonRef.current?.getBoundingClientRect?.()?.top ?? 0,
                      zIndex: 9999,
                    }}
                    className="flex flex-col gap-1 rounded-xl bg-white shadow-lg border border-gray-100 py-1 min-w-[100px]"
                    onMouseEnter={() => {
                      if (hoverCloseTimerRef.current) {
                        clearTimeout(hoverCloseTimerRef.current);
                        hoverCloseTimerRef.current = null;
                      }
                    }}
                    onMouseLeave={() => {
                      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
                      hoverCloseTimerRef.current = setTimeout(() => setGroupHoverId(null), 80);
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); onSetGroupWithMenu(null); setGroupHoverId(null); }}
                      className="flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 text-sm font-medium touch-target"
                    >
                      <Trash2 size={16} /> 删除
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onImportToGroup(group.id); onSetGroupWithMenu(null); setGroupHoverId(null); }}
                      className="flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 text-sm font-medium touch-target"
                    >
                      <Upload size={16} /> 导入词库
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onExportGroup(group.id); onSetGroupWithMenu(null); setGroupHoverId(null); }}
                      className="flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 text-sm font-medium touch-target"
                    >
                      <Download size={16} /> 导出词库
                    </button>
                    {!hoverCapable && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSetGroupWithMenu(null); }}
                        className="px-4 py-1 text-gray-400 text-xs border-t border-gray-100 mt-1"
                      >
                        关闭
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>,
                document.body
              )}
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
