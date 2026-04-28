import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };
  
  return (
    <div className="elstar-modal-overlay" onClick={onClose}>
      <div 
        className={`elstar-modal ${sizeClasses[size]} animate-fade-in`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="elstar-modal-header flex items-center justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
