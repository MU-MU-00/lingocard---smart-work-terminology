import React from 'react';
import { Group } from '../types';
import { Plus } from 'lucide-react';

interface SidebarProps {
  groups: Group[];
  onSelectGroup: (groupId: string) => void;
  selectedGroupId: string | null;
  onAddNewGroup: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  groups, 
  onSelectGroup, 
  selectedGroupId,
  onAddNewGroup
}) => {
  return (
    <div className="h-full w-20 bg-orange-500 flex flex-col items-center py-6 space-y-4 shadow-lg flex-shrink-0 z-30">
      {groups.map(group => {
        const isSelected = selectedGroupId === group.id;
        return (
          <button
            type="button"
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className={`touch-target min-w-[56px] min-h-[56px] w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all transform duration-200 active:scale-95
              ${isSelected ? 'bg-orange-700 shadow-inner scale-95' : 'bg-orange-400 hover:bg-orange-600 shadow-md hover:scale-105'}
            `}
          >
            {/* Show first 2 chars */}
            {group.name.slice(0, 2)}
          </button>
        );
      })}

      <div className="flex-1"></div>

      {/* Add New Group Button (Visual enhancement) */}
      <button 
        type="button"
        onClick={onAddNewGroup}
        className="touch-target min-w-[48px] min-h-[48px] w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center text-white hover:bg-orange-600 active:scale-95 transition-colors"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default Sidebar;