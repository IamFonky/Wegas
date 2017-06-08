import PropTypes from 'prop-types';
import React from 'react';
import { css } from 'glamor';
import IconButton from '../../Components/IconButton';
import classNames from 'classnames';

const removeStatement = css({
    color: 'indianred',
    ':hover': { color: 'red' }
});
const trashcan = css({
    color: 'white'
});
const addStatement = css({
    textAlign: 'center',
    ':hover': { backgroundColor: 'lightgrey' }
});
const container = css({ display: 'inline-block' });

export function RemoveStatementButton(props) {
    return (
        <span className={container.toString()}>
            <IconButton
                icon={"fa fa-trash " + trashcan.toString()}
                onClick={props.onClick}
                className={removeStatement.toString()}
                stackedOnIcon="fa fa-circle"
            />
        </span>
    );
}

export function AddStatementButton(props) {
    return (
        <IconButton
            onClick={props.onClick}
            iconColor="#9DC06F"
            icon="fa fa-plus-circle"
            label={props.label}
            className={addStatement.toString()}
        />
    );
}

export function AddOptionButton(props) {
    return (
        <IconButton
            onClick={props.onClick}
            iconColor="#9DC06F"
            icon="fa fa-plus-circle"
            label={props.label}
            className={props.className}
            prefixedLabel={true}
            labelClassName={props.labelClassName}
        />
    );
}
