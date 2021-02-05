import { css, cx } from 'emotion';
import * as React from 'react';
// import * as ReactDOMServer from 'react-dom/server';
import { VariableDescriptor } from '../../data/selectors';
import { entityIs } from '../../data/entities';
import { getInstance } from '../../data/methods/VariableDescriptorMethods';
import { State as RState } from '../../data/Reducer/reducers';
import { ComponentWithForm } from './FormView/ComponentWithForm';
import {
  forceScroll,
  grow,
  flex,
  flexRow,
  flexColumn,
} from '../../css/classes';
import { shallowDifferent } from '../../Components/Hooks/storeHookFactory';
import {
  IDialogueDescriptor,
  IFSMDescriptor,
  IAbstractTransition,
} from 'wegas-ts-api';
import { Button } from '../../Components/Inputs/Buttons/Button';
import { SimpleInput } from '../../Components/Inputs/SimpleInput';
import HTMLEditor from '../../Components/HTMLEditor';
import {
  FlowChart,
  FlowLine,
  Process,
} from '../../Components/FlowChart/FlowChart';
import { store, StoreDispatch, useStore } from '../../data/Stores/store';
import { Actions } from '../../data';
import { createScript } from '../../Helper/wegasEntites';
import { languagesCTX } from '../../Components/Contexts/LanguagesProvider';
import { createTranslatableContent } from './FormView/translatable';
import { XYPosition } from '../../Components/Hooks/useMouseEventDnd';
import { IAbstractState } from 'wegas-ts-api/typings/WegasEntities';
import { EditorAction } from '../../data/Reducer/globalState';
import { mainLayoutId } from './Layout';
import { focusTab } from './LinearTabLayout/LinearLayout';
import { wlog } from '../../Helper/wegaslog';
import produce, { Immutable } from 'immer';

export function searchWithState(
  search?: RState['global']['search'],
  searched?: string,
): boolean {
  let value = '';
  if (search == null || searched == null) {
    return false;
  }
  if (search.type === 'GLOBAL') {
    value = search.value;
  } else if (search.type === 'USAGE') {
    const variable = VariableDescriptor.select(search.value);
    if (variable) {
      value = `Variable.find(gameModel, "${variable.name}")`;
    }
  }
  return value !== '' && searched.indexOf(value) >= 0;
}

function deleteState<T extends IFSMDescriptor | IDialogueDescriptor>(
  stateMachine: Immutable<T>,
  id: number,
) {
  const newStateMachine = produce((stateMachine: T) => {
    const { states } = stateMachine;
    delete states[id];
    // delete transitions pointing to deleted state
    for (const s in states) {
      (states[s] as IAbstractState).transitions = (states[s]
        .transitions as IAbstractTransition[]).filter(
        t => t.nextStateId !== id,
      );
    }
  })(stateMachine);

  store.dispatch(
    Actions.VariableDescriptorActions.updateDescriptor(newStateMachine),
  );
}

interface TransitionFlowLine<T extends IAbstractTransition> extends FlowLine {
  transition: T;
}

interface StateProcess<T extends IAbstractTransition, S extends IAbstractState>
  extends Process<TransitionFlowLine<T>> {
  state: S;
}

interface StateMachineEditorProps<
  IFSM extends IFSMDescriptor | IDialogueDescriptor
> {
  stateMachine: Immutable<IFSM>;
  stateMachineInstance: IFSM['defaultInstance'];
  localDispatch?: StoreDispatch;
  forceLocalDispatch?: boolean;
  search?: RState['global']['search'];
  title?: string;
}
export function StateMachineEditor<
  IFSM extends IFSMDescriptor | IDialogueDescriptor
>({
  title,
  stateMachine,
  localDispatch,
  forceLocalDispatch,
}: //search,
StateMachineEditorProps<IFSM>) {
  type TState = IFSM['states'][0];
  type TTransition = TState['transitions'][0];
  type TTransitionFlowLine = TransitionFlowLine<TTransition>;
  type TStateProcess = StateProcess<TTransition, TState>;

  const { lang } = React.useContext(languagesCTX);

  const processes: TStateProcess[] = React.useMemo(
    () =>
      Object.entries(stateMachine.states).map(([key, state]) => ({
        state: state as TState,
        id: key,
        position: { x: state.x, y: state.y },
        connections: (state.transitions as IAbstractTransition[]).map(
          transition => ({
            transition: transition as TTransition,
            id: String(transition.id),
            connectedTo: String(transition.nextStateId),
          }),
        ),
      })),
    [stateMachine.states],
  );

  const createTransition: (
    nextStateId: number,
    index: number,
  ) => TTransition = React.useCallback(
    (nextStateId, index) => {
      return {
        ...{
          version: 0,
          nextStateId,
          preStateImpact: createScript(),
          triggerCondition: createScript(),
          index,
        },
        ...(entityIs(stateMachine, 'FSMDescriptor')
          ? { '@class': 'Transition', label: '' }
          : {
              '@class': 'DialogueTransition',
              actionText: createTranslatableContent(lang),
            }),
      };
    },
    [lang, stateMachine],
  );

  const connectState = React.useCallback(
    (
      sourceState: TStateProcess,
      targetState: TStateProcess,
      transition?: TTransitionFlowLine,
    ) => {
      const newTransition: TTransition =
        transition != null
          ? { ...transition.transition, nextStateId: Number(targetState.id) }
          : createTransition(
              Number(targetState.id),
              sourceState.state.transitions.length,
            );

      const newStateMachine = produce((stateMachine: IFSM) => {
        const state = stateMachine.states[Number(sourceState.id)];

        state.transitions = (state.transitions as TTransition[]).filter(
          t => transition == null || t.id !== transition.transition.id,
        ) as typeof state.transitions;
        (state.transitions as IAbstractTransition[]).push(newTransition);
      })(stateMachine);

      store.dispatch(
        Actions.VariableDescriptorActions.updateDescriptor(newStateMachine),
      );
    },
    [createTransition, stateMachine],
  );

  const updateStatePosition = React.useCallback(
    (sourceState: TStateProcess, position: XYPosition) => {
      const newStateMachine = produce((stateMachine: IFSM) => {
        stateMachine.states[Number(sourceState.id)].x =
          position.x >= 10 ? position.x : 10;
        stateMachine.states[Number(sourceState.id)].y =
          position.y >= 10 ? position.y : 10;
      })(stateMachine);

      store.dispatch(
        Actions.VariableDescriptorActions.updateDescriptor(
          newStateMachine,
          false,
        ),
      );
    },
    [stateMachine],
  );

  const createState = React.useCallback(
    (
      sourceState: TStateProcess,
      position: XYPosition,
      transition?: TTransitionFlowLine,
    ) => {
      const newState: TState = {
        ...{
          version: 0,
          onEnterEvent: createScript(),
          x: position.x >= 10 ? position.x : 10,
          y: position.y >= 10 ? position.y : 10,
          transitions: [],
        },
        ...(entityIs(stateMachine, 'FSMDescriptor')
          ? { '@class': 'State', label: '' }
          : {
              '@class': 'DialogueState',
              text: createTranslatableContent(lang),
            }),
      };

      const newStateId =
        (Number(
          Object.keys(stateMachine.states)
            .sort((a, b) => Number(a) - Number(b))
            .pop(),
        ) || 0) + 1;

      const states = stateMachine.states;
      const currentSource = states[Number(sourceState.id)];
      const currentTransitions = currentSource.transitions;

      const newTransition = transition
        ? { ...transition.transition, nextStateId: newStateId }
        : createTransition(newStateId, currentTransitions.length);

      const newStateMachine = produce((stateMachine: IFSM) => {
        stateMachine.states[newStateId] = newState;
        const currentState = stateMachine.states[Number(sourceState.id)];
        currentState.transitions = (currentState.transitions as TTransition[]).filter(
          t => transition == null || t.id !== transition.transition.id,
        ) as typeof currentState.transitions;
        (currentState.transitions as TTransition[]).push(newTransition);
      })(stateMachine);

      store.dispatch(
        Actions.VariableDescriptorActions.updateDescriptor(newStateMachine),
      );
    },
    [createTransition, lang, stateMachine],
  );

  const onStateClick = React.useCallback(
    (e: ModifierKeysEvent, state: TStateProcess) => {
      const actions: EditorAction<
        IFSMDescriptor | IDialogueDescriptor
      >['more'] = {};
      if (state.state.id !== stateMachine.defaultInstance.currentStateId) {
        actions.delete = {
          label: 'Delete',
          confirm: true,
          action: (
            sm: IFSMDescriptor | IDialogueDescriptor,
            path?: (string | number)[],
          ) => {
            deleteState(sm, Number(path![1]));
          },
        };
      }

      const dispatchLocal =
        (e.ctrlKey === true || forceLocalDispatch === true) &&
        localDispatch != null;
      const dispatch = dispatchLocal ? localDispatch! : store.dispatch;
      dispatch(
        Actions.EditorActions.editVariable(
          stateMachine,
          ['states', state.id],
          undefined,
          {
            more: actions,
          },
        ),
      );
      if (!dispatchLocal) {
        focusTab(mainLayoutId, 'Variable Properties');
      }
    },
    [forceLocalDispatch, localDispatch, stateMachine],
  );

  return (
    <FlowChart
      title={title}
      processes={processes}
      onConnect={connectState}
      onMove={updateStatePosition}
      onNew={createState}
      onFlowlineClick={() => wlog('flolineclick')}
      onProcessClick={onStateClick}
    />
  );
}

function globalStateSelector(s: RState) {
  let editedVariable:
    | IFSMDescriptor
    | IDialogueDescriptor
    | undefined = undefined;
  if (
    s.global.editing &&
    (s.global.editing.type === 'VariableFSM' ||
      // The following condition seems stupid, need to be tested ans documented
      s.global.editing.type === 'Variable')
  ) {
    editedVariable = s.global.editing.entity as
      | IFSMDescriptor
      | IDialogueDescriptor;
    const lastFSM = VariableDescriptor.select(s.global.editing.entity.id) as
      | IFSMDescriptor
      | IDialogueDescriptor;
    if (shallowDifferent(editedVariable, lastFSM)) {
      editedVariable = lastFSM;
    }
  }
  const instance = editedVariable ? getInstance(editedVariable) : undefined;
  if (
    !entityIs(editedVariable, 'TriggerDescriptor', true) &&
    entityIs(editedVariable, 'AbstractStateMachineDescriptor', true) &&
    entityIs(instance, 'FSMInstance', true)
  ) {
    return {
      descriptor: editedVariable,
      instance,
      search: s.global.search,
    };
  } else {
    return {
      variable: editedVariable,
    };
  }
}

export function ConnectedStateMachineEditor({
  localDispatch,
}: {
  localDispatch?: StoreDispatch;
}) {
  const globalState = useStore(globalStateSelector);

  if ('variable' in globalState) {
    if (globalState.variable == null) {
      return <span>Select a variable to display</span>;
    } else {
      return (
        <span>The selected variable is not some kind of state machine</span>
      );
    }
  } else {
    return (
      <div className={cx(grow, forceScroll)}>
        <StateMachineEditor
          stateMachine={globalState.descriptor}
          stateMachineInstance={globalState.instance}
          localDispatch={localDispatch}
          search={globalState.search}
        />
      </div>
    );
  }
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

const stateTextStyle = css({
  cursor: 'text',
});

interface ModifiableTextProps {
  mode: 'String' | 'Text';
  initialValue: string;
  onValidate: (newValue: string) => void;
}

// Currently this component is not used but it will be in the future
// @ts-ignore
function ModifiableText({
  mode,
  initialValue,
  onValidate,
}: ModifiableTextProps) {
  const [editingText, setEditingText] = React.useState(false);
  const [newTextValue, setNewTextValue] = React.useState(initialValue);

  React.useEffect(() => {
    setNewTextValue(initialValue);
  }, [initialValue]);

  return editingText ? (
    <div className={cx(flex, flexRow)}>
      <div className={grow}>
        {mode === 'String' ? (
          <SimpleInput
            placeholder="State label"
            value={newTextValue}
            onChange={value => setNewTextValue(String(value))}
          />
        ) : (
          <HTMLEditor value={newTextValue} onChange={setNewTextValue} />
        )}
      </div>
      <div className={cx(flex, flexColumn)}>
        <Button
          icon="times"
          onClick={() => {
            setEditingText(false);
          }}
        />
        <Button
          icon="check"
          onClick={() => {
            setEditingText(false);
            onValidate(newTextValue);
          }}
        />
      </div>
    </div>
  ) : newTextValue === '' ? (
    <div onClick={() => setEditingText(true)}>
      {`Click here to edit ${mode === 'String' ? 'label' : 'text'}`}
    </div>
  ) : (
    <div
      onClick={() => setEditingText(true)}
      className={stateTextStyle}
      dangerouslySetInnerHTML={{
        __html: newTextValue,
      }}
    />
  );
}
