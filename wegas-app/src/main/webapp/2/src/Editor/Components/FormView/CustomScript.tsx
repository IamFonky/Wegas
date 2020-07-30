import * as React from 'react';
import { WidgetProps } from 'jsoninput/typings/types';
import { LabeledView, Labeled } from './labeled';
import { CommonView, CommonViewContainer } from './commonView';
import { WegasScriptEditor } from '../ScriptEditors/WegasScriptEditor';
import { toLower } from 'lodash';
import { CodeLanguage, scriptEditStyle } from './Script/Script';
import { SrcEditorLanguages } from '../ScriptEditors/SrcEditor';
import { createScript } from '../../../Helper/wegasEntites';
import { IScript } from 'wegas-ts-api';

export interface CustomScriptProps
  extends WidgetProps.BaseProps<
    LabeledView &
      CommonView & {
        language?: CodeLanguage;
        returnType?: WegasScriptEditorReturnTypeName[];
      }
  > {
  value?: IScript;
  onChange: (code?: IScript) => void;
}

export function CustomScript({ view, value, onChange }: CustomScriptProps) {
  const onValueChange = React.useCallback(
    (val: string) => {
      onChange(createScript(val, view.language));
    },
    [onChange, view.language],
  );
  return (
    <CommonViewContainer view={view}>
      <Labeled label={view.label} description={view.description} /*{...view}*/>
        {({ labelNode }) => {
          return (
            <>
              {labelNode}
              <div className={scriptEditStyle}>
                <WegasScriptEditor
                  language={
                    view.language
                      ? (toLower(view.language) as SrcEditorLanguages)
                      : view.language
                  }
                  returnType={view.returnType}
                  value={value ? value.content : ''}
                  onBlur={onValueChange}
                  onChange={onValueChange}
                  minimap={false}
                  noGutter={true}
                  resizable
                />
              </div>
            </>
          );
        }}
      </Labeled>
    </CommonViewContainer>
  );
}
