import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export default function ActionDropdown({ children, testId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 192;
      
      let left = rect.right - dropdownWidth;
      if (left < 8) left = rect.left;
      
      let top = rect.bottom + 4;
      
      // Check viewport bounds
      const viewportHeight = window.innerHeight;
      if (top + 200 > viewportHeight) {
        top = rect.top - 200 - 4;
      }
      
      setPosition({ top, left });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && 
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = () => setIsOpen(false);
    const handleResize = () => updatePosition();
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  const dropdown = isOpen && createPortal(
    <div 
      ref={dropdownRef}
      className="fixed w-48 bg-card rounded-lg border border-border shadow-2xl overflow-hidden"
      style={{ 
        top: position.top,
        left: position.left,
        zIndex: 9999,
        animation: 'fadeIn 0.15s ease-out'
      }}
    >
      {typeof children === 'function' ? children(() => setIsOpen(false)) : children}
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        className="p-2 hover:bg-secondary rounded-lg transition-colors"
        data-testid={testId}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {dropdown}
    </>
  );
}
