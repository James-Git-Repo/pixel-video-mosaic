
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import VideoSlot from './VideoSlot';
import { useIsAdmin } from '../hooks/useIsAdmin';

interface VideoData {
  [slotId: string]: string;
}

interface VideoGridProps {
  videos: VideoData;
  occupiedSlots: Set<string>;
  onVideoUpload: (slotId: string, file: File) => void;
  onVideoView: (slotId: string, video: string) => void;
  selectedSlots?: Set<string>;
  onSelectionChange?: (selectedSlots: Set<string>) => void;
  onSlotClick?: (slotId: string) => void;
}

interface SelectionRect {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface DragState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const GRID_SIZE = 1000; // 1000x1000 = 1,000,000 slots
const SLOT_SIZE = 0.8; // Smaller slots to fit entire grid in view

const VideoGrid: React.FC<VideoGridProps> = ({ 
  videos, 
  occupiedSlots, 
  onVideoUpload, 
  onVideoView, 
  selectedSlots = new Set(),
  onSelectionChange,
  onSlotClick
}) => {
  const { isAdmin } = useIsAdmin();
  const [zoom, setZoom] = useState(isAdmin ? 1 : 0.8);
  const [dragState, setDragState] = useState<DragState>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  const [floatingPill, setFloatingPill] = useState<{x: number, y: number, slots: number} | null>(null);
  const [errorTooltip, setErrorTooltip] = useState<{x: number, y: number, message: string} | null>(null);
  const gridRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleVideoUpload = useCallback((slotId: string, file: File) => {
    if (!isAdmin) return; // Only allow uploads if admin
    onVideoUpload(slotId, file);
    console.log(`Video uploaded to slot ${slotId}`);
  }, [isAdmin, onVideoUpload]);

  const handleVideoView = useCallback((slotId: string, video: string) => {
    onVideoView(slotId, video);
  }, [onVideoView]);

  // Utility functions for coordinate conversion
  const screenToGrid = useCallback((x: number, y: number) => {
    if (!containerRef.current) return { row: 0, col: 0 };
    
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = x - rect.left + containerRef.current.scrollLeft;
    const relativeY = y - rect.top + containerRef.current.scrollTop;
    
    const col = Math.floor(relativeX / (SLOT_SIZE * zoom));
    const row = Math.floor(relativeY / (SLOT_SIZE * zoom));
    
    return {
      row: Math.max(0, Math.min(GRID_SIZE - 1, row)),
      col: Math.max(0, Math.min(GRID_SIZE - 1, col))
    };
  }, [zoom]);

  const getSelectionRect = useCallback((startX: number, startY: number, endX: number, endY: number): SelectionRect => {
    const start = screenToGrid(startX, startY);
    const end = screenToGrid(endX, endY);
    
    return {
      startRow: Math.min(start.row, end.row),
      startCol: Math.min(start.col, end.col),
      endRow: Math.max(start.row, end.row),
      endCol: Math.max(start.col, end.col)
    };
  }, [screenToGrid]);

  const getSlotsInRect = useCallback((rect: SelectionRect): string[] => {
    const slots: string[] = [];
    for (let row = rect.startRow; row <= rect.endRow; row++) {
      for (let col = rect.startCol; col <= rect.endCol; col++) {
        slots.push(`${row}-${col}`);
      }
    }
    return slots;
  }, []);

  const validateSelection = useCallback((slots: string[]): { valid: boolean; message?: string } => {
    if (slots.length === 0) return { valid: false, message: "No slots selected" };
    
    // Check if selection forms a proper rectangle
    const coords = slots.map(slot => {
      const [row, col] = slot.split('-').map(Number);
      return { row, col };
    });
    
    const minRow = Math.min(...coords.map(c => c.row));
    const maxRow = Math.max(...coords.map(c => c.row));
    const minCol = Math.min(...coords.map(c => c.col));
    const maxCol = Math.max(...coords.map(c => c.col));
    
    const expectedSlots = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (slots.length !== expectedSlots) {
      return { valid: false, message: "Selection must be a rectangle" };
    }
    
    // Check if any slot is occupied, pending, or has video
    for (const slot of slots) {
      if (occupiedSlots.has(slot) || videos[slot]) {
        return { valid: false, message: "Selection contains occupied or pending slots" };
      }
    }
    
    return { valid: true };
  }, [occupiedSlots, videos]);

  const calculateMaxDuration = useCallback((slotCount: number): number => {
    return Math.min(15 + 5 * (slotCount - 1), 150);
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isAdmin) return; // Admin doesn't use drag selection
    
    e.preventDefault();
    setDragState({
      isSelecting: true,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY
    });
    setErrorTooltip(null);
  }, [isAdmin]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isSelecting || isAdmin) return;
    
    setDragState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY
    }));

    // Calculate current selection
    const rect = getSelectionRect(dragState.startX, dragState.startY, e.clientX, e.clientY);
    const slotsInRect = getSlotsInRect(rect);
    const validation = validateSelection(slotsInRect);
    
    if (validation.valid) {
      setFloatingPill({
        x: e.clientX,
        y: e.clientY,
        slots: slotsInRect.length
      });
      setErrorTooltip(null);
    } else {
      setFloatingPill(null);
      setErrorTooltip({
        x: e.clientX,
        y: e.clientY,
        message: validation.message || "Invalid selection"
      });
    }
  }, [dragState.isSelecting, dragState.startX, dragState.startY, isAdmin, getSelectionRect, getSlotsInRect, validateSelection]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragState.isSelecting || isAdmin) return;
    
    const rect = getSelectionRect(dragState.startX, dragState.startY, e.clientX, e.clientY);
    const slotsInRect = getSlotsInRect(rect);
    const validation = validateSelection(slotsInRect);
    
    if (validation.valid && slotsInRect.length > 0) {
      onSelectionChange?.(new Set(slotsInRect));
    }
    
    setDragState({
      isSelecting: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    });
    setFloatingPill(null);
    setErrorTooltip(null);
  }, [dragState.isSelecting, dragState.startX, dragState.startY, isAdmin, getSelectionRect, getSlotsInRect, validateSelection, onSelectionChange]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelectionChange?.(new Set());
        setDragState({
          isSelecting: false,
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0
        });
        setFloatingPill(null);
        setErrorTooltip(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectionChange]);

  // Selection overlay rendering
  const renderSelectionOverlay = () => {
    if (!dragState.isSelecting || isAdmin) return null;

    const rect = getSelectionRect(dragState.startX, dragState.startY, dragState.currentX, dragState.currentY);
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return null;

    const startX = rect.startCol * SLOT_SIZE * zoom - containerRef.current!.scrollLeft;
    const startY = rect.startRow * SLOT_SIZE * zoom - containerRef.current!.scrollTop;
    const width = (rect.endCol - rect.startCol + 1) * SLOT_SIZE * zoom;
    const height = (rect.endRow - rect.startRow + 1) * SLOT_SIZE * zoom;

    return (
      <div
        className="absolute border-2 border-primary bg-primary/20 pointer-events-none z-10"
        style={{
          left: startX,
          top: startY,
          width,
          height
        }}
      />
    );
  };

  const handleDoubleClick = useCallback((slotId: string) => {
    // For double-click on multi-slot videos, find the full rectangle
    if (videos[slotId]) {
      // Find if this slot belongs to a multi-slot video by checking video_submissions
      // For now, just handle single slot videos
      handleVideoView(slotId, videos[slotId]);
    }
  }, [videos, handleVideoView]);

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const slotId = `${rowIndex}-${columnIndex}`;
    const isOccupied = occupiedSlots.has(slotId);
    const hasVideo = !!videos[slotId];
    
    return (
      <div style={style}>
        <VideoSlot
          slotId={slotId}
          onVideoUpload={handleVideoUpload}
          onVideoView={handleVideoView}
          onDoubleClick={handleDoubleClick}
          onSlotClick={onSlotClick}
          video={videos[slotId]}
          isAdmin={isAdmin}
          isOccupied={isOccupied}
          hasVideo={hasVideo}
          isSelected={selectedSlots.has(slotId)}
        />
      </div>
    );
  }, [videos, occupiedSlots, handleVideoUpload, handleVideoView, handleDoubleClick, isAdmin, selectedSlots]);

  const gridWidth = GRID_SIZE * SLOT_SIZE * zoom;
  const gridHeight = GRID_SIZE * SLOT_SIZE * zoom;

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Zoom Controls - Only show if admin */}
      {isAdmin && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border">
          <button
            onClick={() => setZoom(prev => Math.min(prev * 1.5, 10))}
            className="px-3 py-1 sparkle-bg text-background rounded text-sm transition-opacity hover:opacity-90"
          >
            Zoom In
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev / 1.5, 0.1))}
            className="px-3 py-1 sparkle-bg text-background rounded text-sm transition-opacity hover:opacity-90"
          >
            Zoom Out
          </button>
          <div className="text-foreground text-xs text-center">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      )}

      {/* Stats - Only show if admin */}
      {isAdmin && (
        <div className="absolute top-4 right-4 z-10 bg-card/80 backdrop-blur-sm rounded-lg p-3 text-foreground text-sm border border-border">
          <div>Total Slots: 1,000,000</div>
          <div className="sparkle-text font-medium">Videos Uploaded: {Object.keys(videos).length}</div>
          <div className="text-orange-500">Occupied Slots: {occupiedSlots.size}</div>
          <div>Available: {1000000 - occupiedSlots.size}</div>
        </div>
      )}

      {/* Grid Container */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-auto relative"
        style={{
          cursor: dragState.isSelecting ? 'crosshair' : (zoom > 1 ? 'grab' : 'default'),
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Grid
          ref={gridRef}
          columnCount={GRID_SIZE}
          columnWidth={SLOT_SIZE * zoom}
          height={window.innerHeight || 800}
          rowCount={GRID_SIZE}
          rowHeight={SLOT_SIZE * zoom}
          width={window.innerWidth || 1200}
          overscanRowCount={50}
          overscanColumnCount={50}
        >
          {Cell}
        </Grid>
        {renderSelectionOverlay()}
      </div>

      {/* Floating Price Pill */}
      {floatingPill && (
        <div
          className="fixed z-50 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: floatingPill.x + 10,
            top: floatingPill.y - 40,
            transform: 'translate(0, -100%)'
          }}
        >
          <div className="text-sm font-medium">
            {floatingPill.slots} slot{floatingPill.slots !== 1 ? 's' : ''} • ${(floatingPill.slots * 0.50).toFixed(2)} USD • Max {calculateMaxDuration(floatingPill.slots)}s
          </div>
        </div>
      )}

      {/* Error Tooltip */}
      {errorTooltip && (
        <div
          className="fixed z-50 bg-destructive text-destructive-foreground px-3 py-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: errorTooltip.x + 10,
            top: errorTooltip.y - 40,
            transform: 'translate(0, -100%)'
          }}
        >
          <div className="text-sm font-medium">{errorTooltip.message}</div>
        </div>
      )}
    </div>
  );
};

export default VideoGrid;
