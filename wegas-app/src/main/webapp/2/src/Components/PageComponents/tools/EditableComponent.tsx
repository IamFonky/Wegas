import * as React from 'react';
import { css, cx } from 'emotion';
import { dropZoneClass } from '../../Contexts/DefaultDndProvider';
import { PAGEEDITOR_COMPONENT_TYPE } from '../../../Editor/Components/Page/ComponentPalette';
import { useDrop, DropTargetMonitor, DragElementWrapper } from 'react-dnd';
import {
  pageCTX,
  Handles,
  PageEditorComponent,
  pageEditorCTX,
} from '../../../Editor/Components/Page/PageEditor';
import {
  flex,
  hatchedBackground,
  hoverColorInsetShadow,
  highlightColorInsetShadow,
  thinHoverColorInsetShadow,
} from '../../../css/classes';
import {
  FlexItem,
  FlexListProps,
  defaultFlexLayoutOptionsKeys,
} from '../../Layouts/FlexList';
import { ErrorBoundary } from '../../../Editor/Components/ErrorBoundary';
import { useDebounce } from '../../Hooks/useDebounce';
import { pick } from 'lodash-es';
import { classNameOrEmpty } from '../../../Helper/className';
import { FonkyFlexContent, FonkyFlexSplitter } from '../../Layouts/FonkyFlex';
import {
  pagesStateStore,
  usePagesStateStore,
  isComponentFocused,
  PageStateAction,
} from '../../../data/pageStore';
import {
  WegasComponentOptionsActions,
  WegasComponentActionsProperties,
  WegasComponentExtra,
  defaultWegasComponentOptionsActions,
  WegasComponentOptionsAction,
  wegasComponentActions,
} from './options';
import {
  AbsoluteItem,
  defaultAbsoluteLayoutPropsKeys,
} from '../../Layouts/Absolute';
import { PlayerInfoBullet } from './InfoBullet';
import { EditHandle } from './EditHandle';
import { PAGE_LAYOUT_COMPONENT } from '../../../Editor/Components/Page/PagesLayout';
import { OptionsState, ComponentOptionsManager } from './OptionsComponent';
// import { ActionsState, ComponentActionsManager } from './ActionsComponent';
import {
  PlayerLinearLayoutProps,
  PlayerLinearLayoutChildrenProps,
} from '../Layouts/LinearLayout.component';
import { useDropFunctions } from '../../Hooks/useDropFunctions';
import { themeVar } from '../../Style/ThemeVars';

// Styles
export const layoutHighlightStyle = hatchedBackground;
//export const layoutHighlightStyle = css({
//  borderStyle: 'solid',
//  borderWidth: '2px',
//  borderColor: themeVar.Common.colors.HighlightColor,
//});

//const childHighlightCSS = {
//  borderStyle: 'dotted',
//  borderWidth: '1px',
//  borderColor: themeVar.Common.colors.HighlightColor,
//};

const childHighlightStyle = css({
  '&>*>*': thinHoverColorInsetShadow,
});

const childDropZoneIntoCSS = {
  '&>*>*>.component-dropzone-into': {
    width: '100%',
    height: '100%',
  },
};

const childDropzoneHorizontalStyle = css({
  ...childDropZoneIntoCSS,
  '&>*>*>.component-dropzone': {
    maxWidth: '30px',
    width: '30%',
    height: '100%',
  },
  '&>*>*>.component-dropzone-after': {
    right: 0,
  },
});

const childDropzoneVerticalStyle = css({
  ...childDropZoneIntoCSS,
  '&>*>*>.component-dropzone': {
    maxHeight: '30px',
    width: '100%',
    height: '30%',
  },
  '&>*>*>.component-dropzone-after': {
    bottom: 0,
  },
});

const handleControlStyle = css({
  // textAlign: 'center',
  '&>.wegas-component-handle': {
    visibility: 'hidden',
    opacity: 0.0,
  },
  ':hover>.wegas-component-handle': {
    visibility: 'unset',
    opacity: 0.8,
  },
});

const disabledStyle = css({
  opacity: 0.5,
  backgroundColor: themeVar.Common.colors.DisabledColor,
});

const focusedComponentStyle = hoverColorInsetShadow;
const selectedComponentStyle = highlightColorInsetShadow;

const handleControlHoverStyle = hoverColorInsetShadow;

const emptyLayoutItemStyle: React.CSSProperties = {
  textAlign: 'center',
  verticalAlign: 'middle',
  borderStyle: 'solid',
  borderWidth: '1px',
  width: '100px',
  height: 'fit-content',
  overflowWrap: 'normal',
  zIndex: 0,
};

// Helper functions

/**
 * visitPath - this function will a tree following a path and trigger a callback at each node
 * @param path - the path to visit
 * @param callback - the callback to call
 */
const visitPath = (path: number[], callback: (path: number[]) => void) => {
  const purePath = [...path];
  do {
    callback(purePath);
    purePath.pop();
  } while (purePath.length > 0);
};

/**
 * checkIfInsideRectangle - this function checks if a point is inside a rectangle
 * @param A - The top-left point of the rectangle
 * @param C - The bottom-right point of the rectangle
 * @param Ptest - The point to test
 */
const checkIfInsideRectangle = (
  A: { x: number; y: number },
  C: { x: number; y: number },
  Ptest: { x: number; y: number },
) => Ptest.x >= A.x && Ptest.x <= C.x && Ptest.y >= A.y && Ptest.y <= C.y;

/**
 * useDndComponentDrop - it's a hook that normalize the usage of useDrop in the different dropable zone used in this file
 * @param onDrop - the function to trigger when a drop occures
 */
function useDndComponentDrop(
  onDrop?: (
    dndComponnent: PageEditorComponent,
    dndMonitor: DropTargetMonitor,
  ) => void,
): [
  {
    isOver: boolean;
    isOverCurrent: boolean;
    canDrop: boolean;
    item: PageEditorComponent | null;
  },
  DragElementWrapper<{}>,
] {
  const [dropZoneProps, dropZone] = useDrop<
    PageEditorComponent,
    void,
    {
      isOver: boolean;
      isOverCurrent: boolean;
      canDrop: boolean;
      item: PageEditorComponent | null;
    }
  >({
    accept: [PAGEEDITOR_COMPONENT_TYPE, PAGE_LAYOUT_COMPONENT],
    canDrop: () => true,
    drop: onDrop,
    collect: (mon: DropTargetMonitor) => ({
      isOver: mon.isOver({ shallow: false }),
      isOverCurrent: mon.isOver({ shallow: true }),
      canDrop: mon.canDrop(),
      item: mon.getItem() as PageEditorComponent | null,
    }),
  });
  const delayedCanDrop = useDebounce(dropZoneProps.canDrop, 100);
  return [{ ...dropZoneProps, canDrop: delayedCanDrop }, dropZone];
}

/**
 * computeHandles - this functions look for every visible handles and stack them
 * @param handles
 * @param path
 * @returns a list of handles that are overlapsing each others
 * @affects this function also hide the handles that are overlapsing
 */
function computeHandles(handles: Handles, path: number[]) {
  const computedHandles: JSX.Element[] = [];
  const currentHandle = handles[JSON.stringify(path)];
  if (currentHandle?.dom.current) {
    const {
      x: cx,
      y: cy,
      width: cw,
      height: ch,
    } = currentHandle.dom.current.getBoundingClientRect();
    const [A1, B1, C1, D1] = [
      { x: cx, y: cy },
      { x: cx, y: cy + ch },
      { x: cx + cw, y: cy + ch },
      { x: cx + cw, y: cy },
    ];
    computedHandles.push(currentHandle.jsx);
    const trimmedPath = path.slice(0, -1);
    visitPath(trimmedPath, visitedPath => {
      const component = handles[JSON.stringify(visitedPath)];
      if (component?.dom.current) {
        const {
          x,
          y,
          width: w,
          height: h,
        } = component.dom.current.getBoundingClientRect();
        const [A2, B2, C2, D2] = [
          { x: x, y: y },
          { x: x, y: y + h },
          { x: x + w, y: y + h },
          { x: x + w, y: y },
        ];
        const [A1in, B1in, C1in, D1in] = [
          checkIfInsideRectangle(A2, C2, A1),
          checkIfInsideRectangle(A2, C2, B1),
          checkIfInsideRectangle(A2, C2, C1),
          checkIfInsideRectangle(A2, C2, D1),
        ];
        const [A2in, B2in, C2in, D2in] = [
          checkIfInsideRectangle(A1, C1, A2),
          checkIfInsideRectangle(A1, C1, B2),
          checkIfInsideRectangle(A1, C1, C2),
          checkIfInsideRectangle(A1, C1, D2),
        ];
        if (A1in || B1in || C1in || D1in || A2in || B2in || C2in || D2in) {
          component.dom.current.style.setProperty('opacity', '0.0');
          computedHandles.splice(0, 0, component.jsx);
        } else {
          component.dom.current.style.setProperty('opacity', null);
        }
      }
    });
  }
  return computedHandles;
}

// Components

interface ComponentDropZoneProps {
  /**
   * onDrop - the called function when an authorized element is dropped on the zone
   */
  onDrop?: (
    dndComponnent: PageEditorComponent,
    dndMonitor: DropTargetMonitor,
  ) => void;
  /**
   * show - show the zone, hidden by default
   */
  show?: boolean;
  /**
   * dropPosition - defines the position of the dropzone in a component
   * left or top for AFTER, right or bottom for BEFORE and over for INTO
   */
  dropPosition: 'BEFORE' | 'AFTER' | 'INTO';
}

function ComponentDropZone({
  onDrop,
  show,
  dropPosition,
}: ComponentDropZoneProps) {
  const [{ isOverCurrent }, dropZone] = useDndComponentDrop(onDrop);
  return (
    <div
      ref={dropZone}
      className={
        dropZoneClass(isOverCurrent) +
        (dropPosition === 'INTO'
          ? ' component-dropzone-into'
          : ' component-dropzone') +
        (dropPosition === 'AFTER' ? ' component-dropzone-after' : '')
      }
      style={{
        // visibility: show ? 'visible' : 'collapse',
        ...(show ? {} : { display: 'none' }),
        position: 'absolute',
      }}
    />
  );
}

interface LockedOverlayProps {
  locked: boolean;
}

function LockedOverlay({ locked }: LockedOverlayProps) {
  return locked ? (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
      }}
    ></div>
  ) : null;
}

/**
 * WegasComponentItemProps - Required props for a layout item component
 */
export interface WegasComponentItemProps extends ClassAndStyle {
  /**
   * onClick - triggered when a click occures on the element
   */
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  /**
   * onMouseOver - triggered when the mouse is over the element
   */
  onMouseOver?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  /**
   * onMouseLeave - trigered when the mouse is no more over the element
   */
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  /**
   * onDragEnter - triggered when the mouse is dragging over the element
   */
  onDragEnter?: (event: React.DragEvent<HTMLDivElement>) => void;
  /**
   * onDragLeave - triggered when the mouse is dragging out of the element
   */
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>) => void;
  /**
   * onDragEnd - triggered when the mouse stops dragging any element
   */
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
  /**
   * tooltip - a descriptive text that apprear when the cursor is idle over the element
   */
  tooltip?: string;
}

/**
 * ContainerTypes - the types of layouts that can be used in a page
 */
export type ContainerTypes = 'FLEX' | 'LINEAR' | 'ABSOLUTE' | 'MENU' | undefined;

/**
 * EmptyPageComponentProps - The props needed for a virtual component (used in a layout when no children)
 */
export interface EmptyPageComponentProps {
  /**
   * path - the path of the current component
   */
  path: number[];
  /**
   * childrenType - the item type of the component
   */
  childrenType: ContainerTypes;
}
/**
 * PageComponentProps - The props that are needed by the ComponentContainer
 */
export interface PageComponentProps extends EmptyPageComponentProps {
  /**
   * componentType - The type of component
   */
  componentType: string;
  /**
   * containerType - the container type of the component
   */
  containerType: ContainerTypes;
  /**
   * last - is this component the last of the list
   */
  last?: boolean;
}

export type WegasComponentOptions = WegasComponentOptionsActions &
  WegasComponentActionsProperties &
  WegasComponentExtra & {
    [options: string]: unknown;
  };

/**
 * WegasComponentProps - Required props for a Wegas component
 */
export interface WegasComponentProps
  extends React.PropsWithChildren<ClassAndStyle>,
    PageComponentProps,
    WegasComponentOptions {
  // /**
  //  * name - The name of the component in the page
  //  */
  // name?: string;
  /**
   * options - Various options that can be defined on every component of a page
   */
  // options?: WegasComponentOptions;
  // extra?: {
  //   actions?: WegasComponentOptionsActions & WegasComponentActionsProperties;
  //   upgrades?: WegasComponentUpgrades;
  //   [options: string]: unknown;
  // };
}

/**
 * ExtractedLayoutProps - Extracted props from currently layout containers
 * Needed to define the orientation of the container
 */
export interface ExtractedLayoutProps {
  layout?: FlexListProps['layout'];
  vertical?: PlayerLinearLayoutProps['vertical'];
  linearChildrenProps?: PlayerLinearLayoutChildrenProps;
}

// const defaultUpgradesState: ExtraState = {
//   disabled: false,
//   hidden: false,
// };
// const defaultActionsState: ActionsState = {
//   locked: false,
// };

type ComponentContainerProps = WegasComponentProps & ExtractedLayoutProps;

const pageDispatch = pagesStateStore.dispatch;

export function ComponentContainer({
  componentType,
  path,
  childrenType,
  containerType,
  last,
  name,
  // options,
  layout,
  vertical,
  linearChildrenProps,
  className,
  style = {},
  children,
  ...options
}: ComponentContainerProps) {
  const container = React.useRef<HTMLDivElement>();
  const mouseOver = React.useRef<boolean>(false);
  const [dragHoverState, setDragHoverState] = React.useState<boolean>(false);
  const [stackedHandles, setStackedHandles] = React.useState<JSX.Element[]>();
  const [extraState, setExtraState] = React.useState<OptionsState>({});
  // const [actionsState, setActionsState] = React.useState<ActionsState>(
  //   defaultActionsState,
  // );
  // const upgrades =
  //   options?.upgrades == null ? defaultUpgradesState : upgradesState;
  // const actions = options?.actions == null ? defaultActionsState : actionsState;
  const { noSplitter, noResize } = linearChildrenProps || {};

  const {
    onDrop,
    editMode,
    handles,
    pageIdPath,
    showBorders,
  } = React.useContext(pageCTX);

  const { editedPath } = React.useContext(pageEditorCTX);

  const pageId = pageIdPath.slice(0, 1)[0];
  const containerPath = [...path];
  const itemPath = containerPath.pop();
  const isNotFirstComponent = path.length > 0;
  const editable = editMode && isNotFirstComponent;
  const showComponent = editable || !extraState.hidden;
  const showLayout = showBorders && containerType != null;
  const computedVertical =
    // BUG HERE
    containerType === 'FLEX'
      ? layout?.flexDirection === 'column' ||
        layout?.flexDirection === 'column-reverse'
      : containerType === 'LINEAR'
      ? vertical
      : false;
  const showSplitter =
    childrenType === 'LINEAR' && !last && (editMode || !noSplitter);
  const allowResize = childrenType === 'LINEAR' && (editMode || !noResize);
  // const isDisabled = (actions.locked || upgrades.disabled) === true;
  const isSelected = JSON.stringify(path) === JSON.stringify(editedPath);
  const isFocused = usePagesStateStore(
    isComponentFocused(editMode, pageId, path),
  );

  const Container = React.useMemo(() => {
    switch (childrenType) {
      case 'LINEAR':
        return FonkyFlexContent;
      case 'ABSOLUTE':
        return AbsoluteItem;
      case 'FLEX':
      default:
        return FlexItem;
    }
  }, [childrenType]);

  // const onClick = React.useCallback(() => {
  //   if (!isDisabled && actions.onClick != null) {
  //     actions.onClick();
  //   }
  // }, [isDisabled, actions]);

  const onClick = React.useCallback(() => {
    if (
      options != null &&
      (!options.confirmClick ||
        // TODO : Find a better way to do that than a modal!!!
        // eslint-disable-next-line no-alert
        confirm(options.confirmClick))
    ) {
      Object.entries(
        pick(
          options,
          Object.keys(defaultWegasComponentOptionsActions),
        ) as WegasComponentOptionsActions,
      )
        .sort(
          (
            [, v1]: [string, WegasComponentOptionsAction],
            [, v2]: [string, WegasComponentOptionsAction],
          ) =>
            (v1.priority ? v1.priority : 0) - (v2.priority ? v2.priority : 0),
        )
        .forEach(([k, v]) =>
          wegasComponentActions[k as keyof WegasComponentOptionsActions](v),
        );
    }
  }, [options]);

  const onMouseOver = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!mouseOver.current) {
        mouseOver.current = true;
        if (editable) {
          e.stopPropagation();
          if (!stackedHandles) {
            setStackedHandles(() => computeHandles(handles, path));
          }
          pageDispatch(PageStateAction.setFocused(pageId, path));
        }
      }
    },
    [editable, handles, pageId, path, stackedHandles],
  );

  const onMouseLeave = React.useCallback(() => {
    mouseOver.current = false;
    if (editable) {
      setStackedHandles(undefined);
      pageDispatch(PageStateAction.unsetFocused());
    }
  }, [editable]);

  const dragEnter = React.useCallback(() => {
    if (editable) {
      setDragHoverState(true);
    }
  }, [editable]);

  const dragLeave = React.useCallback(() => {
    if (editable) {
      setDragHoverState(false);
    }
  }, [editable]);

  const dropFunctions = useDropFunctions(dragEnter, dragLeave, dragLeave);

  React.useEffect(() => {
    setDragHoverState(false);
  }, [children]);

  const onEditableComponentDrop = React.useCallback(
    (dndComponent, dndMonitor) => {
      if (container.current) {
        const { x: absX, y: absY } = dndMonitor.getClientOffset() || {
          x: 0,
          y: 0,
        };
        const {
          left: srcX,
          top: srcY,
        } = container.current.getBoundingClientRect() || {
          x: 0,
          y: 0,
        };

        const [relX, relY] = [absX - srcX, absY - srcY];

        onDrop(dndComponent, path, undefined, {
          options: {
            layout: { position: { left: relX, top: relY } },
          },
        });
      }
    },
    [onDrop, path],
  );

  return (
    <>
      {Object.keys(options).length > 0 && (
        <ComponentOptionsManager
          options={options}
          setUpgradesState={setExtraState}
        />
      )}
      <Container
        ref={ref => {
          // dropZone(ref);
          if (ref != null) {
            container.current = ref;
          }
        }}
        {...pick(
          options,
          childrenType === 'FLEX'
            ? defaultFlexLayoutOptionsKeys
            : childrenType === 'ABSOLUTE'
            ? defaultAbsoluteLayoutPropsKeys
            : [],
        )}
        className={
          cx(handleControlStyle, flex, extraState.themeModeClassName, {
            [layoutHighlightStyle]: showLayout,
            [childHighlightStyle]: showLayout,
            [handleControlHoverStyle]: editMode,
            [focusedComponentStyle]: isFocused,
            [selectedComponentStyle]: isSelected,
            [childDropzoneHorizontalStyle]: !computedVertical,
            [childDropzoneVerticalStyle]: computedVertical,
            [disabledStyle]: extraState.disabled,
          }) + classNameOrEmpty(className)
        }
        style={{
          cursor:
            options?.actions && !extraState.disabled ? 'pointer' : 'initial',
          ...style,
        }}
        onClick={onClick}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        {...dropFunctions}
        tooltip={extraState.tooltip}
      >
        {dragHoverState && editable && containerType === 'ABSOLUTE' && (
          <ComponentDropZone
            onDrop={onEditableComponentDrop}
            show
            dropPosition="INTO"
          />
        )}
        {dragHoverState && editable && childrenType !== 'ABSOLUTE' && (
          <ComponentDropZone
            onDrop={dndComponent =>
              onDrop(dndComponent, containerPath, itemPath)
            }
            show
            dropPosition="BEFORE"
          />
        )}
        {editable && (
          <EditHandle
            name={name}
            stackedHandles={stackedHandles}
            componentType={componentType}
            path={path}
            infoMessage={
              extraState.hidden
                ? 'This component is shown only in edit mode'
                : undefined
            }
            isSelected={isSelected}
          />
        )}
        {showComponent && <ErrorBoundary>{children}</ErrorBoundary>}
        {extraState.infoBulletProps && (
          <PlayerInfoBullet {...extraState.infoBulletProps} />
        )}
        {dragHoverState && editable && childrenType !== 'ABSOLUTE' && (
          <ComponentDropZone
            onDrop={dndComponent =>
              onDrop(
                dndComponent,
                containerPath,
                itemPath != null ? itemPath + 1 : itemPath,
              )
            }
            show
            dropPosition="AFTER"
          />
        )}
        <LockedOverlay
          locked={(extraState.disabled || extraState.locked) === true}
        />
      </Container>
      {showSplitter && <FonkyFlexSplitter notDraggable={!allowResize} />}
    </>
  );
}

export function EmptyComponentContainer({
  path,
  childrenType,
}: EmptyPageComponentProps) {
  const container = React.useRef<HTMLDivElement>();

  const [{ isOver }, dropZone] = useDndComponentDrop();

  const { onDrop, editMode } = React.useContext(pageCTX);

  const Container = React.useMemo(() => {
    switch (childrenType) {
      case 'LINEAR':
        return FonkyFlexContent;
      case 'ABSOLUTE':
        return AbsoluteItem;
      case 'FLEX':
      default:
        return FlexItem;
    }
  }, [childrenType]);

  return (
    <Container
      ref={ref => {
        dropZone(ref);
        if (ref != null) {
          container.current = ref;
        }
      }}
      className={flex}
      style={emptyLayoutItemStyle}
    >
      {editMode && childrenType !== 'ABSOLUTE' && (
        <ComponentDropZone
          onDrop={dndComponent => {
            onDrop(dndComponent, path);
          }}
          show={isOver}
          dropPosition="INTO"
        />
      )}
      The layout is empty, drop components in to fill it!
    </Container>
  );
}
