(function() {
    'use strict';
    var l = document.createElement('link');
    l.setAttribute(
        'href',
        'https://fonts.googleapis.com/css?family=Electrolize'
    );
    l.setAttribute('rel', 'stylesheet');
    document.head.append(l);
    /**
     * @param {(...args:unknown[])=>void} fn
     * @param {number} wait
     */
    function debounce(fn, wait) {
        /** @type {number | undefined} */
        var timeout;
        if (typeof fn !== 'function') {
            throw Error('first argument must be a function');
        }
        function debounced() {
            var ctx = this,
                args = arguments;
            function invoke() {
                timeout = undefined;
                fn.apply(ctx, args);
            }
            clearTimeout(timeout);
            timeout = setTimeout(invoke, wait);
        }
        debounced.cancel = function() {
            clearTimeout(timeout);
        };
        return debounced;
    }
    Y.namespace('Wegas.Config').Dashboards = {
        overview: 'WegasDashboard.getOverview();',
    };

    var varLabel = function(name) {
        return I18n.t(
            Y.Wegas.Facade.Variable.cache.find('name', name).get('label')
        );
    };

    // NB: This is a server-side function !
    // Enable entering game levels as 1.1 and convert them to internal representation, i.e. 11.
    var adjustLevel = function(val) {
        if (val >= 1.1 && val <= 9.9) {
            return val * 10;
        } else {
            ErrorManager.throwWarn('Une valeur entre 1.1 et 9.9 est attendue.');
        }
    };

    Y.namespace('Wegas.Config').CustomImpacts = function() {
        return [
            [
                'Modifier une variable de jeu',
                'var adjustLevel=' +
                    adjustLevel +
                    ';' +
                    'Variable.find(gameModel, "levelLimit").setValue(self, adjustLevel(${"type":"number", "label":"' +
                    varLabel('levelLimit') +
                    '", "description":"Entrer une valeur numérique entre &thinsp;1&thinsp;<b>.</b>1&thinsp; et &thinsp;9&thinsp;<b>.</b>9"}));',
            ],
        ];
    };

    app.once('render', function() {
        /* global Log, Y */
        Y.use('wegas-react-form', function() {
            Y.Wegas.RForm.Script.register('getter', {
                'Action.changeLevel': {
                    label: '[ProgGame] change Level',
                    arguments: [
                        {
                            type: 'string',
                            view: {
                                type: 'pageselect',
                            },
                        },
                    ],
                },
            });
        });

        // Focus blur xapi
        var blured = false;
        var blur = debounce(function() {
            blured = true;
            Y.Wegas.Facade.Variable.script.remoteEval(
                "Log.post(Log.statement('suspended', 'proggame'))"
            );
        }, 3000);
        window.addEventListener('focus', function() {
            if (blured) {
                blured = false;
                Y.Wegas.Facade.Variable.script.remoteEval(
                    "Log.post(Log.statement('resumed', 'proggame'))"
                );
            } else {
                blur.cancel();
            }
        });
        window.addEventListener('blur', blur);
        window.addEventListener('beforeunload', function() {
            Y.Wegas.Facade.Variable.script.remoteEval(
                "Log.post(Log.statement('suspended', 'proggame'))"
            );
            app.destroy(); // Allow destructor to do their thing (Log)
        });
        Y.Wegas.Facade.Variable.script.remoteEval(
            "Log.post(Log.statement('resumed', 'proggame'))"
        );
    });
    Y.use('wegas-inbox', function() {
        var OldMessageDisplay = Y.Wegas.MessageDisplay;
        Y.Wegas.MessageDisplay = Y.Base.create(
            'wegas-message',
            OldMessageDisplay,
            [],
            {
                initializer: function() {
                    var message = this.getMessage();
                    if (message.get('token')) {
                        Y.Wegas.Facade.Variable.script.remoteEval(
                            "Log.post(Log.statement('" +
                                (message.get('unread')
                                    ? 'initialized'
                                    : 'resumed') +
                                "', 'theory', '" +
                                message.get('token') +
                                "'))"
                        );
                    }
                },
                destructor: function() {
                    var message = this.getMessage();
                    if (message.get('token')) {
                        Y.Wegas.Facade.Variable.script.remoteEval(
                            "Log.post(Log.statement('suspended', 'theory', '" +
                                message.get('token') +
                                "'))"
                        );
                    }
                },
            }
        );
    });
})();
