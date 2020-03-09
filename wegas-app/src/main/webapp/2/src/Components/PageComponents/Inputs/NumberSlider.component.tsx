import * as React from 'react';
import {
  registerComponent,
  pageComponentFactory,
  extractProps,
} from '../tools/componentFactory';
import { schemaProps } from '../tools/schemaProps';
import {
  NumberSlider,
  DisplayMode,
  displayModes,
} from '../../Inputs/Number/NumberSlider';
import { store } from '../../../data/store';
import { Actions } from '../../../data';
import { omit } from 'lodash';
import { useComponentScript } from '../../Hooks/useComponentScript';
import { PageComponentMandatoryProps } from '../tools/EditableComponent';

interface PlayerNumberSliderProps extends PageComponentMandatoryProps {
  /**
   * script - the script that returns the variable to display and modify
   */
  script?: IScript;
  /**
   * steps - the number of steps between min and max value. 100 by default.
   */
  steps?: number;
  /**
   * displayValue - displays the value modified if set
   * Can be a boolean or a formatting function that takes the value and return a string
   */
  displayValues?: DisplayMode;
  /**
   * disabled - set the component in disabled mode
   */
  disabled?: boolean;
}

function PlayerNumberSlider(props: PlayerNumberSliderProps) {
  const { ComponentContainer, childProps, flexProps } = extractProps(props);
  const { content, descriptor, instance, notFound } = useComponentScript<
    INumberDescriptor
  >(props.script);
  const min = descriptor.minValue || 0;
  const max = descriptor.maxValue || 1;
  return (
    <ComponentContainer flexProps={flexProps}>
      {notFound ? (
        <pre>Not found: {content}</pre>
      ) : (
        <NumberSlider
          {...childProps}
          value={instance.value}
          onChange={v =>
            store.dispatch(
              Actions.VariableInstanceActions.runScript(
                `${content}.setValue(self, ${v});`,
              ),
            )
          }
          min={min}
          max={max}
        />
      )}
    </ComponentContainer>
  );
}

registerComponent(
  pageComponentFactory(
    PlayerNumberSlider,
    'NumberSlider',
    'sliders-h',
    {
      script: schemaProps.scriptVariable('Variable', true, [
        'NumberDescriptor',
      ]),
      steps: schemaProps.number('Steps', false),
      displayValues: schemaProps.select('Display value', false, displayModes),
      disabled: schemaProps.boolean('Disabled', false),
    },
    [],
    () => ({}),
  ),
);
