import React, { PropTypes } from 'react';
import styles from './Statement.css';

export default function Statement(props) {
    return (
        <div className={styles.Statement}>
            <div className={styles.comp}>
                {props.children}
            </div>
        </div>);
}