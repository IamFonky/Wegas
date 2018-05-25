import * as React from 'react';
import { findDOMNode } from 'react-dom';
import {
  DropTarget,
  ConnectDropTarget,
  ClientOffset,
  DropTargetMonitor,
} from 'react-dnd';

export type DropLocation = 'INSIDE' | 'AFTER' | 'BEFORE' | 'AUTO';

export const TREEVIEW_ITEM_TYPE = 'TREEVIEW_DRAG_ITEM';
export interface ItemDescription {
  id: {};
  parent?: {};
  index: number;
  boundingRect: ClientRect | DOMRect;
}
export interface Outcome {
  where: DropLocation;
  outcome: {
    parent?: {};
    index: number;
  };
}
function pos(position: ClientOffset, target: Element): DropLocation {
  const rect = target.getBoundingClientRect();
  const middle = rect.height / 2;
  const relTop = position.y - rect.top;
  if (relTop < middle) {
    return 'BEFORE';
  }
  return 'AFTER';
}
function outcome(
  props: DropZoneProps,
  item: ItemDescription,
  monitor: DropTargetMonitor,
  component: React.Component<DropZoneProps>,
): Outcome {
  let index;
  switch (props.where) {
    case 'AFTER':
      if (item.parent === props.id && item.index < props.index) {
        index = props.index;
      } else {
        index = props.index + 1;
      }
      break;

    case 'BEFORE':
      if (item.parent === props.id && item.index < props.index) {
        index = props.index - 1;
      } else {
        index = props.index;
      }
      break;
    case 'INSIDE':
      index = props.index;
      break;
    case 'AUTO':
      return outcome(
        {
          ...props,
          where: pos(
            monitor!.getClientOffset(),
            // @ts-ignore
            component.separator || findDOMNode(component!),
          ),
        },
        item,
        monitor,
        component,
      );
    default:
      index = props.index;
  }
  return {
    where: props.where,
    outcome: {
      parent: props.id,
      index,
    },
  };
}
interface DropZoneProps {
  id?: {};
  where: DropLocation;
  index: number;
  children: (
    passProps: {
      isOver: boolean;
      where: DropLocation;
      boundingRect?: DOMRect | ClientRect;
      separator: (sep: React.ReactElement<any>) => JSX.Element;
    },
  ) => React.ReactElement<any>;
}
interface ConDropZoneProps extends DropZoneProps {
  isOver: boolean;
  item: ItemDescription;
  connectDropTarget: ConnectDropTarget;
}
class DropZoneContainer extends React.Component<
  ConDropZoneProps,
  { where: DropLocation; oldProps: ConDropZoneProps }
> {
  static getDerivedStateFromProps(
    nextProps: ConDropZoneProps,
    { oldProps }: { oldProps: ConDropZoneProps },
  ) {
    if (oldProps === nextProps) {
      return null;
    }
    return {
      oldProps: nextProps,
      where: nextProps.where,
    };
  }
  separator: HTMLElement | null = null;
  constructor(props: ConDropZoneProps) {
    super(props);
    this.state = {
      oldProps: props,
      where: props.where,
    };
  }
  render() {
    const { isOver, connectDropTarget, children, item } = this.props;
    const { where } = this.state;

    return connectDropTarget(
      children({
        isOver,
        boundingRect: item ? item.boundingRect : undefined,
        where,
        separator: element =>
          React.cloneElement(element, {
            ref: (n: HTMLElement | null) => (this.separator = n),
          }),
      }),
    );
  }
}
export const DropZone = DropTarget<DropZoneProps>(
  TREEVIEW_ITEM_TYPE,
  {
    drop(props, monitor, component) {
      if (monitor!.didDrop()) {
        return;
      }
      const item = monitor!.getItem() as ItemDescription;
      return outcome(props, item, monitor!, component!);
    },
    hover(props, monitor, component) {
      if (!monitor!.isOver({ shallow: true }) || !monitor!.canDrop()) {
        return;
      }
      const item = monitor!.getItem() as ItemDescription;
      component!.setState({
        where: outcome(props, item, monitor!, component!).where,
      });
    },
  },
  function(connect, monitor) {
    return {
      connectDropTarget: connect.dropTarget(),
      isOver: monitor.isOver({ shallow: true }),
      item: monitor.getItem() as ItemDescription,
    };
  },
)(DropZoneContainer);
