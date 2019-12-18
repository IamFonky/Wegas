import * as React from 'react';
import {
  Statement,
  Expression,
  CallExpression,
  SpreadElement,
  ExpressionStatement,
  MemberExpression,
  Identifier,
  StringLiteral,
  BinaryExpression,
  Literal,
  program,
} from '@babel/types';
import generate from '@babel/generator';
import {
  ScriptView,
  scriptIsCondition,
  scriptEditStyle,
  ScriptMode,
} from './Script';
import {
  getMethodConfig,
  WegasMethod,
  WegasMethodParameter,
} from '../../../editionConfig';
import { useVariableDescriptor } from '../../../../Components/Hooks/useVariable';
import { schemaProps } from '../../../../Components/PageComponents/schemaProps';
import Form from 'jsoninput';
import { css } from 'emotion';
import { WegasScriptEditor } from '../../ScriptEditors/WegasScriptEditor';
import { parse } from '@babel/parser';
import { StyledLabel } from '../../../../Components/AutoImport/String/String';
import { wlog } from '../../../../Helper/wegaslog';
import { pick, omit } from 'lodash';

const testStyle = css({
  borderColor: 'lime',
  borderStyle: 'solid',
  borderWidth: '2px',
});

const expressionEditorStyle = css({
  marginTop: '0.8em',
  div: {
    marginTop: '0',
  },
});

const isExpression = (
  statement: Statement | Expression,
): statement is ExpressionStatement => statement.type === 'ExpressionStatement';
const isCallExpression = (
  expression: Expression,
): expression is CallExpression => expression.type === 'CallExpression';
const isMemberExpression = (
  expression: Expression,
): expression is MemberExpression => expression.type === 'MemberExpression';
const isBinaryExpression = (
  expression: Expression,
): expression is BinaryExpression => expression.type === 'BinaryExpression';
const isLiteralExpression = (expression: Expression): expression is Literal =>
  expression.type === 'BooleanLiteral' ||
  expression.type === 'NullLiteral' ||
  expression.type === 'NumericLiteral' ||
  expression.type === 'StringLiteral';
const isIdentifierExpression = (
  expression: Expression,
): expression is Identifier => expression.type === 'Identifier';
const isStringLiteral = (
  expression: Expression | SpreadElement,
): expression is StringLiteral => expression.type === 'StringLiteral';
const isVariableObject = (expression: Expression) =>
  isIdentifierExpression(expression) && expression.name === 'Variable';
const isFindProperty = (expression: Expression) =>
  isIdentifierExpression(expression) && expression.name === 'find';

// Variable setter methods
type VariableMethodExpression = Statement & {
  callee: {
    object: {
      arguments: {
        value: string;
      }[];
    };
    property: {
      name: string;
    };
  };
  arguments: {
    value: unknown;
  }[];
};

type VariableMethodStatement = Statement & {
  expression: VariableMethodExpression;
};

const isVariableMethodStatement = (
  statement: Statement | Expression,
): statement is VariableMethodStatement =>
  isExpression(statement) &&
  isCallExpression(statement.expression) &&
  isMemberExpression(statement.expression.callee) &&
  isCallExpression(statement.expression.callee.object) &&
  isMemberExpression(statement.expression.callee.object.callee) &&
  isVariableObject(statement.expression.callee.object.callee.object) &&
  isFindProperty(statement.expression.callee.object.callee.property) &&
  statement.expression.callee.object.arguments.length === 2 &&
  isStringLiteral(statement.expression.callee.object.arguments[1]) &&
  isIdentifierExpression(statement.expression.callee.property);
const getVariable = (expression: VariableMethodExpression) =>
  expression.callee.object.arguments[1].value;
const getMethodName = (expression: VariableMethodExpression) =>
  expression.callee.property.name;

const listToObject: <T>(list: T[]) => { [id: string]: T } = list =>
  list.reduce((o, p, i) => ({ ...o, [i]: p }), {});

const getParameters = (expression: VariableMethodExpression) =>
  listToObject(expression.arguments.map(a => a.value));

const generateParameterSchema = (parameters: WegasMethodParameter[]) =>
  parameters.reduce(
    (o, p, i) => ({
      ...o,
      [String(i)]: {
        ...p,
        index: i + 2,
        type: p.type === 'identifier' ? 'string' : p.type,
        view: { ...p.view, label: 'Argument ' + i, index: i + 2 },
      },
    }),
    {},
  );

// Condition methods
type ConditionExpressionType = Statement & {
  expression: BinaryExpression & {
    left: VariableMethodExpression;
    right: {
      value: unknown;
    };
    operator: string;
  };
};
const isConditionStatement = (
  statement: Statement,
): statement is ConditionExpressionType =>
  isExpression(statement) &&
  isBinaryExpression(statement.expression) &&
  isVariableMethodStatement({
    ...statement,
    type: 'ExpressionStatement',
    expression: statement.expression.left,
  }) &&
  isLiteralExpression(statement.expression.right);
const getOperator = (expression: BinaryExpression) => expression.operator;

const booleanOperators = {
  '===': { label: 'equals' },
  '>': { label: 'greater than' },
  '>=': { label: 'greater or equals than' },
  '<': { label: 'lesser than' },
  '<=': { label: 'lesser or equals than' },
};

interface IAttributes {
  [param: string]: unknown;
  variableName?: string;
  methodName?: string;
}
const defaultAttributes: IAttributes = {
  variableName: undefined,
  methodName: undefined,
};
interface IConditionAttributes extends IAttributes {
  operator?: string;
  comparator?: unknown;
}
const defaultConditionAttributes: IConditionAttributes = {
  ...defaultAttributes,
  operator: undefined,
  comparator: undefined,
};

interface ExpressionEditorProps
  extends Exclude<ScriptView, ['singleExpression', 'clientScript']> {
  statement: Statement | null;
  onChange?: (expression: Statement | Statement[]) => void;
}

export function ExpressionEditor({
  statement,
  mode,
  scriptableClassFilter,
  onChange,
}: ExpressionEditorProps) {
  const [methods, setMethods] = React.useState<{
    [key: string]: WegasMethod;
  }>();
  const [error, setError] = React.useState();
  const [scriptAttributes, setScriptAttributes] = React.useState<
    IAttributes | IConditionAttributes /* & { [param: string]: unknown }*/
  >(
    scriptIsCondition(mode, scriptableClassFilter)
      ? defaultConditionAttributes
      : defaultAttributes,
  );

  const variable = useVariableDescriptor(scriptAttributes.variableName);
  const scriptMethodName = scriptAttributes.methodName;
  const scriptMethod =
    methods && scriptAttributes && scriptMethodName !== undefined
      ? methods[scriptMethodName]
      : undefined;

  const schema = {
    description: 'booleanExpressionSchema',
    properties: {
      variableName: schemaProps.variable(
        'variable',
        false,
        scriptableClassFilter &&
          scriptableClassFilter.map(sf => sf.substr(2) as WegasClassNames),
        'DEFAULT',
        0,
      ),
      methodName: schemaProps.select(
        'methodName',
        false,
        methods ? Object.keys(methods).map(k => k) : [],
        'string',
        'DEFAULT',
        1,
      ),
      ...(scriptMethod ? generateParameterSchema(scriptMethod.parameters) : {}),
      ...(scriptMethod && scriptIsCondition(mode, scriptableClassFilter)
        ? {
            operator: schemaProps.select(
              'operator',
              false,
              Object.keys(booleanOperators).map(
                (k: keyof typeof booleanOperators) => ({
                  label: booleanOperators[k].label,
                  value: k,
                }),
              ),
              'string',
              'DEFAULT',
              scriptMethod.parameters.length + 2,
            ),
            comparator: schemaProps.custom(
              'comparator',
              false,
              scriptMethod && scriptMethod.returns,
              undefined,
              scriptMethod.parameters.length + 3,
            ),
          }
        : {}),
    },
  };

  const onScriptEditorChange = React.useCallback(
    (value: string) => {
      try {
        const newStatement = parse(value, { sourceType: 'script' }).program
          .body;
        setError(undefined);
        onChange && onChange(newStatement);
      } catch (e) {
        setError(e.message);
      }
    },
    [onChange],
  );

  React.useEffect(() => {
    if (statement) {
      if (scriptIsCondition(mode, scriptableClassFilter)) {
        if (isConditionStatement(statement)) {
          setScriptAttributes({
            variableName: getVariable(statement.expression.left),
            methodName: getMethodName(statement.expression.left),
            ...getParameters(statement.expression.left),
            operator: getOperator(statement.expression),
            comparator: statement.expression.right.value,
          });
        } else {
          setError('Cannot be parsed as a condition');
        }
      } else {
        if (isVariableMethodStatement(statement)) {
          setScriptAttributes({
            variableName: getVariable(statement.expression),
            methodName: getMethodName(statement.expression),
            ...getParameters(statement.expression),
          });
        } else {
          setError('Cannot be parsed as a variable statement');
        }
      }
    }
  }, [statement, mode, scriptableClassFilter, methods]);

  React.useEffect(() => {
    if (variable) {
      getMethodConfig(variable).then(res => {
        setMethods(Object.keys(res).filter(k => mode === "GET" ? res[k].returns !== undefined : res[k].returns === undefined).reduce((o,k)=>({...o,[k]:res[k]}),{}));
      });
    } else {
      setMethods(undefined);
    }
  }, [variable, mode]);

  React.useEffect(() => {
    let script = '';
    script = `Variable.find(gameModel,${
      scriptAttributes.variableName
        ? `'${scriptAttributes.variableName}'`
        : 'undefined'
    })`;

    if (scriptAttributes.methodName) {
      const parameters = Object.values(
        omit(scriptAttributes, Object.keys(defaultConditionAttributes)),
      ).map(p => `${typeof p === 'string' ? `'${p}'` : p},`);
      script += `.${scriptAttributes.methodName}(${parameters})`;
      if (scriptIsCondition(mode, scriptableClassFilter)) {
        if (scriptAttributes.operator) {
          script += ` ${scriptAttributes.operator} ${
            typeof scriptAttributes.comparator === 'string'
              ? `'${scriptAttributes.comparator}`
              : scriptAttributes.comparator
          }`;
          // onScriptEditorChange(script);
        }
      }
    }
    wlog(script);
  }, [scriptAttributes, mode, scriptableClassFilter]);

  return (
    <div className={expressionEditorStyle}>
      {error ? (
        <div className={scriptEditStyle}>
          <StyledLabel type="error" value={error} duration={3000} />
          <WegasScriptEditor
            value={statement ? generate(program([statement])).code : ''}
            onChange={onScriptEditorChange}
          />
        </div>
      ) : (
        <Form
          value={pick(scriptAttributes, Object.keys(schema.properties))}
          schema={schema}
          onChange={v => {
            wlog(v);
            setScriptAttributes(v);
          }}
        />
      )}
    </div>
  );
}
