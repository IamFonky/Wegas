import { css, cx } from 'emotion';
import produce from 'immer';
import { Connection, Defaults, jsPlumbInstance } from 'jsplumb';
import * as React from 'react';
import { IconButton } from '../../Components/Inputs/Button/IconButton';
import { VariableDescriptor } from '../../data/selectors';
import { StoreDispatch, useStore } from '../../data/store';
import { entityIs } from '../../data/entities';
import { Actions } from '../../data';
import { Toolbar } from '../../Components/Toolbar';
import { FontAwesome } from './Views/FontAwesome';
import {
  getInstance,
  editorLabel,
} from '../../data/methods/VariableDescriptorMethods';
import { themeVar } from '../../Components/Theme';
import { EditorAction } from '../../data/Reducer/globalState';
import { State as RState } from '../../data/Reducer/reducers';
import { wlog } from '../../Helper/wegaslog';
import { ComponentWithForm } from './FormView/ComponentWithForm';
import { store } from '../../data/store';
import {
  forceScroll,
  grow,
  flex,
  relative,
  expand,
  hideOverflow,
  autoScroll,
  absoute,
  showOverflow,
} from '../../css/classes';
import { shallowDifferent } from '../../Components/Hooks/storeHookFactory';
import { languagesCTX } from '../../Components/Contexts/LanguagesProvider';
import { createTranslatableContent } from './FormView/translatable';

const editorStyle = css({
  position: 'relative',
  '& .jtk-connector': {
    zIndex: 1,
    '&.jtk-hover': {
      zIndex: 9,
    },
  },
  '& .jtk-endpoint': {
    color: 'transparent',
    zIndex: 2,
    ':hover': {
      color: 'tomato',
      zIndex: 10,
    },
  },
  '& .jtk-overlay': {
    zIndex: 3,
    padding: 5,
    border: '1px solid',
    backgroundColor: 'white',
    '&.jtk-hover': {
      zIndex: 10,
    },
    ':empty': {
      padding: 0,
      border: 0,
    },
  },
});

const searchHighlighted = css({
  // !important is the only way to take the priority because jsPlumb defines chained selectors for the style
  backgroundColor: themeVar.searchColor + ' !important',
});

export const searchWithState = (
  search: RState['global']['search'],
  searched: string,
) => {
  let value = '';
  if (search.type === 'GLOBAL') {
    value = search.value;
  } else if (search.type === 'USAGE') {
    const variable = VariableDescriptor.select(search.value);
    if (variable) {
      value = `Variable.find(gameModel, "${variable.name}")`;
    }
  }
  return value && searched.indexOf(value) >= 0;
};

const JS_PLUMB_OPTIONS: Defaults = {
  Anchor: ['Continuous', { faces: ['top', 'left', 'bottom'] }],
  //                    Anchor: ["Perimeter", {shape: "Rectangle", anchorCount: 120}],
  ConnectionsDetachable: true,
  ReattachConnections: false,
  Endpoint: 'Dot',
  EndpointStyle: {
    fill: 'currentColor',
    // @ts-ignore
    radius: 8,
  },
  Connector: ['Flowchart', {}],
  ConnectionOverlays: [
    [
      'Arrow',
      {
        location: 1,
        width: 10,
        length: 10,
        foldback: 1,
      },
    ],
  ],
  PaintStyle: {
    strokeWidth: 4,
    stroke: themeVar.primaryColor,
    //@ts-ignore
    outlineStroke: 'white',
    outlineWidth: 2,
  },
  HoverPaintStyle: {
    stroke: themeVar.primaryDarkerColor,
  },
};

interface StateMachineEditorProps {
  stateMachine: IFSMDescriptor | IDialogueDescriptor;
  stateMachineInstance: IFSMInstance;
  localDispatch?: StoreDispatch;
  search: RState['global']['search'];
}
interface StateMachineEditorState {
  plumb?: jsPlumbInstance;
  stateMachine: IFSMDescriptor | IDialogueDescriptor;
  oldProps: StateMachineEditorProps;
}
class StateMachineEditor extends React.Component<
  StateMachineEditorProps,
  StateMachineEditorState
> {
  static contextType = languagesCTX;

  static getDerivedStateFromProps(
    nextProps: StateMachineEditorProps,
    { oldProps }: StateMachineEditorState,
  ) {
    if (oldProps === nextProps) {
      return null;
    }
    return { oldProps: nextProps, stateMachine: nextProps.stateMachine };
  }
  constructor(props: StateMachineEditorProps) {
    super(props);
    this.state = { oldProps: props, stateMachine: props.stateMachine };
  }
  container: Element | null = null;
  update(stateMachine: IFSMDescriptor) {
    this.setState({ stateMachine });
  }
  removeTransition = ({
    from,
    transitonIndex,
  }: {
    from: number;
    transitonIndex: number;
  }) => {
    this.setState(
      produce((state: StateMachineEditorState) => {
        const { states } = state.stateMachine;
        states[from].transitions.splice(transitonIndex, 1);
      }),
    );
  };

  createTransition(
    stateMachine: IAbstractStateMachineDescriptor,
    nextStateId: number,
  ): ITransition | IDialogueTransition {
    return entityIs(stateMachine, 'FSMDescriptor', true)
      ? {
          '@class': 'Transition',
          nextStateId,
          triggerCondition: {
            '@class': 'Script',
            language: 'JavaScript',
            content: '',
          },
          preStateImpact: {
            '@class': 'Script',
            language: 'JavaScript',
            content: '',
          },
          index: 0,
          version: 0,
        }
      : {
          '@class': 'DialogueTransition',
          nextStateId,
          triggerCondition: {
            '@class': 'Script',
            language: 'JavaScript',
            content: '',
          },
          preStateImpact: {
            '@class': 'Script',
            language: 'JavaScript',
            content: '',
          },
          index: 0,
          version: 0,
          actionText: createTranslatableContent(this.context.lang),
        };
  }

  produceTransition = ({ from, to }: { from: number; to: number }) => {
    this.setState(
      produce((state: StateMachineEditorState) => {
        const { states } = state.stateMachine;
        (states[from].transitions as IAbstractTransition[]).push(
          this.createTransition(state.stateMachine, to),
        );
      }),
    );
  };
  moveTransition = (
    info: {
      originalSourceId: string;
      originalTargetId: string;
      newSourceId: string;
      newTargetId: string;
    },
    transition: ITransition | IDialogueTransition,
  ) => {
    this.setState(
      produce((state: StateMachineEditorState) => {
        const { states } = state.stateMachine;
        if (info.originalSourceId === info.newSourceId) {
          const tr = (states[Number(info.originalSourceId)]
            .transitions as IAbstractTransition[]).find(
            t => t.id === transition.id,
          );
          if (tr != null) {
            tr.nextStateId = Number(info.newTargetId);
          }
        } else {
          (states[
            Number(info.originalSourceId)
          ] as IAbstractState).transitions = (states[
            Number(info.originalSourceId)
          ].transitions as IAbstractTransition[]).filter(
            t => t.id !== transition.id,
          );
          (states[Number(info.newSourceId)]
            .transitions as IAbstractTransition[]).push({
            ...transition,
          });
        }
      }),
    );
  };
  deleteState = (id: number) => {
    this.setState(
      produce((state: StateMachineEditorState) => {
        const { states } = state.stateMachine!;
        delete states[id];
        // delete transitions pointing to deleted state
        for (const s in states) {
          (states[s] as IAbstractState).transitions = (states[s]
            .transitions as IAbstractTransition[]).filter(
            t => t.nextStateId !== id,
          );
        }
      }),
    );
  };
  moveState = (id: number, pos: [number, number]) => {
    this.setState(
      produce((state: StateMachineEditorState) => {
        state.stateMachine.states[id].editorPosition.x =
          pos[0] < 0 ? 0 : pos[0];
        state.stateMachine.states[id].editorPosition.y =
          pos[1] < 0 ? 0 : pos[1];
      }),
    );
  };

  createState = (
    position: { left: number; top: number },
    transitionSource?: number,
  ) => {
    const { lang } = this.context;
    const state: IState | IDialogueState = entityIs(
      this.props.stateMachine,
      'FSMDescriptor',
    )
      ? {
          '@class': 'State',
          version: 0,
          onEnterEvent: {
            '@class': 'Script',
            content: '',
            language: 'JavaScript',
          },
          editorPosition: {
            x: position.left >= 10 ? position.left : 10,
            y: position.top >= 10 ? position.top : 10,
          },
          label: '',
          transitions: [],
        }
      : {
          '@class': 'DialogueState',
          version: 0,
          onEnterEvent: {
            '@class': 'Script',
            content: '',
            language: 'JavaScript',
          },
          editorPosition: {
            x: position.left >= 10 ? position.left : 10,
            y: position.top >= 10 ? position.top : 10,
          },
          text: createTranslatableContent(lang),
          transitions: [],
        };

    this.setState(
      produce((store: StateMachineEditorState) => {
        const nextId =
          Object.keys(store.stateMachine.states).reduce(
            (p, c) => Math.max(Number(c), p),
            0,
          ) + 1;
        store.stateMachine.states[nextId] = state;
        if (transitionSource != undefined) {
          (store.stateMachine.states[transitionSource]
            .transitions as ISAbstractTransition[]).push(
            this.createTransition(store.stateMachine, nextId),
          );
        }
        return;
      }),
    );
  };
  editState = (e: ModifierKeysEvent, id: number) => {
    const actions: EditorAction<
      IFSMDescriptor | IDialogueDescriptor
    >['more'] = {};
    if (id !== this.props.stateMachine.defaultInstance.currentStateId) {
      actions.delete = {
        label: 'delete',
        action: (
          _entity: IFSMDescriptor | IDialogueDescriptor,
          path?: (string | number)[],
        ) => {
          this.deleteState(Number(path![1]));
        },
      };
    }
    const dispatch =
      e.ctrlKey && this.props.localDispatch
        ? this.props.localDispatch
        : store.dispatch;
    dispatch(
      Actions.EditorActions.editVariable(
        this.props.stateMachine,
        ['states', id],
        undefined,
        {
          more: actions,
        },
      ),
    );
  };
  editTransition = (e: ModifierKeysEvent, path: [number, number]) => {
    const stateId = path[0];
    const transitionIndex = path[1];
    const dispatch =
      e.ctrlKey && this.props.localDispatch
        ? this.props.localDispatch
        : store.dispatch;
    dispatch(
      Actions.EditorActions.editVariable(
        this.props.stateMachine,
        ['states', String(stateId), 'transitions', String(transitionIndex)],
        undefined,
        {
          more: {
            delete: {
              label: 'delete',
              action: (_entity, path) => {
                if (path != null) {
                  this.removeTransition({
                    from: stateId,
                    transitonIndex: transitionIndex,
                  });
                }
              },
            },
          },
        },
      ),
    );
  };
  componentDidMount() {
    import('jsplumb').then(({ jsPlumb }) => {
      const plumb = jsPlumb.getInstance({
        ...JS_PLUMB_OPTIONS,
        Container: this.container,
      });
      this.setState({
        plumb,
      });
      plumb.bind('connection', (info, ev) => {
        if (ev !== undefined) {
          // let the data create it!
          plumb.deleteConnection(info.connection);
          this.produceTransition({
            from: Number(info.sourceId),
            to: Number(info.targetId),
          });
        }
      });
      plumb.bind('connectionDetached', (info, ev) => {
        if (ev !== undefined) {
          const trIndex = (info.connection as any).getParameter(
            'transitionIndex',
          );
          // let jsPlumb remove transition the update data
          requestAnimationFrame(() =>
            this.removeTransition({
              from: Number(info.sourceId),
              transitonIndex: trIndex,
            }),
          );
        }
      });
      plumb.bind('connectionMoved', (info, ev) => {
        if (ev !== undefined) {
          const transition:
            | ITransition
            | IDialogueTransition = (info.connection as any).getParameter(
            'transition',
          );
          this.moveTransition(info, transition);
        }
      });
      plumb.bind('connectionAborted', async connection => {
        const left = parseInt((connection.target as HTMLElement).style.left);
        const top = parseInt((connection.target as HTMLElement).style.top);
        const src = Number(connection.sourceId);
        this.createState({ left, top }, src);
      });
    });
  }
  componentWillUnmount() {
    if (this.state.plumb != null) {
      this.state.plumb.unbind();
    }
  }
  componentDidUpdate(
    _prevProps: StateMachineEditorProps,
    {
      stateMachine: oldStateMachine,
    }: { stateMachine: IFSMDescriptor | IDialogueDescriptor },
  ) {
    requestAnimationFrame(() => {
      if (this.state.plumb != null) {
        this.state.plumb.setSuspendDrawing(false, true);
      }
    });
    const { stateMachine } = this.state;
    if (
      oldStateMachine !== stateMachine &&
      this.props.stateMachine !== stateMachine
    ) {
      store.dispatch(
        Actions.VariableDescriptorActions.updateDescriptor(stateMachine),
      );
    }
  }
  render() {
    const { plumb, stateMachine } = this.state;
    const { stateMachineInstance } = this.props;
    if (stateMachine == null) {
      return null;
    }
    if (plumb != null) {
      plumb.setSuspendDrawing(true);
    }
    return (
      <Toolbar>
        <Toolbar.Header>{editorLabel(stateMachine)}</Toolbar.Header>
        <Toolbar.Content className={cx(flex, relative, showOverflow)}>
          <div
            ref={n => {
              this.container = n;
            }}
            className={cx(editorStyle, expand)}
          >
            {plumb != null &&
              Object.keys(stateMachine.states).map(k => {
                const key = Number(k);
                return (
                  <State
                    editState={this.editState}
                    state={stateMachine.states[key]}
                    currentState={
                      Number(key) === stateMachineInstance.currentStateId
                    }
                    id={key}
                    initialState={
                      stateMachine.defaultInstance.currentStateId === key
                    }
                    key={key}
                    plumb={plumb}
                    deleteState={this.deleteState}
                    moveState={this.moveState}
                    editTransition={this.editTransition}
                    search={this.props.search}
                  />
                );
              })}
          </div>
        </Toolbar.Content>
      </Toolbar>
    );
  }
}

export function ConnectedStateMachineEditor({
  localDispatch,
}: {
  localDispatch?: StateMachineEditorProps['localDispatch'];
}) {
  const stateMachine = React.useRef<IFSMDescriptor | IDialogueDescriptor>();
  const globalState = useStore(s => {
    if (
      s.global.editing &&
      (s.global.editing.type === 'VariableFSM' ||
        // The following condition seems stupid, need to be tested ans documented
        s.global.editing.type === 'Variable')
    ) {
      stateMachine.current = s.global.editing.entity as
        | IFSMDescriptor
        | IDialogueDescriptor;
      const lastFSM = VariableDescriptor.select(s.global.editing.entity.id) as
        | IFSMDescriptor
        | IDialogueDescriptor;
      if (shallowDifferent(stateMachine.current, lastFSM))
        stateMachine.current = lastFSM;
    }
    const instance = stateMachine.current
      ? getInstance(stateMachine.current)
      : undefined;
    if (
      entityIs(stateMachine.current, 'AbstractStateMachineDescriptor', true) &&
      entityIs(instance, 'FSMInstance', true)
    ) {
      return {
        descriptor: stateMachine.current,
        instance,
        search: s.global.search,
      };
    }
  }, shallowDifferent);

  return globalState ? (
    <div className={cx(grow, forceScroll)}>
      <StateMachineEditor
        stateMachine={globalState.descriptor}
        stateMachineInstance={globalState.instance}
        localDispatch={localDispatch}
        search={globalState.search}
      />
    </div>
  ) : null;
}

export default function StateMachineEditorWithMeta() {
  return (
    <ComponentWithForm entityEditor>
      {({ localDispatch }) => {
        return <ConnectedStateMachineEditor localDispatch={localDispatch} />;
      }}
    </ComponentWithForm>
  );
}

const stateStyle = css({
  width: '10em',
  height: '5em',
  border: '1px solid',
  zIndex: 2,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
});
const initialStateStyle = css({
  border: '3px double',
});
const currentStateStyle = css({
  borderColor: themeVar.primaryColor,
});
const sourceStyle = css({
  display: 'inline-block',
  cursor: 'move',
  alignSelf: 'center',
  '& svg': {
    pointerEvents: 'none',
  },
});

function getValue(state: IState | IDialogueState, lang: string): string {
  return entityIs(state, 'State')
    ? state.label
    : state.text.translations[lang]
    ? state.text.translations[lang].translation
    : '';
}

class State extends React.Component<{
  state: IState | IDialogueState;
  id: number;
  initialState: boolean;
  plumb: jsPlumbInstance;
  currentState: boolean;
  editState: (e: ModifierKeysEvent, id: number) => void;
  deleteState: (id: number) => void;
  moveState: (id: number, pos: [number, number]) => void;
  editTransition: (
    e: ModifierKeysEvent,
    path: [number, number],
    transition: ITransition | IDialogueTransition,
  ) => void;
  search: RState['global']['search'];
}> {
  static contextType = languagesCTX;

  container: Element | null = null;
  componentDidMount() {
    const { plumb } = this.props;
    plumb.draggable(this.container!, {
      stop: params => {
        this.props.moveState(this.props.id, params.pos);
      },
      //@ts-ignore
      handle: '.content',
    });
    plumb.makeSource(this.container!, { filter: `.${sourceStyle}` });
    plumb.makeTarget(this.container!, {});
  }
  componentWillUnmount() {
    if (this.container != null) {
      const { plumb } = this.props;
      plumb.unmakeSource(this.container);
      plumb.unmakeTarget(this.container);
      plumb.removeAllEndpoints(this.container);
      /*
      @HACK Alter internal managedElements, make jsplumb forget about this node.
      Allows to reuse a node with same id.
      */
      //@ts-ignore
      delete plumb.getManagedElements()[this.props.id];
    }
  }
  onClickEdit = (e: ModifierKeysEvent) =>
    this.props.editState(e, this.props.id);
  isBeingSearched = () => {
    const value = getValue(this.props.state, this.context.lang);
    const { onEnterEvent } = this.props.state;
    const searched =
      (value ? value : '') + (onEnterEvent ? onEnterEvent.content : '');
    return searchWithState(this.props.search, searched);
  };
  render() {
    const { state, initialState, currentState } = this.props;
    return (
      <div
        className={cx(
          stateStyle,
          {
            [initialStateStyle]: initialState,
            [currentStateStyle]: currentState,
          },
          this.isBeingSearched() && searchHighlighted,
        )}
        id={String(this.props.id)}
        ref={n => {
          this.container = n;
        }}
        style={{
          position: 'absolute',
          left: state.editorPosition.x,
          top: state.editorPosition.y,
        }}
      >
        <Toolbar vertical>
          <Toolbar.Content className="content">
            {getValue(this.props.state, this.context.lang)}
          </Toolbar.Content>
          <Toolbar.Header>
            <IconButton
              icon="edit"
              onClick={(e: ModifierKeysEvent) => this.onClickEdit(e)}
            />
            <div className={sourceStyle}>
              <FontAwesome icon="project-diagram" />
            </div>
            {!initialState && (
              <IconButton
                icon="trash"
                onClick={() => this.props.deleteState(this.props.id)}
              />
            )}
          </Toolbar.Header>
        </Toolbar>
        {(state.transitions as IAbstractTransition[]).map((t, i) => (
          <Transition
            key={`${this.props.id}-${t.nextStateId}-${t.id}`}
            plumb={this.props.plumb}
            transition={t as ITransition | IDialogueTransition}
            position={i}
            parent={this.props.id}
            editTransition={this.props.editTransition}
            search={this.props.search}
          />
        ))}
      </div>
    );
  }
}

class Transition extends React.Component<{
  transition: ITransition | IDialogueTransition;
  plumb: jsPlumbInstance;
  parent: number;
  position: number;
  editTransition: (
    e: ModifierKeysEvent,
    path: [number, number],
    transition: ITransition | IDialogueTransition,
  ) => void;
  search: RState['global']['search'];
}> {
  connection: Connection | null = null;
  isBeingSearched = () => {
    const { triggerCondition, preStateImpact } = this.props.transition;
    const searched =
      (triggerCondition ? triggerCondition.content : '') +
      (preStateImpact ? preStateImpact.content : '');
    return searchWithState(this.props.search, searched);
  };
  componentDidMount() {
    const src = this.props.parent;
    const tgt = this.props.transition.nextStateId;
    this.connection = this.props.plumb.connect({
      source: String(src),
      target: String(tgt),
      ...(src === tgt ? ({ connector: ['StateMachine'] } as any) : undefined),
    });
    if (this.connection) {
      (this.connection as any).bind(
        'click',
        (connection: any, e: ModifierKeysEvent) => {
          this.props.editTransition(
            e,
            [this.props.parent, this.props.position],
            connection.getParameter('transition'),
          );
        },
      );
      this.updateData();
    }
  }
  componentDidUpdate() {
    this.updateData();
  }
  updateData = () => {
    const { triggerCondition } = this.props.transition;
    const label = triggerCondition ? triggerCondition.content : '';
    try {
      this.connection!.setParameter('transition', this.props.transition);
      this.connection!.setParameter('transitionIndex', this.props.position);
      this.connection!.setLabel(label);

      // "(this.connection! as any)" is compulsory since jsPlumb is not fully implemented for TS
      if (this.isBeingSearched()) {
        (this.connection! as any).getLabelOverlay().getElement().className +=
          ' ' + searchHighlighted;
      } else {
        const className = (this.connection! as any)
          .getLabelOverlay()
          .getElement().className;
        (this.connection! as any)
          .getLabelOverlay()
          .getElement().className = className.replace(searchHighlighted, '');
      }
    } catch (e) {
      wlog(e);
    }
  };
  componentWillUnmount() {
    if (this.connection != null) {
      try {
        this.props.plumb.deleteConnection(this.connection);
      } catch {
        // Mostly because jsplumb already deleted it.
      }
    }
  }
  render() {
    return null;
  }
}
