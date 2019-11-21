import * as React from 'react';

import {useScript} from '../../Hooks/useScript';

/**
 * Dummy component which localeval a script and display the result
 */
export default function DisplayEval(props: {script: string}) {
    return (
        <pre>{useScript(props.script)}</pre>
    );
}
