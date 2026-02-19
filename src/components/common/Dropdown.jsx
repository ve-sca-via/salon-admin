import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export const Dropdown = ({ trigger, children, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Calculate position
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownWidth = 200; // min-w-[200px]
        
        setPosition({
          top: rect.bottom + window.scrollY + 4,
          left: align === 'right' 
            ? rect.right + window.scrollX - dropdownWidth
            : rect.left + window.scrollX
        });
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, align]);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-1"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
};

export const DropdownItem = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = 'default',
  disabled = false 
}) => {
  const variantClasses = {
    default: 'text-gray-700 hover:bg-gray-50',
    primary: 'text-indigo-600 hover:bg-indigo-50',
    success: 'text-green-600 hover:bg-green-50',
    warning: 'text-yellow-600 hover:bg-yellow-50',
    error: 'text-red-600 hover:bg-red-50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
        disabled 
          ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
          : variantClasses[variant]
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span>{label}</span>
    </button>
  );
};

export const DropdownDivider = () => (
  <div className="my-1 border-t border-gray-200" />
);

// Default trigger button (three dots)
export const DropdownTrigger = ({ className = '' }) => (
  <button
    className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
    title="More actions"
  >
    <MoreVertical className="w-5 h-5 text-gray-600" />
  </button>
);
