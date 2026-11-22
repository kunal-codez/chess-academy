import React, { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';
import { Key } from 'chessground/types';

export interface ChessgroundBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  turnColor: 'white' | 'black';
  dests: Map<Key, Key[]>;
  check: boolean;
  lastMove?: Key[];
  interactive?: boolean;
  onMove: (orig: Key, dest: Key) => void;
  shapes?: any[];
}

export const ChessgroundBoard: React.FC<ChessgroundBoardProps> = ({
  fen,
  orientation,
  turnColor,
  dests,
  check,
  lastMove,
  interactive = true,
  onMove,
  shapes = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<Api | null>(null);

  // Initialize Chessground
  useEffect(() => {
    if (!containerRef.current) return;

    const config: Config = {
      fen,
      orientation,
      turnColor,
      check,
      lastMove: lastMove && lastMove.length === 2 ? [lastMove[0], lastMove[1]] : undefined,
      coordinates: true,
      animation: { enabled: true, duration: 200 },
      movable: {
        free: false,
        color: interactive ? turnColor : undefined,
        dests: interactive ? dests : new Map(),
        events: {
          after: onMove
        }
      },
      draggable: {
        enabled: interactive,
        showGhost: true
      },
      selectable: {
        enabled: interactive
      },
      drawable: {
        enabled: true,
        autoShapes: shapes,
        shapes: []
      }
    };

    const ground = Chessground(containerRef.current, config);
    groundRef.current = ground;

    // Window resize observer to ensure Chessground redraws crisp piece positions
    const handleResize = () => {
      ground.redrawAll();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ground.destroy();
      groundRef.current = null;
    };
  }, []);

  // Sync state changes to existing Chessground instance
  useEffect(() => {
    if (!groundRef.current) return;

    groundRef.current.set({
      fen,
      orientation,
      turnColor,
      check,
      lastMove: lastMove && lastMove.length === 2 ? [lastMove[0], lastMove[1]] : undefined,
      movable: {
        free: false,
        color: interactive ? turnColor : undefined,
        dests: interactive ? dests : new Map(),
        events: {
          after: onMove
        }
      },
      draggable: {
        enabled: interactive,
        showGhost: true
      },
      selectable: {
        enabled: interactive
      },
      drawable: {
        autoShapes: shapes
      }
    });
  }, [fen, orientation, turnColor, dests, check, lastMove, interactive, shapes]);

  return (
    <div className="w-full flex justify-center items-center">
      <div className="chessground-wrapper brown w-full max-w-[500px] aspect-square relative select-none">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
