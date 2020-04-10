import * as React from 'react';
import JSONForm, { Schema } from 'jsoninput';
import { Toolbar } from '../../Components/Toolbar';
import { defaultPadding, expandBoth, noOverflow } from '../../css/classes';
import './FormView';
import { ConfirmButton } from '../../Components/Inputs/Button/ConfirmButton';
import { Button, ButtonProps } from '../../Components/Inputs/Buttons/Button';
import { wlog } from '../../Helper/wegaslog';

interface EditorProps<T> {
  entity?: T;
  update?: (variable: T) => void;
  actions: {
    action: (entity: T, path?: (string | number)[]) => void;
    label: React.ReactNode;
    confirm?: boolean;
  }[];
  path?: (string | number)[];
  config?: Schema;
}

interface FormProps<T> extends EditorProps<T> {
  schema: Schema;
}

export type IForm = typeof Form;

export class Form<T> extends React.Component<
  FormProps<T>,
  {
    val: any;
    oldProps: FormProps<T>;
    // Used to reset Form (for default values)
    id: number;
  }
> {
  form?: JSONForm;
  static getDerivedStateFromProps(
    nextProps: FormProps<any>,
    state: { oldProps: FormProps<any>; id: number; val: any },
  ) {
    if (state.oldProps === nextProps) {
      return null;
    }
    return {
      val: nextProps.entity,
      oldProps: nextProps,
      id: (state.id + 1) % 100,
    };
  }
  static defaultProps = {
    actions: [],
  };
  constructor(props: FormProps<T>) {
    super(props);
    this.state = { oldProps: props, val: props.entity, id: 0 };
  }
  render() {
    return (
      <Toolbar className={expandBoth}>
        <Toolbar.Header>
          {this.props.update && (
            <Button
              label="Save"
              disabled={this.state.val === this.props.entity}
              onClick={() => {
                if (this.state.val !== this.props.entity && this.form) {
                  const validation = this.form.validate();
                  if (validation.length) {
                    wlog(this.state.val, JSON.stringify(validation, null, 2));
                  } else {
                    this.props.update!(this.state.val);
                  }
                }
              }}
              disableBorders={{ right: true }}
            />
          )}
          <ConfirmButton
            label="Reset"
            onAction={accept => {
              accept && this.setState({ val: this.props.entity });
            }}
            disableBorders={{
              left: this.props.update !== undefined,
              right: this.props.actions.length > 0,
            }}
          />
          {this.props.actions.map((a, i) => {
            const btnProps: ButtonProps = {
              label: a.label,
              tabIndex: 1,
              disableBorders: {
                left: true,
                right: i !== this.props.actions.length - 1,
              },
            };
            return a.confirm ? (
              <ConfirmButton
                {...btnProps}
                key={i}
                onAction={succes =>
                  succes && a.action(this.state.val, this.props.path)
                }
              />
            ) : (
              <Button
                {...btnProps}
                key={i}
                onClick={() => a.action(this.state.val, this.props.path)}
              />
            );
          })}
        </Toolbar.Header>
        <Toolbar.Content className={noOverflow}>
          <div className={defaultPadding}>
            <JSONForm
              ref={n => {
                if (n != null) {
                  this.form = n;
                }
              }}
              key={this.state.id}
              value={this.state.val}
              schema={this.props.schema}
              onChange={val => {
                this.setState({ val });
              }}
            />
          </div>
        </Toolbar.Content>
      </Toolbar>
    );
  }
}
