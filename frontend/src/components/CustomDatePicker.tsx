import React, { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isAfter, startOfDay, getYear, getMonth, setMonth, setYear } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
  maxDate?: Date;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, label, maxDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const currentYear = getYear(new Date());
  // Years up to current year if maxDate is provided (or just a reasonable range)
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  // Padding days from previous month
  const paddingDays = Array.from({ length: startDay }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startDay - i));
    return d;
  });

  const handleConfirm = () => {
    if (selectedDate) {
      onChange(format(selectedDate, 'yyyy-MM-dd'));
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setSelectedDate(value ? new Date(value) : null);
    setIsOpen(false);
  };

  const isDateDisabled = (date: Date) => {
    if (maxDate) {
      return isAfter(startOfDay(date), startOfDay(maxDate));
    }
    return false;
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs text-gray-500 mb-1 ml-1 uppercase font-bold tracking-wider">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="relative group bg-gray-950 border border-gray-800 rounded-lg hover:border-gray-700 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600/20 transition-all cursor-pointer h-[42px] flex items-center px-4"
      >
        <span className={`text-sm ${value ? 'text-white' : 'text-gray-500'}`}>
          {value ? format(new Date(value), 'MMM d, yyyy') : 'Select Date'}
        </span>
        <Calendar size={16} className={`absolute right-3 text-gray-500 transition-colors ${isOpen ? 'text-indigo-500' : 'group-hover:text-gray-400'}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 w-[320px] animate-in fade-in zoom-in duration-200 origin-top-left">
          {/* Header: Month & Year Selectors */}
          <div className="flex space-x-3 mb-6">
            <div className="flex-1 relative group">
              <select 
                value={getMonth(viewDate)}
                onChange={(e) => setViewDate(setMonth(viewDate, parseInt(e.target.value)))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2 px-4 text-sm font-bold appearance-none focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <div className="w-[100px] relative group">
              <select 
                value={getYear(viewDate)}
                onChange={(e) => setViewDate(setYear(viewDate, parseInt(e.target.value)))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2 px-4 text-sm font-bold appearance-none focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {years.map(y => (
                  <option key={y} value={y} disabled={maxDate && y > getYear(maxDate)}>{y}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Day Names ... grid logic ... */}
          <div className="grid grid-cols-7 mb-2">
            {days.map(d => (
              <div key={d} className="text-[10px] font-bold text-gray-500 text-center py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {paddingDays.map((d, i) => (
              <div key={`pad-${i}`} className="text-sm text-gray-700 text-center py-2">{format(d, 'dd')}</div>
            ))}
            {monthDays.map(d => {
              const isSelected = selectedDate && isSameDay(d, selectedDate);
              const isToday = isSameDay(d, new Date());
              const disabled = isDateDisabled(d);
              return (
                <button
                  key={d.toString()}
                  onClick={() => !disabled && setSelectedDate(d)}
                  disabled={disabled}
                  className={`text-sm text-center py-2 rounded-full transition-all relative
                    ${isSelected ? 'bg-indigo-600 text-white font-bold scale-110 shadow-lg shadow-indigo-500/30' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                    ${isToday && !isSelected ? 'text-indigo-400' : ''}
                    ${disabled ? 'opacity-20 cursor-not-allowed grayscale' : ''}
                  `}
                >
                  {format(d, 'dd')}
                  {isToday && !isSelected && !disabled && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full" />}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-800">
            <button 
              onClick={handleCancel}
              className="text-sm font-bold text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              className="text-sm font-bold text-indigo-500 hover:text-indigo-400 transition-colors px-4 py-2 hover:bg-indigo-500/10 rounded-xl"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;