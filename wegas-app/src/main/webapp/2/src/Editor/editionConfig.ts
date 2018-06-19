import { Schema } from 'jsoninput';
import { AvailableViews } from './Components/FormView';
import { Actions } from '../data';
import { StateActions } from '../data/actions';

export type ConfigurationSchema<E> = Record<keyof E, Schema<AvailableViews>>;

export type MethodConfig = {
  [method: string]: {
    label: string;
    arguments: {
      type: 'string' | 'number' | 'boolean' | 'identifier' | 'array' | 'object';
      value?: {};
      const?: string;
      required?: boolean;
      view: AvailableViews;
    }[];
    returns?: 'number' | 'string' | 'boolean';
  };
};

export const SELFARG = {
  type: 'identifier' as 'identifier',
  value: 'self',
  const: 'self',
  view: { type: 'hidden' } as AvailableViews,
};

export default async function getEditionConfig<T extends IWegasEntity>(
  entity: T,
): Promise<ConfigurationSchema<T>> {
  return await import(/* webpackChunkName: "FormConfig", webpackMode: "lazy-once" */ './EntitiesConfig/' +
    entity['@class']).then(res => res.config);
}

export async function getAvailableChildren<T extends IWegasEntity>(
  entity: T,
): Promise<string[]> {
  return await import(/* webpackChunkName: "FormConfig", webpackMode: "lazy-once" */ './EntitiesConfig/' +
    entity['@class']).then(res => res.children);
}

export interface EActions<T extends IWegasEntity> {
  edit: (variable: T, path?: string[]) => StateActions;
}
// default Actions
const entityActions: EActions<IVariableDescriptor> = {
  edit: Actions.EditorActions.editVariable,
};

export async function getEntityActions<T extends IWegasEntity>(
  entity: T,
): Promise<EActions<T>> {
  return await import(/* webpackChunkName: "FormConfig", webpackMode: "lazy-once" */ './EntitiesConfig/' +
    entity['@class']).then(res => ({ ...entityActions, ...res.actions }));
}

export async function getMethodConfig<T extends IWegasEntity>(
  entity: T,
): Promise<MethodConfig> {
  return await import(/* webpackChunkName: "FormConfig", webpackMode: "lazy-once" */ './EntitiesConfig/' +
    entity['@class']).then(res => ({ ...res.methods }));
}
