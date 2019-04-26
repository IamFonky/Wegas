import { ConfigurationSchema, EActions } from '../editionConfig';
import { config as variableInstanceConfig } from './VariableInstance';
import { Actions } from '../../data';

const wegasEntityConfig: ConfigurationSchema<IWegasEntity> = {
  '@class': {
    type: 'string',
    required: true,
    index: -15,
    view: {
      type: 'hidden',
    },
  },
  id: {
    type: 'number',
    index: -14,
    view: {
      label: 'Id',
      type: 'uneditable',
    },
  },
};
const scopeConfig: ConfigurationSchema<IScope> = {
  '@class': {
    type: 'string',
    index: -15,
    required: true,
    value: 'TeamScope',
    view: {
      type: 'select',
      label: 'One variable for',
      choices: [
        {
          value: 'PlayerScope',
          label: 'each player',
        },
        {
          value: 'TeamScope',
          label: 'each team',
        },
        {
          value: 'GameModelScope',
          label: 'the whole game',
        },
      ],
    },
  },
  broadcastScope: {
    type: 'string',
    value: 'TeamScope',
    required: true,
    view: {
      type: 'select',
      label: 'Variable is visible by',
      choices: [
        {
          value: 'PlayerScope',
          label: 'the player only',
        },
        {
          value: 'TeamScope',
          label: "team members",
        },
        {
          value: 'GameScope',
          label: 'everybody',
        },
      ],
    },
  },
};

export const config: ConfigurationSchema<IVariableDescriptor> = {
  ...wegasEntityConfig,
  label: {
    type: 'object',
    value: { '@class': 'TranslatableContent', translations: {} },
    required: true,
    index: -12,
    minLength: 1,
    view: {
      type: 'i18nstring',
      label: 'Label',
    },
  },
  version: {
    type: 'number',
    index: -13,
    view: {
      type: 'uneditable',
      label: 'Version',
    },
  },
  editorTag: {
    type: ['string', 'null'],
    index: -11,
    view: {
      type: 'string',
      label: 'Tag',
    },
  },
  name: {
    type: 'string',
    index: -10,
    errored(val: string | undefined, formVal: IVariableDescriptor) {
      if (typeof formVal.id === 'number') {
        // Editing
        if (val == null) {
          return 'is required';
        }
        if (val.length < 1) {
          return 'does not meet minimum length of 1';
        }
      }
      return '';
    },
    view: {
      type: 'string',
      label: 'Name',
      description:
        "Changing this may break your scripts! Use alphanumeric characters,'_','$'. No digit as first character.",
    },
  },
  scope: {
    index: -1,
    type: 'object',
    properties: scopeConfig,
  },
  defaultInstance: {
    index: 0,
    type: 'object',
    properties: variableInstanceConfig,
  },
  parentDescriptorId: {
    type: 'number',
    view: { type: 'hidden' },
  },
  parentDescriptorType: {
    type: 'string',
    view: { type: 'hidden' },
  },
  comments: {
    type: ['string', 'null'],
    index: 100,
    view: {
      type: 'textarea',
      label: 'Comments',
      borderTop: true,
    },
  },
  visibility: {
    type: ['string'],
    value: 'PRIVATE',
    view: {
      type: 'select',
      label: 'Visibility is',
      choices: [
        {
          value: 'INTERNAL',
          label: 'INTERNAL',
        },
        {
          value: 'PROTECTED',
          label: 'PROTECTED',
        },
        {
          value: 'INHERITED',
          label: 'INHERITED',
        },
        {
          value: 'PRIVATE',
          label: 'PRIVATE',
        },
      ],
    },
  },
};

export const actions: EActions<IVariableDescriptor> = {
  edit: Actions.EditorActions.editVariable,
};
