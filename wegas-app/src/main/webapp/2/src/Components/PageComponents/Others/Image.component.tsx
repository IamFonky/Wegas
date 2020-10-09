import * as React from 'react';
import {
  pageComponentFactory,
  registerComponent,
} from '../tools/componentFactory';
import { WegasComponentProps } from '../tools/EditableComponent';
import { schemaProps } from '../tools/schemaProps';
import { fileURL } from '../../../API/files.api';

interface SvgLoaderProps extends WegasComponentProps {
  src?: string;
}

function Image({ src }: SvgLoaderProps) {
  return <img src={src ? fileURL(src) : undefined} />;
}

registerComponent(
  pageComponentFactory({
    component: Image,
    componentType: 'Other',
    name: 'Image',
    icon: 'image',
    schema: {
      script: schemaProps.path({
        label: 'Source',
        pick: 'FILE',
        filter: {
          fileType: 'image',
          filterType: 'show',
        },
      }),
    },
  }),
);
