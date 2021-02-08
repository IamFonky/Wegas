import { css } from 'emotion';
import * as React from 'react';
import { XYPosition } from '../Hooks/useMouseEventDnd';
import { themeVar } from '../Style/ThemeVars';
import { FlowLine, Process } from './FlowChart';
import { FlowLineHandle } from './Handles';

const childrenContainerStyle = (selected: boolean) =>
  css({
    position: 'absolute',
    zIndex: selected ? 1000 : 2,
    ':hover': {
      zIndex: selected ? 1000 : 10,
    },
  });

function defaultSelect() {
  return false;
}

export interface FlowLineProps<F extends FlowLine, P extends Process<F>> {
  /**
   * the DOM element from where the flowline starts
   */
  startProcessElement?: HTMLElement;
  /**
   * the DOM element where the flowline ends
   */
  endProcessElement?: HTMLElement;
  /**
   * the process object from where the flowline starts
   */
  startProcess: P;
  /**
   * the process object where the flowline ends
   */
  endProcess: P;
  /**
   * the flowline object to display
   */
  flowline: F;
  /**
   * the offset to apply on the flowline
   * allows to display multiple parralel flowlines
   */
  positionOffset?: number;
  /**
   * a callback triggered when a click occures on a flowline
   */
  onClick?: (e: ModifierKeysEvent, sourceProcess: P, flowline: F) => void;
  /**
   * a condition given by the user to see if flowline is selected or not
   */
  isFlowlineSelected?: (sourceProcess: P, flowline: F) => boolean;
}

interface CustomFlowLineProps<F extends FlowLine, P extends Process<F>>
  extends FlowLineProps<F, P> {
  /**
   * the children component that recieve the flowline object
   * allow to customize easily the flowline label style
   */
  children?: (
    flowline: F,
    sourceProcess: P,
    onClick?: (e: ModifierKeysEvent, sourceProcess: P, flowline: F) => void,
  ) => React.ReactNode;
}

interface Values {
  arrowStart: XYPosition;
  arrowEnd: XYPosition;
  arrowLength: number;
  arrowLeftCorner: XYPosition;
  arrowRightCorner: XYPosition;
  canvasLeft: number;
  canvasTop: number;
  canvasWidth: number;
  canvasHeight: number;
}

interface AxeValues {
  LEFT: Values;
  TOP: Values;
  RIGHT: Values;
  BOTTOM: Values;
}

type Axe = keyof AxeValues;

export function CustomFlowLineComponent<
  F extends FlowLine,
  P extends Process<F>
>({
  startProcessElement,
  endProcessElement,
  startProcess,
  endProcess,
  flowline,
  positionOffset = 0.5,
  onClick,
  isFlowlineSelected = defaultSelect,
  children,
}: CustomFlowLineProps<F, P>) {
  const parent = startProcessElement?.parentElement;
  const parentBox = parent?.getBoundingClientRect();
  const selected = isFlowlineSelected(startProcess, flowline);

  const { arrowLength, axeValues } = React.useMemo(() => {
    if (
      startProcessElement == null ||
      endProcessElement == null ||
      parent == null ||
      parentBox == null
    ) {
      return { arrowLength: undefined, axeValues: undefined };
    }

    const startProcessBox = startProcessElement.getBoundingClientRect();

    const startLeft = startProcessBox.x - parentBox.x;
    const startTop = startProcessBox.y - parentBox.y;
    const startWidth = startProcessBox.width;
    const startHeight = startProcessBox.height;

    const startPointLeft: XYPosition = {
      x: startLeft,
      y: startTop + startHeight / 2,
    };
    const startPointTop: XYPosition = {
      x: startLeft + startWidth / 2,
      y: startTop,
    };
    const startPointRight: XYPosition = {
      x: startLeft + startWidth,
      y: startTop + startHeight / 2,
    };
    const startPointBottom: XYPosition = {
      x: startLeft + startWidth / 2,
      y: startTop + startHeight,
    };

    const endProcessBox = endProcessElement.getBoundingClientRect();

    const endLeft = endProcessBox.x - parentBox.x;
    const endTop = endProcessBox.y - parentBox.y;
    const endWidth = endProcessBox.width;
    const endHeight = endProcessBox.height;

    const endPointLeft: XYPosition = { x: endLeft, y: endTop + endHeight / 2 };
    const endPointTop: XYPosition = { x: endLeft + endWidth / 2, y: endTop };
    const endPointRight: XYPosition = {
      x: endLeft + endWidth,
      y: endTop + endHeight / 2,
    };
    const endPointBottom: XYPosition = {
      x: endLeft + endWidth / 2,
      y: endTop + endHeight,
    };

    const leftArrowLength =
      Math.pow(startPointLeft.x - endPointRight.x, 2) +
      Math.pow(startPointLeft.y - endPointRight.y, 2);
    const topArrowLength =
      Math.pow(startPointTop.x - endPointBottom.x, 2) +
      Math.pow(startPointTop.y - endPointBottom.y, 2);

    const rightArrowLength =
      Math.pow(startPointRight.x - endPointLeft.x, 2) +
      Math.pow(startPointRight.y - endPointLeft.y, 2);

    const bottomArrowLength =
      Math.pow(startPointBottom.x - endPointTop.x, 2) +
      Math.pow(startPointBottom.y - endPointTop.y, 2);

    const arrowLength: { length: number; axe: Axe }[] = [
      { length: leftArrowLength, axe: 'LEFT' },
      { length: topArrowLength, axe: 'TOP' },
      { length: rightArrowLength, axe: 'RIGHT' },
      { length: bottomArrowLength, axe: 'BOTTOM' },
    ];

    const canvasTopHorizontal = Math.min(
      startPointRight.y - startHeight / 2,
      endPointLeft.y - endHeight / 2,
    );
    const canvasHeightHorizontal =
      Math.abs(startPointLeft.y - endPointRight.y) +
      Math.max(startHeight, endHeight);
    const canvasWidthLeft = startPointLeft.x - endPointRight.x;
    const canvasWidthRight = endPointLeft.x - startPointRight.x;

    const canvasLeftVertical = Math.min(
      startPointTop.x - startWidth / 2,
      endPointBottom.x - endWidth / 2,
    );
    const canvasWidthVertical =
      Math.abs(startPointTop.x - endPointBottom.x) +
      Math.max(startWidth, endWidth);
    const canvasHeightTop = startPointTop.y - endPointBottom.y;
    const canvasHeightBottom = endPointTop.y - startPointBottom.y;

    const canvasVerticalOffset =
      Math.min(startHeight, endHeight) * (positionOffset - 0.5);
    const canvasHorizontalOffset =
      Math.min(startWidth, endWidth) * (positionOffset - 0.5);

    return {
      arrowLength,
      axeValues: {
        LEFT: {
          arrowStart: {
            x: canvasWidthLeft,
            y: startPointLeft.y - canvasTopHorizontal,
          },
          arrowEnd: {
            x: 0,
            y: endPointRight.y - canvasTopHorizontal,
          },
          arrowLength: leftArrowLength,
          arrowLeftCorner: { x: endPointRight.x + 5, y: endPointRight.y - 5 },
          arrowRightCorner: { x: endPointRight.x + 5, y: endPointRight.y + 5 },
          canvasLeft: endPointRight.x,
          canvasTop: canvasTopHorizontal + canvasVerticalOffset,
          canvasWidth: canvasWidthLeft,
          canvasHeight: canvasHeightHorizontal,
        },
        TOP: {
          arrowStart: {
            x: startPointTop.x - canvasLeftVertical,
            y: canvasHeightTop,
          },
          arrowEnd: { x: endPointBottom.x - canvasLeftVertical, y: 0 },
          arrowLength: topArrowLength,
          arrowLeftCorner: { x: endPointRight.x + 5, y: endPointRight.y + 5 },
          arrowRightCorner: { x: endPointRight.x - 5, y: endPointRight.y + 5 },
          canvasLeft: canvasLeftVertical + canvasHorizontalOffset,
          canvasTop: endPointBottom.y,
          canvasWidth: canvasWidthVertical,
          canvasHeight: canvasHeightTop,
        },
        RIGHT: {
          arrowStart: {
            x: 0,
            y: startPointRight.y - canvasTopHorizontal,
          },
          arrowEnd: {
            x: canvasWidthRight,
            y: endPointLeft.y - canvasTopHorizontal,
          },
          arrowLength: rightArrowLength,
          arrowLeftCorner: { x: endPointRight.x - 5, y: endPointRight.y + 5 },
          arrowRightCorner: { x: endPointRight.x - 5, y: endPointRight.y - 5 },
          canvasLeft: startPointRight.x,
          canvasTop: canvasTopHorizontal + canvasVerticalOffset,
          canvasWidth: canvasWidthRight,
          canvasHeight: canvasHeightHorizontal,
        },
        BOTTOM: {
          arrowStart: { x: startPointBottom.x - canvasLeftVertical, y: 0 },
          arrowEnd: {
            x: endPointTop.x - canvasLeftVertical,
            y: canvasHeightBottom,
          },
          arrowLength: bottomArrowLength,
          arrowLeftCorner: { x: endPointRight.x + 5, y: endPointRight.y - 5 },
          arrowRightCorner: { x: endPointRight.x - 5, y: endPointRight.y - 5 },
          canvasLeft: canvasLeftVertical + canvasHorizontalOffset,
          canvasTop: startPointBottom.y,
          canvasWidth: canvasWidthVertical,
          canvasHeight: canvasHeightBottom,
        },
      },
    };
  }, [
    endProcessElement,
    parent,
    parentBox,
    positionOffset,
    startProcessElement,
  ]);

  if (arrowLength == null || axeValues == null) {
    return null;
  }

  const shortestArrow = arrowLength.sort((a, b) => a.length - b.length)[0];
  const values = axeValues[shortestArrow.axe];

  const canvasLeft = values.canvasLeft + (parent?.scrollLeft || 0);
  const canvasTop = values.canvasTop + (parent?.scrollTop || 0);

  const handleRotation = Math.atan2(
    values.arrowEnd.y - values.arrowStart.y,
    values.arrowEnd.x - values.arrowStart.x,
  );

  const startHandlePosition = {
    x: canvasLeft + values.arrowStart.x,
    y: canvasTop + values.arrowStart.y,
  };

  const endHandlePosition = {
    x: canvasLeft + values.arrowEnd.x,
    y: canvasTop + values.arrowEnd.y,
  };

  return (
    <>
      <svg
        style={{
          zIndex: selected ? 1 : 0,
          position: 'absolute',
          left: canvasLeft,
          top: canvasTop,
          width: values.canvasWidth,
          height: values.canvasHeight,
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="15"
            markerHeight="10"
            refX="15"
            refY="5"
            orient="auto"
          >
            <polygon points="0 0, 15 5, 0 10" />
          </marker>
          <marker
            id="selectedarrowhead"
            markerWidth="15"
            markerHeight="10"
            refX="15"
            refY="5"
            orient="auto"
            fill={'orange'}
          >
            <polygon points="0 0, 15 5, 0 10" />
          </marker>

          <marker
            id="arrowtail"
            markerWidth="15"
            markerHeight="10"
            refX="0"
            refY="5"
            orient="auto"
          >
            <polygon points="0 0, 10 0,15 5, 10 10, 0 10, 5 5" />
          </marker>
          <marker
            id="selectedarrowtail"
            markerWidth="15"
            markerHeight="10"
            refX="0"
            refY="5"
            orient="auto"
            fill={'orange'}
          >
            <polygon points="0 0, 10 0,15 5, 10 10, 0 10, 5 5" />
          </marker>
        </defs>
        <line
          x1={values.arrowStart.x}
          y1={values.arrowStart.y}
          x2={values.arrowEnd.x}
          y2={values.arrowEnd.y}
          style={{
            stroke: 'rgb(0,0,0)',
            strokeWidth: 2,
          }}
          markerStart={`url(#${selected ? 'selectedarrowtail' : 'arrowtail'})`}
          markerEnd={`url(#${selected ? 'selectedarrowhead' : 'arrowhead'})`}
        />
      </svg>
      <FlowLineHandle
        position={startHandlePosition}
        translation={{ x: 0, y: 0.5 }}
        rotation={handleRotation}
        processes={{ sourceProcess: startProcess, targetProcess: endProcess }}
        selected={selected}
        flowline={flowline}
        backward={true}
      />
      <FlowLineHandle
        position={endHandlePosition}
        translation={{ x: 0, y: 0.5 }}
        rotation={handleRotation - Math.PI}
        processes={{ sourceProcess: startProcess }}
        selected={selected}
        flowline={flowline}
        backward={false}
      />
      <div
        ref={ref => {
          if (ref != null) {
            const labelBox = ref.getBoundingClientRect();
            ref.style.setProperty(
              'left',
              canvasLeft + (values.canvasWidth - labelBox.width) / 2 + 'px',
            );
            ref.style.setProperty(
              'top',
              canvasTop + (values.canvasHeight - labelBox.height) / 2 + 'px',
            );
          }
        }}
        className={childrenContainerStyle(selected)}
        onClick={e => {
          (e.target as HTMLDivElement).focus();
        }}
      >
        {children && children(flowline, startProcess, onClick)}
      </div>
    </>
  );
}

const LABEL_WIDTH = 80;
const LABEL_HEIGHT = 35;

const flowLineLabelStyle = css({
  minWidth: `${LABEL_WIDTH}px`,
  minHeight: `${LABEL_HEIGHT}px`,
  backgroundColor: themeVar.Common.colors.HoverColor,
  borderRadius: '10px',
  boxShadow: `5px 5px 5px ${themeVar.Common.colors.HeaderColor}`,
  userSelect: 'none',
  overflow: 'show',
});

export function DefaultFlowLineComponent<
  F extends FlowLine,
  P extends Process<F>
>(props: FlowLineProps<F, P>) {
  return (
    <CustomFlowLineComponent {...props}>
      {(flowline, startProcess, onClick) => (
        <div
          onClick={e => onClick && onClick(e, startProcess, flowline)}
          className={flowLineLabelStyle}
        >
          {flowline.id}
        </div>
      )}
    </CustomFlowLineComponent>
  );
}

interface StartProcessElement {
  startProcessElement: HTMLElement;
}

interface EndProcessElement {
  endProcessElement: HTMLElement;
}

export function isStartProcessElement(
  processElements: StartProcessElement | EndProcessElement,
): processElements is StartProcessElement {
  return 'startProcessElement' in processElements;
}

export interface TempFlowLineProps {
  /**
   * the DOM element from where the flowline starts
   */
  processElements: StartProcessElement | EndProcessElement;
  /**
   * the position of the dragged handle
   */
  position: XYPosition;
}

export function TempFlowLine({ processElements, position }: TempFlowLineProps) {
  const parent = isStartProcessElement(processElements)
    ? processElements.startProcessElement.parentElement
    : processElements.endProcessElement.parentElement;
  const parentBox = parent!.getBoundingClientRect();

  let startX = position.x + parent!.scrollLeft;
  let startY = position.y + parent!.scrollTop;
  let endX = position.x + parent!.scrollLeft;
  let endY = position.y + parent!.scrollTop;

  if (isStartProcessElement(processElements)) {
    const startProcessBox = processElements.startProcessElement.getBoundingClientRect();
    startX = startProcessBox.x + startProcessBox.width / 2 - parentBox.x;
    startY = startProcessBox.y + startProcessBox.height / 2 - parentBox.y;
  } else {
    const endProcessBox = processElements.endProcessElement.getBoundingClientRect();
    endX = endProcessBox.x + endProcessBox.width / 2 - parentBox.x;
    endY = endProcessBox.y + endProcessBox.height / 2 - parentBox.y;
  }

  return (
    <svg
      style={{
        zIndex: -1,
        position: 'absolute',
        // 100% size here doesn't work as parent doesn't have defined size
        width: `${parent!.scrollWidth}px`,
        height: `${parent!.scrollHeight}px`,
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="15"
          markerHeight="10"
          refX="15"
          refY="5"
          orient="auto"
        >
          <polygon points="0 0, 15 5, 0 10" />
        </marker>
        <marker
          id="arrowtail"
          markerWidth="15"
          markerHeight="10"
          refX="0"
          refY="5"
          orient="auto"
        >
          <polygon points="0 0, 10 0,15 5, 10 10, 0 10, 5 5" />
        </marker>
      </defs>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        style={{
          stroke: 'rgb(0,0,0)',
          strokeWidth: 2,
        }}
        markerStart={`url(#arrowtail)`}
        markerEnd={`url(#arrowhead)`}
      />
    </svg>
  );
}
