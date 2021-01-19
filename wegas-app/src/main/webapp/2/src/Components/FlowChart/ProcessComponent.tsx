import * as React from 'react';
import { css } from 'emotion';
import { XYPosition, useMouseEventDnd } from '../Hooks/useMouseEventDnd';
import { themeVar } from '../Style/ThemeVars';
import { FlowLine, Process } from './FlowChart';
import {
  DefaultProcessHandle,
  DnDFlowchartHandle,
  ProcessHandleProps,
  PROCESS_HANDLE_DND_TYPE,
} from './ProcessHandle';
import { useDrop } from 'react-dnd';

const PROCESS_WIDTH = 100;
const PROCESS_HEIGHT = 50;

const processStyle = css({
  position: 'absolute',
  overflow: 'show',
  cursor: 'move',
  userSelect: 'none',
});

export interface ProcessProps<F extends FlowLine, P extends Process<F>> {
  /**
   * the process object to be displayed
   */
  process: P;
  /**
   * a callback triggerd when the component is rendered
   * Could also be done with a ForwadRef but require much less workload from react and prevent type problems that way
   */
  onReady: (element: HTMLDivElement) => void;
  /**
   * a callback triggered when a component has been moved
   */
  onMove: (postion: XYPosition) => void;
  /**
   * a callback triggered when a component movement ended
   */
  onMoveEnd: (postion: XYPosition) => void;
  /**
   * a callback triggered when a handle is dropped on the process component
   */
  onConnect: (sourceProcess: P, flowline?: F) => void;
  /**
   * a handle component that can be dragged to create new flowlines and processes
   */
  ProcessHandle?: React.FunctionComponent<ProcessHandleProps<F, P>>;
}

interface CustomProcessProps<F extends FlowLine, P extends Process<F>>
  extends ProcessProps<F, P> {
  /**
   * the children component that recieve the process object
   * allow to customize easily the process style
   */
  children: (process: P) => React.ReactNode;
}

export function CustomProcessComponent<
  F extends FlowLine,
  P extends Process<F>
>({
  process,
  onReady,
  onMove,
  onMoveEnd,
  onConnect,
  ProcessHandle = DefaultProcessHandle,
  children,
}: CustomProcessProps<F, P>) {
  const processElement = React.useRef<HTMLDivElement | null>(null);
  const clickPosition = React.useRef<XYPosition>({ x: 0, y: 0 });

  const [, drop] = useDrop<DnDFlowchartHandle<F, P>, unknown, unknown>({
    accept: PROCESS_HANDLE_DND_TYPE,
    canDrop: () => true,
    drop: ({ sourceProcess, flowline }) => {
      onConnect(sourceProcess, flowline);
    },
  });

  const onDragStart = React.useCallback((e: MouseEvent) => {
    const targetBox = (e.target as HTMLDivElement).getBoundingClientRect();
    clickPosition.current = {
      x: e.clientX - targetBox.left,
      y: e.clientY - targetBox.top,
    };
  }, []);

  const onDrag = React.useCallback(
    (_e: MouseEvent, position: XYPosition) => onMove(position),
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

  return (
    <div
      ref={ref => {
        drop(ref);
        if (ref != null) {
          processElement.current = ref;
          onReady(ref);
        }
      }}
      style={{ left: process.position.x, top: process.position.y }}
      className={processStyle}
      data-id={process.id}
    >
      {children(process)}
      <ProcessHandle sourceProcess={process} />
    </div>
  );
}

const defaultProcessStyle = css({
  backgroundColor: themeVar.Common.colors.ActiveColor,
  borderRadius: '10px',
  boxShadow: `5px 5px 5px ${themeVar.Common.colors.HeaderColor}`,
  minWidth: `${PROCESS_WIDTH}px`,
  minHeight: `${PROCESS_HEIGHT}px`,
});

export function DefaultProcessComponent<
  F extends FlowLine,
  P extends Process<F>
>(props: ProcessProps<F, P>) {
  return (
    <CustomProcessComponent {...props}>
      {process => <div className={defaultProcessStyle}>{process.id}</div>}
    </CustomProcessComponent>
  );
}
