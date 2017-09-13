import PropTypes from 'prop-types';
import React from 'react';
import { types } from 'recast';
import Impact from './Impact';
import { methodDescriptor, extractMethod } from './method';
import { methodDescriptor as globalMethodDescriptor } from './globalMethod';
import ConditionOperator from './ConditionOperator';
import { renderForm, valueToType } from './args';
import { containerStyle } from '../Views/conditionImpactStyle';

const b = types.builders;
/**
 * return a default value for the given type
 * @param {string} type the type for which a default value is required
 * @returns {string|undefined|boolean} the default value
 */
function defaultValue(type) {
    switch (type) {
        case 'string':
            return '';
        case 'number':
            return undefined;
        case 'boolean':
            return true;
        default:
            throw new Error(`Default value for 'returns' property '${type}' is not implemented`);
    }
}
/**
 * Find method's schema. Delegate to different method if it's a global method or a variable method.
 * @param {Object} node ast left node
 * @returns {Object} schema for given ast node
 */
function getMethodDescriptor(node) {
    const { global, method, variable, member } = extractMethod(node);
    return global ? globalMethodDescriptor(member, method) : methodDescriptor(variable, method);
}

function getNegation(op) {
    switch(op) {
        case '===': return '!==';
        case '!==': return '===';
        case '>':   return '<=';
        case '<':   return '>=';
        case '>=':  return '<';
        case '<=':  return '>';
        default:
            return 'Internal error, getNegation(' + op + ')';
    }
}

class Condition extends React.Component {
    constructor(props) {
        super(props);
        const negated = props.node.negated || false;
        if (props.node.type === "CallExpression") {
            // Transform calls returning a boolean into an easier to handle logical expression:
            this.state = {
                left: props.node,
                right: b.literal(!negated),
                operator: '==='
            };
        } else {
            this.state = {
                left: props.node.left,
                right: props.node.right,
                operator: props.node.operator ? (negated ? getNegation(props.node.operator) : props.node.operator) : '==='
            };
        }
        const descr = getMethodDescriptor(this.state.left);
        this.returns = descr && descr.returns; // store current method's returns
    }
    componentWillReceiveProps(nextProps) {
        this.setState({
            left: nextProps.node.left,
            right: nextProps.node.right,
            operator: nextProps.node.operator || '==='
        });
    }
    check() {
        const descr = getMethodDescriptor(this.state.left);
        const sendUpdate = () => {
            if (this.state.operator && this.state.left) {
                const node = b.binaryExpression(
                    this.state.operator,
                    this.state.left,
                    this.state.right
                );
                this.props.onChange(node);
            }
        };
        if (!descr) {
            this.setState({ right: undefined });
        } else if (this.returns !== descr.returns) {
            this.setState({ operator: '===', right: valueToType(defaultValue(descr.returns), { type: descr.returns }) }, sendUpdate);
            this.returns = descr.returns;
        } else {
            sendUpdate();
        }
    }
    render() {
        const descr = getMethodDescriptor(this.state.left);
        let container;
        if (descr) {
            const schema = {
                type: descr.returns,
                value: defaultValue(descr.returns),
                required: true
            };
            container = [(
                <div key="operator" className={containerStyle} >
                    <ConditionOperator
                        operator={this.state.operator}
                        onChange={v => this.setState({ operator: v }, this.check)}
                        type={descr.returns}
                    />
                </div>
            ),
            (<div key="right" className={containerStyle} >
                {renderForm(this.state.right, schema, v => this.setState({ right: v }, this.check), undefined, 'right')}
            </div>)];
        }
        return (
            <div>
                <Impact
                    {...this.props}
                    node={this.state.left}
                    onChange={v => this.setState({ left: v }, this.check)}
                />
                {container}
            </div>
        );
    }
}
Condition.propTypes = {
    onChange: PropTypes.func.isRequired,
    node: PropTypes.object.isRequired
};
export default Condition;
