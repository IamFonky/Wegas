import * as React from 'react';
import { GameModel, Global } from '../../data/selectors';
import { css } from 'emotion';
import { StoreConsumer } from '../../data/store';
import { IconButton } from '../../Components/Button/IconButton';
import { Actions } from '../../data';
import { FontAwesome } from './Views/FontAwesome';
import { Menu } from '../../Components/Menu';
import {
  featuresCTX,
  availableFeatures,
} from '../../Components/FeatureProvider';

const grow = css({
  flex: '1 1 auto',
});
const flex = css({
  display: 'flex',
  alignItems: 'center',
});

export default function Header() {
  const { currentFeatures, setFeature, removeFeature } = React.useContext(
    featuresCTX,
  );

  return React.useMemo(
    () => (
      <StoreConsumer
        selector={() => ({
          gameModel: GameModel.selectCurrent(),
          user: Global.selectCurrentUser(),
        })}
      >
        {({ state: { gameModel, user }, dispatch }) => (
          <div className={flex}>
            <h2 className={grow}>{gameModel.name}</h2>
            <Menu
              label={'Features'}
              items={availableFeatures.map(feature => ({
                id: feature,
                label: (
                  <>
                    <input
                      type="checkbox"
                      defaultChecked={currentFeatures.includes(feature)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFeature(feature);
                        } else {
                          removeFeature(feature);
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                    {feature}
                  </>
                ),
              }))}
              onSelect={() => {}}
            />
            <FontAwesome icon="user" />
            <span>{user.name}</span>
            <IconButton
              icon="undo"
              tooltip="Restart"
              onClick={() =>
                dispatch(Actions.VariableDescriptorActions.reset())
              }
            />
          </div>
        )}
      </StoreConsumer>
    ),
    [currentFeatures, setFeature, removeFeature],
  );
}
