import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface ComboBoxProps {
  name: string;
  value: string;
  options: string[];
  onChange: (e: any) => void;
  onDelete?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowInput?: boolean;
}

export function ComboBox({ name, value, options, onChange, onDelete, placeholder = "Chọn hoặc nhập...", className = "", disabled = false, allowInput = true }: ComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync prop value to local search state if it changes externally
  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    setSearch(opt);
    setIsOpen(false);
    setIsTyping(false);
    onChange({ target: { name, value: opt } });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsOpen(true);
    setIsTyping(true);
    onChange({ target: { name, value: e.target.value } });
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setIsTyping(false);
    if (!isOpen && wrapperRef.current) {
        const input = wrapperRef.current.querySelector('input');
        if (input) input.focus();
    }
  };

  // Only filter if they are actively typing. Otherwise show all.
  const filteredOptions = isTyping && search
    ? options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        <input 
          type="text" 
          value={search}
          onChange={allowInput ? handleInputChange : undefined}
          onFocus={() => { if(!disabled) { setIsOpen(true); setIsTyping(false); } }}
          onClick={() => { if(!disabled && !allowInput) setIsOpen(prev => !prev); }}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!allowInput}
          className={`w-full px-3 py-1.5 border border-gray-300 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary pr-8 text-sm text-gray-900 transition-colors ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : (!allowInput ? 'bg-white cursor-pointer' : 'bg-white')} ${className}`}
        />
        <div 
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 cursor-pointer'}`}
          onClick={disabled ? undefined : toggleOpen}
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, i) => (
              <div 
                key={i} 
                className="group flex items-center justify-between px-3 py-2 hover:bg-primary/10 cursor-pointer text-sm text-gray-700 transition-colors"
                onClick={() => handleSelect(opt)}
              >
                <span>{opt}</span>
                {onDelete && (
                  <div 
                    className="hidden group-hover:block p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(opt);
                    }}
                    title="Xóa khỏi danh sách gợi ý"
                  >
                    <X className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 italic">
              {search ? 'Nhấn Enter hoặc Lưu để thêm mới' : 'Không có dữ liệu'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
