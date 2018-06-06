import * as React from 'react';
import JSONForm, { Schema } from 'jsoninput';
import { Toolbar } from '../../Components/Toolbar';
import './FormView';

interface EditorProps<T> {
  entity?: T;
  update: (variable: T) => void;
  del: (variable: T, path?: string[]) => void;
  path?: string[];
  config?: Schema;
}

interface FormProps<T> extends EditorProps<T> {
  schema: Schema;
}

export type IForm = typeof Form;

export class Form<T> extends React.Component<
  FormProps<T>,
  { val: any; oldProps: FormProps<T> }
> {
  form?: JSONForm;
  static getDerivedStateFromProps(
    nextProps: FormProps<any>,
    state: { oldProps: FormProps<any> },
  ) {
    if (state.oldProps === nextProps) {
      return null;
    }
    return { val: nextProps.entity, oldProps: nextProps };
  }
  constructor(props: FormProps<T>) {
    super(props);
    this.state = { oldProps: props, val: props.entity };
  }
  render() {
    return (
      <Toolbar>
        <Toolbar.Header>
          <button
            disabled={this.state.val === this.props.entity}
            onClick={() => {
              if (this.state.val !== this.props.entity && this.form) {
                const validation = this.form.validate();
                if (validation.length) {
                  console.log(
                    this.state.val,
                    JSON.stringify(validation, null, 2),
                  );
                } else {
                  this.props.update(this.state.val);
                }
              }
            }}
          >
            Save
          </button>
          <button
            onClick={() => {
              this.setState({ val: this.props.entity });
            }}
          >
            reset
          </button>
          <button
            onClick={() => {
              this.props.del(this.state.val, this.props.path);
            }}
          >
            delete
          </button>
        </Toolbar.Header>
        <Toolbar.Content>
          <JSONForm
            ref={n => {
              if (n != null) {
                this.form = n;
              }
            }}
            value={this.state.val}
            schema={this.props.schema}
            onChange={val => {
              this.setState({ val });
            }}
          />
        </Toolbar.Content>
      </Toolbar>
    );
  }
}
