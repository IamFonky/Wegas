import * as React from 'react';
import {
  pageComponentFactory,
  registerComponent,
} from '../tools/componentFactory';
import { schemaProps } from '../tools/schemaProps';
import { StandardGauge } from '../../Outputs/StandardGauge';
import { WegasComponentProps } from '../tools/EditableComponent';
import { IScript, SNumberDescriptor } from 'wegas-ts-api';
import { createFindVariableScript } from '../../../Helper/wegasEntites';
import { instantiate } from '../../../data/scriptable';
import { Player } from '../../../data/selectors';
import { useStore } from '../../../data/store';
import { useScript } from '../../Hooks/useScript';
import { classStyleIdShema } from '../tools/options';

interface PlayerGaugeProps extends WegasComponentProps {
  /**
   * script - the script that returns the variable to display and modify
   */
  script?: IScript;
  /**
   * label - The label to display with the gauge
   */
  label?: string;
  /**
   * followNeedle - if true, only the sections behind the needle will be displayed
   */
  followNeedle?: boolean;
}

function PlayerGauge({
  script,
  label,
  followNeedle,
  className,
  style,
  id,
  context,
}: PlayerGaugeProps) {
  const number = useScript<SNumberDescriptor>(script, context);
  const player = instantiate(useStore(Player.selectCurrent));

  return number == null ? (
    <pre className={className} style={style} id={id}>
      Not found: {script?.content}
    </pre>
  ) : (
    <StandardGauge
      className={className}
      style={style}
      id={id}
      label={label}
      followNeedle={followNeedle}
      min={number.getMinValue() || 0}
      max={number.getMaxValue() || 1}
      value={number.getValue(player)}
    />
  );
}

registerComponent(
  pageComponentFactory({
    component: PlayerGauge,
    componentType: 'Output',
    name: 'Gauge',
    icon: 'tachometer-alt',
    schema: {
      script: schemaProps.scriptVariable({
        label: 'Variable',
        required: false,
        returnType: ['SNumberDescriptor'],
      }),
      label: schemaProps.string({ label: 'Label' }),
      followNeedle: schemaProps.boolean({ label: 'Follow needle' }),
      ...classStyleIdShema,
    },
    allowedVariables: ['NumberDescriptor'],
    getComputedPropsFromVariable: v => ({
      script: createFindVariableScript(v),
    }),
  }),
);
