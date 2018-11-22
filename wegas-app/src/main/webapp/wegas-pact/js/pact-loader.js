/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018  School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
/**
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */
YUI.addGroup('wegas-pact', {
    base: './wegas-pact/',
    root: '/wegas-pact/',
    modules: {
        /** Prog game **/
        'pact-level': {
            requires: [
                'tabview',
                'treeview',
                'event-key',
                'transition',
                'wegas-tabview',
                'wegas-widget',
                'wegas-inputex-ace',
                'pact-scriptfiles',
                'wegas-treeview',
                'resize',
                'pact-display',
                'pact-jsinstrument',
                'wegas-conditionaldisable',
                'wegas-tutorial',
                'wegas-alerts',
                'wegas-text',
            ],
            ws_provides: 'ProgGameLevel',
        },
        'pact-display': {
            requires: ['wegas-widget', 'crafty', 'yui-later'],
            ws_provides: 'ProgGameDisplay',
        },
        'pact-inputex': {
            requires: ['wegas-inputex', 'inputex-list'],
            ix_provides: ['proggametile', 'proggamemap'],
        },
        'pact-jsinstrument': {
            requires: ['esprima', 'escodegen'],
        },
        'pact-scriptfiles': {
            requires: 'wegas-panel',
            ws_provides: 'ScriptFiles',
        },
    },
});
