import * as React from 'react';

import {useScript} from '../../Hooks/useScript';
import {ScriptContext} from '../../Contexts/ScriptContext';

interface Props {
    getItemsFn: string;
    exposeAs?: string;
    children: WegasComponent[];
}

export default function ForEach({getItemsFn, exposeAs = 'item', children}: Props) {
    const {identifiers} = React.useContext(ScriptContext);

    const items = useScript(getItemsFn) as any[];

    return (<>
        {
            items.map(item => {
                return (
                    /* For each item, create a new script context.
                     * Such context expose current item as "exposeAs" name.
                     */
                    <ScriptContext.Provider value={{
                        identifiers: {...identifiers, [exposeAs]: item}
                    }}>
                        {children}
                    </ScriptContext.Provider>
                );
            }
            )
        }
    </>);
}