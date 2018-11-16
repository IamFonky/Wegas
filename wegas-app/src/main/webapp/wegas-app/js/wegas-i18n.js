/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018  School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
/**
 * @fileoverview
 * @author Maxence Laurent (maxence.laurent gmail.com)
 */
/*global Variable, gameModel, self, YUI */

YUI.add("wegas-i18n", function(Y) {
    "use strict";

    var I18n;

    I18n = (function() {

        var config = {
            fr: {
                capitalize: function() {
                    return this.slice(0, 1).toUpperCase() + this.slice(1);
                },
                colonize: function() {
                    return this + " :";
                }
            },
            en: {
                capitalize: function() {
                    return this.slice(0, 1).toUpperCase() + this.slice(1);
                },
                colonize: function() {
                    return this + ":";
                }
            },
            de: {
                capitalize: function() {
                    return this.slice(0, 1).toUpperCase() + this.slice(1);
                },
                colonize: function() {
                    return this + ":";
                }
            }
        };
        /**
         * String extension with additional methods
         * to transform given string
         *
         * @constructor I18nString
         * @extends String
         * @param String str the given string
         */
        function I18nString(str) {
            this.value = str;
        }
        I18nString.prototype = new String();
        I18nString.prototype.toString = function() {
            return "" + this.value
        }
        I18nString.prototype.valueOf = I18nString.prototype.toString
        /**
         * Capitalize sentence's first letter.
         * Uppercase first letter, language dependant
         */
        I18nString.prototype.capitalize = function() {
            this.value = config[currentLanguage()].capitalize.call(this.value)
            return this;
        }
        /**
         * Colonize sentence, append ":" to it, language dependant
         */
        I18nString.prototype.colonize = function() {
            this.value = config[currentLanguage()].colonize.call(this.value)
            return this;
        }
        /*
         * Take the initial string and replace ALL parameters by theirs argument value
         * provided by k/v in args object.
         *
         * All paramters (i.e. identifier [a-zA-Z0-9_] surrounded by '{{' and '}}') are mandatory
         *
         */
        function mapArguments(str, args, tName) {
            var pattern = /.*\{\{([a-zA-Z0-9_]*)\}\}/,
                match, key;
            while (match = pattern.exec(str)) {
                key = match[1];
                if (args && args.hasOwnProperty(key)) {
                    str = str.replace("{{" + key + "}}", args[key]);
                } else {
                    return "[I18N] MISSING MANDATORY ARGUMENT \"" + key + "\" FOR \"" + tName + "\"";
                }
            }
            // return new I18nString(str);
            return str;
        }

        function currentNumericLocale() {
            return (Y.Wegas.I18n._currentNumericLocale ? Y.Wegas.I18n._currentNumericLocale : currentLocale());
        }

        function currentLanguage() {
            return currentLocale().split(/[-_]/)[0];
        }

        function currentLocale() {
            return Y.Wegas.I18n._currentLocale;
        }

        function getValue(table, key) {
            var res = key.split("."), value = table, i;

            for (i = 0; i < res.length; i += 1) {
                if (value.hasOwnProperty(res[i])) {
                    value = value[res[i]];
                } else {
                    return null;
                }
            }
            return value;
        }

        function getMostSpecificValue(lang, variant, key, expectedType) {
            var value;

            if (Y.Wegas.I18n._tables[lang]) {
                // main language exists
                if (variant && Y.Wegas.I18n._tables[lang].variants[variant]) {
                    // user asks for a specific variant: give it a try
                    value = getValue(Y.Wegas.I18n._tables[lang].variants[variant], key);
                }

                if (!value || typeof value !== expectedType) {
                    // main languang fallback
                    value = getValue(Y.Wegas.I18n._tables[lang].main, key);
                }
            }

            return value;
        }


        function translate(key, args) {
            if (typeof key === "string") {
                return translateFromTable(key, args);
            } else if (typeof key === "object") {
                return translateFromObject(key, args);
            }
        }

        function getCode() {
            if (!Y.Wegas.I18n._currentCode) {
                if (Y.Wegas.Facade.GameModel) {
                    var locale = currentLocale().split(/[-_]/),
                        lang = locale[0].toUpperCase(),
                        variant = locale[1],
                        gmLanguages = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages"),
                        i, gmLang;

                    if (gmLanguages.length > 0) {
                        for (i in gmLanguages) {
                            gmLang = gmLanguages[i];
                            if (gmLang.get("code") === locale) {
                                //most specific 
                                Y.Wegas.I18n._currentCode = gmLang.get("code").toUpperCase();
                            }
                            if (gmLang.get("code").toUpperCase() === lang && !Y.Wegas.I18n._currentCode) {
                                Y.Wegas.I18n._currentCode = gmLang.get("code").toUpperCase();
                            }
                        }

                        if (!Y.Wegas.I18n._currentCode) {
                            Y.Wegas.I18n._currentCode = gmLanguages[0].get("code").toUpperCase();
                        }
                    }
                } else {
                    throw "No language defined";
                }
            }
            return Y.Wegas.I18n._currentCode;
        }

        function genTranslationMarkup(text, inlineEditor, lang, id, favorite, isOutdated) {
            var outdatedClass = isOutdated ? " outdated" : "";

            if (inlineEditor === "html") {
                return "<div class='wegas-translation wegas-translation-std wegas-translation-html " + (favorite ? 'favorite-lang' : 'not-favorite-lang') + outdatedClass +
                    "' data-trid='" + id +
                    "' lang='" + lang.code + "'data-lang='" + lang.lang + "'>"
                    + I18n.getEditorTools() +
                    "<div class='wegas-translation--toolbar'></div>" +
                    "<div class='wegas-translation--value'><div tabindex='0' class='wegas-translation--toedit'>" + text + "</div></div></div>";
            } else if (inlineEditor === "string") {
                return "<span class='wegas-translation wegas-translation-std wegas-translation-string " + (favorite ? 'favorite-lang' : 'not-favorite-lang') + outdatedClass +
                    "' data-trid='" + id +
                    "' lang='" + lang.code + "'data-lang='" + lang.lang + "'>"
                    + I18n.getEditorTools() +
                    "<span class='wegas-translation--toolbar'></span>" +
                    "<span class='wegas-translation--value'><span tabindex='0' class='wegas-translation--toedit'>" + text + "</span></span></span>";
            } else if (inlineEditor === "FORBIDDEN") {
                return "<span class='wegas-readonly-translation'>" + text + "</span>";
            } else {
                return text;
            }
        }

        function getTrStatus(trContent, code) {
            var klass,
                translations;

            if (trContent) {
                if (trContent.get) {
                    klass = trContent.get("@class");
                    translations = trContent.get("translations");
                } else {
                    klass = trContent["@class"];
                    translations = trContent.translations;
                }

                if (klass === "TranslatableContent" && translations) {
                    if (translations[code]) {
                        return translations[code].status || "";
                    }
                }
            }
            return "";
        }

        function translateFromObject(trContent, params) {
            var favoriteCode = getCode(),
                i,
                langs,
                lang,
                trId = "",
                klass,
                translations,
                forcedLang = params && params.lang,
                inlineEditor = params && params.inlineEditor,
                theOne, tr,
                isOutdated;

            if (trContent) {
                if (trContent.get) {
                    klass = trContent.get("@class");
                    translations = trContent.get("translations");
                    trId = trContent.get("id");
                } else {
                    klass = trContent["@class"];
                    translations = trContent.translations;
                    trId = trContent.id;
                }

                if (klass === "TranslatableContent" && translations) {
                    var gameModel = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel();
                    langs = Y.Array.map(gameModel.get("languages"), function(item) {
                        return {
                            lang: item.get("lang"),
                            code: item.get("code").toUpperCase()
                        };
                    });
                    if (forcedLang) {
                        favoriteCode = forcedLang.toUpperCase();
                    }
                    // move favorite language at first position
                    lang = Y.Array.find(langs, function(item) {
                        return item.code === favoriteCode;
                    });
                    if (forcedLang) {
                        langs = [lang];
                    } else {
                        if (lang) {
                            i = langs.indexOf(lang);
                            langs.splice(i, 1);
                            langs.unshift(lang);
                        }
                    }
                    for (i in langs) {
                        lang = langs[i];
                        tr = translations[lang.code] || translations[lang.code.toLowerCase()];
                        if (tr !== undefined) {
                            if (tr.translation) {
                                theOne = lang;
                                isOutdated = !!tr.status;
                                tr = tr.translation;
                                break;
                            } else if (typeof tr === "string") {
                                theOne = lang;
                                isOutdated = false;
                                break;
                            }
                        }
                    }

                    if (inlineEditor && Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("type") === "SCENARIO") {

                        // the current scenario may depends on a model.
                        // do not let scenrists update protected translations
                        var variableDescriptorId = trContent.get("parentDescriptorId"),
                            variableInstanceId = trContent.get("parentInstanceId");

                        if (variableDescriptorId) {
                            var variableDescriptor = Y.Wegas.Facade.Variable.cache.find("id", variableDescriptorId),
                                visibility = variableDescriptor._getVisibility(variableDescriptor);
                            if (visibility === 'INTERNAL' || visibility === "PROTECTED") {
                                // this translation is not editable
                                inlineEditor = "FORBIDDEN";
                            }
                        } else if (variableInstanceId) {
                            var visibility,
                                variableDescriptor = Y.Wegas.Facade.Variable.cache.findByFn(function(item) {
                                    return item.get("defaultInstance").get("id") === variableInstanceId;
                                });
                            if (variableDescriptor) {
                                visibility = variableDescriptor._getVisibility(variableDescriptor);

                                if (visibility === "INTERNAL") {
                                    inlineEditor = "FORBIDDEN";
                                }
                            }
                        }
                    }

                    if (theOne) {
                        return genTranslationMarkup(tr, inlineEditor, theOne, trId, theOne.code === favoriteCode, isOutdated);
                    } else {
                        return genTranslationMarkup(params && params.fallback || "", inlineEditor, langs[0], trId, true);
                    }
                }
            }
            if (inlineEditor === "html") {
                return "<div class='wegas-translation missing' data-trid='" + trId + "' lang=''>MISSING TRANSLATION</div>";
            } else if (inlineEditor === "string") {
                return "<span class='wegas-translation missing' data-trid='" + trId + "' lang=''>MISSING TRANSLATION</span>";
            } else {
                return "MISSING TRANSLATION";
            }
        }
        /**
         * Return the translation for the key messages, according to current locale
         *
         * @param {type} key the message identifier
         * @param {type} object contains message arguments to replace {k: value, etc}
         * @returns {String} the translated string filled with provided arguments
         */
        function translateFromTable(key, object) {
            var locale = currentLocale().split(/[-_]/),
                lang = locale[0],
                variant = locale[1],
                value;

            if (Y.Wegas.I18n._tables[lang]) {
                // main language exists
                value = getMostSpecificValue(lang, variant, "tr." + key, "string");

                if (value !== undefined && value !== null) { //empty string is valid
                    if (typeof value !== "string") { // not null but not a string
                        return "[I18N] INCOMPLETE KEY \"" + key + "\"";
                    } else {
                        return mapArguments(value, object, key);
                    }
                } else {
                    return "[I18N] MISSING " + locale + " translation for \"" + key + "\"";
                }
            } else {
                return "[I18N] MISSING " + locale + " LOCALE";
            }
        }

        function parseNumber(value, formatName) {
            return Y.Number.parse(value, getFormatConfig(formatName));
        }

        function formatNumber(value, formatName) {
            return Y.Number.format(+value, getFormatConfig(formatName));
        }

        function getFormatConfig(formatName) {
            var locale = currentNumericLocale().split(/[-_]/),
                lang = locale[0],
                variant = locale[1],
                formatConfig = {},
                base, extra;

            if (Y.Wegas.I18n._tables[lang]) {
                // main language exists

                if (formatName) {
                    extra = getMostSpecificValue(lang, variant, "numbers.extra." + formatName, "object");
                    if (extra && typeof extra === "object") {
                        Y.mix(formatConfig, extra);
                    }
                }

                base = getMostSpecificValue(lang, variant, "numbers.base", "object");
                if (base && typeof base === "object") {
                    Y.mix(formatConfig, base);
                }

            }

            return formatConfig;
        }

        function add(module, locale, trTable, numberTable) {
            var langTable,
                effectiveTable,
                sp = locale.split(/[-_]/),
                lang = sp[0], variant = sp[1];

            Y.Wegas.I18n._modules[module] = true;

            langTable = Y.Wegas.I18n._tables[lang] = Y.Wegas.I18n._tables[lang] || {
                main: {
                    tr: {},
                    numbers: {}
                },
                variants: {}
            };

            if (variant) {
                effectiveTable = langTable.variants[variant] = langTable.variants[variant] || {
                    tr: {},
                    numbers: {}
                };
            } else {
                effectiveTable = langTable.main;
            }

            Y.mix(effectiveTable, {tr: trTable || {}, numbers: numberTable || {}}, true, undefined, 0, true);
        }

        function setNumericLang(lang) {
            var module,
                sp = lang.split(/[-_]/),
                deps = [];
            for (module in Y.Wegas.I18n._modules) {
                deps.push(module + "-" + sp[0]);
            }
            Y.use(deps, function(Y) {
                Y.Wegas.I18n._currentNumericLocale = lang;
            });
        }

        function resetPlayerCode(cb) {
            var languages = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages"),
                language;

            if (languages && languages.length) {

                // first active language
                language = Y.Array.find(languages, function(item) {
                    return item.get("active");
                });

                if (!language) {
                    // or first language if none is active
                    language = languages[0];
                }

                if (language && language.get("code")) {
                    setCurrentPlayerCode(language.get("code"), cb);
                }
            }
        }

        function findLanguageByCode(code) {
            return Y.Array.find(Y.Wegas.Facade.GameModel.cache.getCurrentGameModel().get("languages"), function(item) {
                return item.get("code").toUpperCase() === code.toUpperCase();
            });
        }

        function setLangByCode(code) {
            var gmLang = findLanguageByCode(code),
                code;
            if (gmLang) {
                Y.Wegas.I18n._currentCode = gmLang.get("code").toUpperCase();
                code = gmLang.get("code");

                if (code === "def") {
                    // hack: guess code from gmLang fullname
                    switch (gmLang.get("lang").toLowerCase()) {
                        case "fr":
                        case "francais":
                        case "français":
                        case "french":
                            code = "fr";
                            break;
                        case "en":
                        case "english":
                        case "anglais":
                        default:
                            code = "en";
                    }
                }
                setLang(code);
            }
        }

        function getAvailableLang() {
            return Y.Array.reduce(Y.config.groups.wegas.allModules, [], function(previous, currentValue, index, array) {
                if (currentValue.indexOf("wegas-i18n-global-" === 0)) {
                    previous.push(currentValue.substring(18));
                }
                return previous;
            });
        }

        function isLangAvailable(lang) {
            return getAvailableLang().indexOf(lang) >= 0;
        }

        function setLang(locale, cb) {
            var module,
                lang = locale.split(/[-_]/)[0],
                deps = [];

            lang = lang && lang.toLowerCase();
            if (isLangAvailable(lang)) {
                for (module in Y.Wegas.I18n._modules) {
                    deps.push(module + "-" + lang);
                }
                Y.use(deps, function(Y) {
                    Y.Wegas.I18n._currentLocale = locale.toLowerCase();
                    String.prototype.capitalize = config[lang].capitalize; // don't
                    String.prototype.colonize = config[lang].colonize; // don't

                    var preview = Y.Widget.getByNode(Y.one(".wegas-playerview"));
                    if (preview) {
                        preview.reload();
                    }
                });
            }
        }

        function loadModule(moduleName) {
            var deps = computeDep(moduleName);
            YUI.add(moduleName, function(Y) {
                "use strict";
                Y.log(moduleName + deps + "\" translation loaded");
            }, 1.0, {requires: deps});
        }

        function computeDep(module) {
            var ret = [],
                lang;
            if (Y.Wegas.I18n._currentLocale) {
                lang = Y.Wegas.I18n._currentLocale.split(/[-_]/)[0];
                ret.push(module + "-" + lang);
            }
            if (Y.Wegas.I18n._currentNumericLocale) {
                lang = Y.Wegas.I18n._currentNumericLocale.split(/[-_]/)[0];
                ret.push(module + "-" + lang);
            }
            return ret;
        }

        function setCurrentPlayerCode(code, cb) {
            var self = Y.Wegas.Facade.Game.cache.getCurrentPlayer();
            self.set("lang", code);
            Y.Wegas.Facade.Game.cache.sendRequest({
                request: "/Team/" + self.get("teamId") + "/Player/" + self.get("id"),
                cfg: {
                    method: "put",
                    data: self
                },
                on: {
                    success: function(response) {
                        if (cb) {
                            cb.call(null, response.response.entity.get("lang"));
                        } else {
                            I18n.setCode(response.response.entity.get("lang"));
                            //Y.Widget.getByNode(Y.one(".wegas-playerview")).reload();
                        }
                    }
                }
            });
        }
        ;

        return {
            /**
             *  {"lang" : { "token" : { "token" : "translation"}}
             */
            _tables: {},
            _modules: {},
            _currentLocale: undefined,
            _currentCode: undefined,
            _currentTable: function() {
                return Y.Wegas.I18n._tables[Y.Wegas.I18n._currentLocale];
            },
            register: function(module, lang, trTable, numberTable) {
                add(module, lang, trTable, numberTable);
            },
            update: function(module, lang, trTable, numberTable) {
                add(module, lang, trTable, numberTable);
            },
            lang: function() {
                return currentLocale();
            },
            getCode: getCode,
            setCode: setLangByCode,
            setLang: setLang,
            setNumericLang: setNumericLang,
            t: function(key, args) {
                return translate(key, args);
            },
            getTrStatus: function(trc, code) {
                return getTrStatus(trc, code);
            },
            formatNumber: function(v, f) {
                return formatNumber(v, f);
            },
            parseNumber: function(v, f) {
                return parseNumber(v, f);
            },
            loadModule: function(moduleName) {
                return loadModule(moduleName);
            },
            setCurrentPlayerCode: function(code, cb) {
                return setCurrentPlayerCode(code, cb);
            },
            findLanguageByCode: function(code) {
                return findLanguageByCode(code);
            },
            resetPlayerCode: function(cb) {
                return resetPlayerCode(cb);
            },
            getEditorTools: function() {
                return "<span class='tools'>" +
                    "<span title='Auto translate from...' class='inline-editor-i18n fa fa-download'></span>" +
                    "<span title='Save and outdate other languages' class='inline-editor-major-validate fa fa-stack fa-1g'>" +
                    "  <i class='fa fa-toggle-on fa-stack-1x'></i>" +
                    "  <i class='fa fa-expand fa-stack-1x'></i>" +
                    "</span>" +
                    "<span class='inline-editor-separator'></span>" +
                    "<span title='Save and mark as up-to-date' class='inline-editor-catch_up-validate fa fa-toggle-on fa-flip-horizontal'></span>" +
                    "<span title='Save and mark as outdated' class='inline-editor-outdate-validate fa fa-toggle-on'></span>" +
                    "<span title='Undo' class='inline-editor-cancel fa fa-undo'></span>" +
                    "<span title='Save' class='inline-editor-validate fa fa-save'></span>" +
                    "</span>";
            }
        };
    }());

    Y.config.win.I18n = I18n; // @hack -> let I18n module be accessible from the outside
    Y.Wegas.I18n = I18n;
    I18n.setLang("en");
    I18n.setNumericLang(Y.config.preferredLocale);
});
