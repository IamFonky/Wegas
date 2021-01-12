import * as React from 'react';
import { css } from 'emotion';
import { XYPosition, useMouseEventDnd } from '../Hooks/useMouseEventDnd';
import { themeVar } from '../Style/ThemeVars';
import { Process } from './FlowChart';
import { HANDLE_SIDE, ProcessHandle } from './ProcessHandle';

const PROCESS_WIDTH = 100;
const PROCESS_HEIGHT = 50;

const processStyle = css({
  position: 'absolute',
  minWidth: `${PROCESS_WIDTH}px`,
  minHeight: `${PROCESS_HEIGHT}px`,
  backgroundColor: themeVar.Common.colors.ActiveColor,
  borderRadius: '10px',
  boxShadow: `5px 5px 5px ${themeVar.Common.colors.HeaderColor}`,
  cursor: 'move',
  userSelect: 'none',
  overflow: 'show',
});

export interface ProcessProps extends Process {
  id: string;
  onMoveEnd: (postion: XYPosition) => void;
  onMove: (postion: XYPosition) => void;
  onNew: (position: XYPosition) => void;
  onReady: (element: HTMLElement) => void;
}

export function ProcessComponent({
  id,
  position,
  onMoveEnd,
  onMove,
  onNew,
  onReady,
}: ProcessProps) {
  const processElement = React.useRef<HTMLDivElement | null>(null);
  const clickPosition = React.useRef<XYPosition>({ x: 0, y: 0 });

  const onDragStart = React.useCallback((e: MouseEvent) => {
    const targetBox = (e.target as HTMLDivElement).getBoundingClientRect();
    clickPosition.current = {
      x: e.clientX - targetBox.left,
      y: e.clientY - targetBox.top,
    };
  }, []);

  const onDrag = React.useCallback(
    (_e: MouseEvent, position: XYPosition) => {
      onMove(position);
    },
    [onMove],
  );

  const onDragEnd = React.useCallback(
    (_e: MouseEvent, position: XYPosition) => {
      onMoveEnd({
        x: Math.max(position.x, 0),
        y: Math.max(position.y, 0),
      });
    },
    [onMoveEnd],
  );

  useMouseEventDnd(processElement, {
    onDragStart,
    onDrag,
    onDragEnd,
  });

  const onHandleDragEnd = React.useCallback(
    (_e: MouseEvent, componentPosition: XYPosition) => {
      const x = position.x + componentPosition.x;
      const y = position.y + componentPosition.y;
      onNew({ x: Math.max(x, 0), y: Math.max(y, 0) });
      return true;
    },
    [onNew, position.x, position.y],
  );

  return (
    <div
      ref={ref => {
        if (ref != null) {
          processElement.current = ref;
          onReady(ref);
        }
      }}
      style={{ left: position.x, top: position.y }}
      className={processStyle}
    >
      {id}
      <ProcessHandle
        position={{
          x: PROCESS_WIDTH - HANDLE_SIDE / 2,
          y: (PROCESS_HEIGHT - HANDLE_SIDE) / 2,
        }}
        handlers={{ onDragEnd: onHandleDragEnd }}
      />
    </div>
  );
}
