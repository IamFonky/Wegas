import * as React from 'react';
import { storeFactory, LocalGlobalState } from '../../../data/storeFactory';
import {
  AsyncVariableForm,
  parseEventFromIndex,
  getConfig,
  getUpdate,
  getEntity,
} from '../EntityEditor';
import { css, cx } from 'emotion';
import { Edition, closeEditor } from '../../../data/Reducer/globalState';
import { StoreDispatch } from '../../../data/store';
import { createStoreConnector } from '../../../data/connectStore';
import { flex, grow, autoScroll } from '../../../css/classes';
import { InstancePropertiesProps } from '../Variable/InstanceProperties';
import { asyncSFC } from '../../../Components/HOC/asyncSFC';
import { Toolbar } from '../../../Components/Toolbar';
import { shallowDifferent } from '../../../Components/Hooks/storeHookFactory';
import { Button } from '../../../Components/Inputs/Buttons/Button';
import {
  FonkyFlexContainer,
  FonkyFlexContent,
  FonkyFlexSplitter,
} from '../../../Components/Layouts/FonkyFlex';

const growBig = css({
  flex: '30 1 auto',
});

export interface ComponentWithFormChildrenProps {
  localState: Readonly<Edition> | undefined;
  localDispatch: StoreDispatch;
}

interface ComponentWithFormProps {
  children: (
    props: ComponentWithFormChildrenProps,
  ) => React.ReactElement | null;
  entityEditor?: boolean;
}

const AsyncInstancesEditor = asyncSFC<InstancePropertiesProps>(
  async (props: InstancePropertiesProps) => {
    const InstancesEditor = await Promise.resolve<
      typeof import('../Variable/InstanceProperties')['InstanceProperties']
    >(import('../Variable/InstanceProperties').then(m => m.InstanceProperties));
    return <InstancesEditor {...props} />;
  },
);

export function ComponentWithForm({
  children,
  entityEditor,
}: ComponentWithFormProps) {
  const {
    useStore: useLocalStore,
    getDispatch: getLocalDispatch,
  } = React.useMemo(() => createStoreConnector(storeFactory()), []);
  const localState = useLocalStore(
    (state: LocalGlobalState) => state.global,
    shallowDifferent,
  );
  const [instanceView, setInstanceView] = React.useState(false);
  const localDispatch = getLocalDispatch();
  const localEntity = getEntity(localState.editing);
  const actions = [
    ...Object.values(
      localState.editing &&
        'actions' in localState.editing &&
        localState.editing.actions.more
        ? localState.editing.actions.more
        : {},
    ),
    { label: 'Close', action: () => localDispatch(closeEditor()) },
  ];
  if (entityEditor) {
    actions.push({
      label: 'Instance',
      action: () => setInstanceView(show => !show),
    });
  }

  return (
    <FonkyFlexContainer className={cx(flex, grow)}>
      <FonkyFlexContent className={cx(flex, growBig, autoScroll)}>
        {children({
          localState: localState.editing,
          localDispatch,
        })}
      </FonkyFlexContent>
      {localState.editing && localEntity && (
        <>
          <FonkyFlexSplitter />
          <FonkyFlexContent flexInit={200} className={cx(flex)}>
            <AsyncVariableForm
              {...localState.editing}
              getConfig={getConfig(localState.editing)}
              update={getUpdate(localState.editing, localDispatch)}
              actions={actions}
              entity={localEntity}
              error={parseEventFromIndex(localState.events, localDispatch)}
            />
          </FonkyFlexContent>
        </>
      )}
      {instanceView && entityEditor && (
        <>
          <FonkyFlexSplitter />
          <FonkyFlexContent flexInit={200} className={cx(flex)}>
            <Toolbar>
              <Toolbar.Header>
                <Button
                  label="Close instance editor"
                  onClick={() => setInstanceView(false)}
                />
              </Toolbar.Header>
              <Toolbar.Content>
                <AsyncInstancesEditor
                  state={{ global: localState }}
                  dispatch={localDispatch}
                />
              </Toolbar.Content>
            </Toolbar>
          </FonkyFlexContent>
        </>
      )}
    </FonkyFlexContainer>
  );
  // return (
  //   <div className={cx(flex, grow)}>
  //     <div className={cx(flex, growBig, autoScroll)}>
  //       {children({
  //         localState: localState.editing,
  //         localDispatch,
  //       })}
  //     </div>
  //     {localState.editing && localEntity && (
  //       <div className={cx(flex, grow, autoScroll, maxSize)}>
  //         <AsyncVariableForm
  //           {...localState.editing}
  //           getConfig={getConfig(localState.editing)}
  //           update={getUpdate(localState.editing, localDispatch)}
  //           actions={actions}
  //           entity={localEntity}
  //           error={parseEventFromIndex(localState.events, localDispatch)}
  //         />
  //       </div>
  //     )}
  //     {instanceView && entityEditor && (
  //       <div className={cx(flex, grow, autoScroll, maxSize)}>
  //         <Toolbar>
  //           <Toolbar.Header>
  //             <Button
  //               label="Close instance editor"
  //               onClick={() => setInstanceView(false)}
  //             />
  //           </Toolbar.Header>
  //           <Toolbar.Content>
  //             <AsyncInstancesEditor
  //               state={{ global: localState }}
  //               dispatch={localDispatch}
  //             />
  //           </Toolbar.Content>
  //         </Toolbar>
  //       </div>
  //     )}
  //   </div>
  // );
}
