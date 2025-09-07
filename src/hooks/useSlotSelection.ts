import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'msb:selected';

export const useSlotSelection = () => {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  // Load selection from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSlots = JSON.parse(stored) as string[];
        setSelectedSlots(new Set(parsedSlots));
      }
    } catch (error) {
      console.error('Error loading selection from localStorage:', error);
    }
  }, []);

  // Save selection to localStorage whenever it changes
  useEffect(() => {
    try {
      const slotsArray = Array.from(selectedSlots);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slotsArray));
    } catch (error) {
      console.error('Error saving selection to localStorage:', error);
    }
  }, [selectedSlots]);

  const toggleSlot = useCallback((slotId: string) => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slotId)) {
        newSet.delete(slotId);
      } else {
        newSet.add(slotId);
      }
      return newSet;
    });
  }, []);

  const selectSlots = useCallback((slotIds: string[]) => {
    setSelectedSlots(new Set(slotIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSlots(new Set());
  }, []);

  const isSelected = useCallback((slotId: string) => {
    return selectedSlots.has(slotId);
  }, [selectedSlots]);

  return {
    selectedSlots,
    toggleSlot,
    selectSlots,
    clearSelection,
    isSelected,
    selectionCount: selectedSlots.size
  };
};