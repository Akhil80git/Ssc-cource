import React, { useState, useEffect } from 'react';
import { Folder } from '../types';
import { FolderPlus, X, FolderTree } from 'lucide-react';
import { getFolderTrail } from '../utils/storage';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, parentFolderId: string | null) => void;
  folders: Folder[];
  initialParentId?: string | null;
  editFolder?: Folder | null;
  onRename?: (id: string, newName: string) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  folders,
  initialParentId = null,
  editFolder,
  onRename
}) => {
  const [name, setName] = useState(editFolder ? editFolder.name : '');
  const [parentId, setParentId] = useState<string | null>(
    editFolder ? editFolder.parentFolderId : initialParentId
  );
  const [folderType, setFolderType] = useState<'root' | 'subfolder'>(
    initialParentId ? 'subfolder' : 'root'
  );
  const [error, setError] = useState('');

  // Keep state perfectly synchronized whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setName(editFolder ? editFolder.name : '');
      const defaultParent = editFolder ? editFolder.parentFolderId : (initialParentId || null);
      setParentId(defaultParent);
      setFolderType(defaultParent ? 'subfolder' : 'root');
      setError('');
    }
  }, [isOpen, editFolder, initialParentId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('कृपया फ़ोल्डर का नाम दर्ज करें');
      return;
    }

    if (editFolder && onRename) {
      onRename(editFolder.id, trimmed);
    } else {
      const finalParentId = folderType === 'root' ? null : parentId;
      onSave(trimmed, finalParentId);
    }
    onClose();
  };

  // Helper to format folder tree display in select options
  const renderFolderOptions = () => {
    const buildOptions = (parentIdVal: string | null, depth: number): React.ReactNode[] => {
      const children = folders.filter(f => f.parentFolderId === parentIdVal);
      let items: React.ReactNode[] = [];
      for (const child of children) {
        if (editFolder && child.id === editFolder.id) continue;
        const indent = '— '.repeat(depth);
        items.push(
          <option key={child.id} value={child.id} className="bg-slate-900 text-slate-100">
            {depth > 0 ? `${indent}📁 ` : '📁 '}{child.name}
          </option>
        );
        items = items.concat(buildOptions(child.id, depth + 1));
      }
      return items;
    };

    return buildOptions(null, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-800 overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
            <FolderPlus className="w-5 h-5 text-indigo-400" />
            <span>{editFolder ? 'फ़ोल्डर का नाम बदलें' : 'नया फ़ोल्डर बनाएँ'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          {!editFolder && folders.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                फ़ोल्डर का स्तर चुनें (Choose Level)
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setFolderType('root');
                    setParentId(null);
                  }}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                    folderType === 'root'
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base">📂</span>
                  <div>
                    <div>मुख्य फ़ोल्डर (Root)</div>
                    <div className="text-[10px] text-slate-400 font-normal">स्वतंत्र नया फ़ोल्डर</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFolderType('subfolder');
                    if (!parentId && folders.length > 0) {
                      setParentId(initialParentId || folders[0].id);
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                    folderType === 'subfolder'
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base">↳ 📁</span>
                  <div>
                    <div>सबफ़ोल्डर (Subfolder)</div>
                    <div className="text-[10px] text-slate-400 font-normal">फ़ोल्डर के अंदर जोड़ें</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              फ़ोल्डर का नाम (Folder Name)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder={folderType === 'root' ? 'उदा. सामान्य ज्ञान, Maths, Reasoning' : 'उदा. Reading Comprehension, Number System'}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
          </div>

          {!editFolder && folderType === 'subfolder' && folders.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                किस फ़ोल्डर के अंदर जोड़ना है? (Parent Folder)
              </label>
              <select
                value={parentId || (folders[0] ? folders[0].id : '')}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {renderFolderOptions()}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs"
            >
              {editFolder ? 'अपडेट करें (Save)' : folderType === 'root' ? 'मुख्य फ़ोल्डर बनाएँ' : 'सबफ़ोल्डर बनाएँ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
