/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */


/* global I18n, tinyMCE */

/**
 * @fileOverview GameModel langueages management widgets
 * @author Maxence
 */
YUI.add('wegas-gamemodel-i18n', function(Y) {
    "use strict";
    var LanguagesManager,
        TranslationEditor;
    LanguagesManager = Y.Base.create("wegas-i18n-manager", Y.Widget,
        [Y.WidgetParent, Y.WidgetChild, Y.Wegas.Editable, Y.Wegas.Parent], {
        initializer: function() {
            this.handlers = {};
            this.plug(Y.Plugin.TranslationEditor);
        },
        destructor: function() {
            var k;
            for (k in this.handlers) {
                if (this.handlers.hasOwnProperty(k)) {
                    this.handlers[k].detach();
                }
            }
        },
        renderUI: function() {
            this.title = new Y.Wegas.Text({
                cssClass: "wegas-i18n-manager--title",
                content: I18n.t("i18n.manager.title")
            });
            this.languages = new Y.Wegas.FlexList({
                cssClass: "wegas-i18n-manager--languages",
                direction: 'horizontal'
            });
            /*this.layout = new Y.Wegas.FlexList({
             cssClass: "wegas-i18n-manager--layout",
             direction: 'horizontal'
             });*/
            /*this.treeview = new Y.Wegas.Text({
             cssClass: "wegas-i18n-manager--treeview",
             content: "Treeview"
             });*/
            this.editor = new Y.Wegas.Text({
                cssClass: "wegas-i18n-manager--editor",
                content: "editor"
            });
            //this.layout.add(this.treeview);
            //this.layout.add(this.editor);
            this.add(this.title);
            this.add(this.languages);
            this.add(this.editor);
        },
        syncUI: function() {
            var gm = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel(),
                languages = gm.get("languages"),
                i, lang;
            this.languages.destroyAll();
            for (i in languages) {
                lang = languages[i];
                this.languages.add(new Y.Wegas.Text({
                    content: lang.get("code") + " / " + lang.get("lang")
                }));
            }
            if (!this.findLanguage("fr")) {
                this.languages.add(this.genButton("fr", "Français"));
            }

            this.tree = this.genTree(Y.Wegas.Facade.GameModel.cache.getCurrentGameModel());

            //this.treeview.set("content", "<ul>" + this.genTreeviewMarkup(this.tree) + "</ul>");
            //this.treeview.syncUI();

            this.rebuildEditor();

        },
        bindUI: function() {
            this.get("contentBox").delegate("click", this.addLanguageClick, ".create-button", this);

            this.handlers.onEditEntity = Y.after("edit-entity:edit", function(e) {
                var node = this.get("contentBox").one("[data-entityid=\"" + e.entity._yuid + "\"]");
                this.get("contentBox").all(".highlight").removeClass("highlight");
                Y.Wegas.Helper.scrollIntoViewIfNot(node);
                node.addClass("highlight");
            }, this);
        },
        rebuildEditor: function() {
            var gm = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel();
            this.editor.set("content", this.genEditorMarkup(this.tree, gm.get("languages")));
            this.editor.syncUI();
        },
        genEditorMarkup: function(node, languages, level) {
            level = level || 0;
            var child, tr, markup = [], field;
            if (node.hasTranslations) {
                markup.push("<div class='node' data-entityid='", node.entityId, "' data-level='", level, "'>");

                if (node.translations && node.translations.length > 0) {
                    markup.push("<div class='node-name'>", node.nodeLabel, "</div>");

                    markup.push("<div class='translatedcontents'>");
                    for (var i in node.translations) {
                        tr = node.translations[i];
                        field = tr.key;
                        markup.push("<div class='translatedcontent'>");
                        for (var l in languages) {
                            markup.push("<div class='translation'>");
                            markup.push("<div class='translation-title'>");
                            markup.push("<span class='field-name'>", field, "</span>");
                            markup.push("<span class='translation-language'> [", languages[l].get("code"), "]</span>");
                            markup.push("</div>");  // /translation title
                            markup.push(I18n.t(tr.value, {
                                lang: languages[l].get("refName"),
                                inlineEditor: tr.type && tr.type.replace("I18n", "")
                            }));
                            markup.push("</div>");  // /translation
                        }
                        markup.push("</div>"); // /translatedcontent
                    }
                    markup.push("</div>"); // translatedcontens
                }

                markup.push("<div class='node-children'>");
                for (var i in node.children) {
                    child = node.children[i];
                    markup.push(this.genEditorMarkup(child, languages, level + 1));
                }
                markup.push("</div>");

                markup.push("</div>"); // /node
            }
            return markup.join("");
        },
        /*genTreeviewMarkup: function(node) {
         var i, child, tr, markup = [];
         if (node.hasTranslations) {
         
         markup.push("<li>", node.nodeName, "</li>");
         
         for (i in node.translations) {
         tr = node.translations[i];
         }
         
         markup.push("<ul>");
         for (i in node.children) {
         child = node.children[i];
         markup.push(this.genTreeviewMarkup(child));
         }
         markup.push("</ul>");
         }
         return markup.join("");
         },*/
        genTree: function(entity) {
            var attrs, key, attr, sub, i, child, children,
                node;


            if (entity instanceof Y.Wegas.persistence.Entity) {
                node = {
                    entityId: entity._yuid,
                    nodeName: entity.getEditorLabel(),
                    nodeLabel: entity.getEditorLabel(),
                    hasTranslations: false,
                    translations: [],
                    children: []
                };

                if (entity.getIconCss) {
                    node.nodeLabel = "<i class='" + entity.getIconCss() + "'></i> " + node.nodeLabel;
                }

                attrs = entity.getAttrs();
                for (key in attrs) {
                    if (attrs.hasOwnProperty(key)) {
                        attr = attrs[key];
                        if (attr) {
                            sub = null;
                            var cfg = entity.getAttrCfgs()[key];
                            if (!cfg.visible || cfg.visible(attr, attrs)) {
                                if (Array.isArray(attr)) {
                                    children = {
                                        nodeName: key,
                                        nodeLabel: key,
                                        hasTranslations: false,
                                        translations: [],
                                        children: []
                                    };
                                    for (i in attr) {
                                        child = attr[i];
                                        sub = this.genTree(child);
                                        if (sub && sub.hasTranslations) {
                                            children.hasTranslations = true;
                                            children.children.push(sub);
                                        }
                                    }
                                    sub = children;
                                } else if (attr instanceof Y.Wegas.persistence.TranslatableContent) {
                                    node.hasTranslations = true;
                                    var type;
                                    if (cfg && cfg.properties && cfg.properties.translations && cfg.properties.translations && cfg.properties.translations.view) {
                                        type = cfg.properties.translations.view.type;
                                    }
                                    node.translations.push({
                                        type: type,
                                        key: key,
                                        value: attr
                                    });

                                } else {
                                    sub = this.genTree(attr);
                                }
                                if (sub && sub.hasTranslations) {
                                    node.hasTranslations = true;
                                    node.children.push(sub);
                                }
                            }
                        }
                    }

                }
            }

            return node;
        },
        genButton: function(code, lang) {
            var btn = new Y.Wegas.Text({
                cssClass: "create-button",
                content: "create \"" + lang + "\""
            }),
                tCb = btn.get("contentBox");
            tCb.setAttribute("data-code", code);
            tCb.setAttribute("data-lang", lang);
            return btn;
        },
        addLanguageClick: function(e) {
            this.createNewLanguage("fr", "Français");
        },
        findLanguage: function(code) {
            var gm = Y.Wegas.Facade.GameModel.cache.getCurrentGameModel(),
                languages = gm.get("languages"),
                i, lang;
            for (i in languages) {
                lang = languages[i];
                if (lang.get("code") === code) {
                    return lang;
                }
            }
            return null;
        },
        createNewLanguage: function(code, name) {
            Y.Wegas.Facade.GameModel.sendRequest({
                request: '/' + Y.Wegas.Facade.GameModel.get('currentGameModelId') + "/I18n/Lang",
                cfg: {
                    method: "POST",
                    data: {
                        "@class": "GameModelLanguage",
                        code: code,
                        lang: name
                    }
                },
                on: {
                    success: Y.bind(this.syncUI, this),
                    failure: Y.bind(this.syncUI, this)
                }
            });
        }
    }, {
        EDITORNAME: "Languages Manager",
        ATTRS: {}
    });
    Y.Wegas.LanguagesManager = LanguagesManager;
    TranslationEditor = Y.Base.create('wegas-translation-editor', Y.Plugin.Base, [Y.Wegas.Plugin, Y.Wegas.Editable], {
        initializer: function() {
            this.handlers = {};
            var hostCB = this.get("host").get("contentBox");
            hostCB.delegate("click", this.setupEditor, ".wegas-translation.favorite-lang .wegas-translation--value", this);
            hostCB.delegate("click", this.save, ".wegas-translation.favorite-lang .inline-editor-validate", this);
            hostCB.delegate("key", this.ctrlSave, 'down:83+ctrl', ".wegas-translation.favorite-lang .wegas-translation--value", this);
            hostCB.delegate("click", this.cancel, ".wegas-translation.favorite-lang .inline-editor-cancel", this);
            this.contents = {};
            //hostCB.delegate("blur", this.onBlurString, ".wegas-translation-blur.favorite-lang", this);
        },
        _getCfgFromEvent: function(e) {
            var node, trId, refName;
            if (e.target && e.target.ancestor) {
                node = e.currentTarget.ancestor(".wegas-translation");
            } else {
                node = Y.one("#" + e.target.id).ancestor(".wegas-translation");
            }

            trId = node.getAttribute("data-trid"),
                refName = node.getAttribute("data-refname");
            return {
                node: node,
                trId: trId,
                refName: refName,
                key: refName + "-" + trId
            };
        },
        _onHtmlChange: function(e) {
            Y.log("HTML Change");
            var newContent = this.toInjectorStyle(this.editor.getBody().innerHTML),
                cfg = this._getCfgFromEvent(e),
                updated = newContent !== this.contents[cfg.key];
            cfg.node.toggleClass("unsaved", updated);
        },
        _onHtmlBlur: function(e) {
            /*if (this.editor) {
             //this.removeEditor();
             }*/
        },
        ctrlSave: function(e) {
            e.halt(true);
            this.save(e);
        },
        save: function(e) {
            var cfg = this._getCfgFromEvent(e),
                rawValue = cfg.node.one(".wegas-translation--value").getContent(),
                newValue = this.toInjectorStyle(rawValue);
            this.saveTranslation(cfg, newValue);
            // save wegas-translation--value 
        },
        cancel: function(e) {
            var cfg = this._getCfgFromEvent(e);
            this.contents[cfg.key];
            // reset wegas-translation--value to initial one and remove tools
            cfg.node.one(".wegas-translation--value").setContent(this.contents[cfg.key]);
            cfg.node.removeClass("unsaved");
        },
        saveTranslation: function(cfg, translation) {
            Y.Wegas.Facade.GameModel.sendRequest({
                request: '/' + Y.Wegas.Facade.GameModel.get('currentGameModelId') + "/I18n/Tr/" + cfg.refName + "/" + cfg.trId,
                cfg: {
                    method: "PUT",
                    data: translation
                },
                on: {
                    success: Y.bind(this.success, this, cfg),
                    failure: Y.bind(this.error, this, cfg)
                }
            });
        },
        success: function(cfg, response) {
            Y.log("SUCCESS");
            this.contents[cfg.key] = response.response.entity.get("translations")[cfg.refName];
            cfg.node.removeClass("unsaved");
            this.removeEditor();
        },
        error: function() {
            Y.log("ERROR");
        },
        toInjectorStyle: function(content) {
            // remove yui ids
            var root = document.createElement('div');
            root.innerHTML = content;
            var yuiId = root.querySelectorAll('[id^="yui_"]');
            for (var n = 0; n < yuiId.length; n += 1) {
                yuiId[n].removeAttribute('id');
            }

            return root.innerHTML
                .replace(
                    new RegExp(
                        '((src|href)="[^"]*/rest/File/GameModelId/[^"]*/read([^"]*)")',
                        'gi'
                        ),
                    'data-file="$3"'
                    ) // Replace absolute path with injector style path (old version)
                .replace(
                    new RegExp(
                        '((src|href)="[^"]*/rest/GameModel/[^"]*/File/read([^"]*)")',
                        'gi'
                        ),
                    'data-file="$3"'
                    ); // Replace absolute path with injector style path
        },
        removeEditor: function() {
            this.editor.remove();
            this.editor.destroy();
            this.currentEditorKey = undefined;
            Y.log("Destroy editor ");
        },
        setupEditor: function(e) {
            var cfg = this._getCfgFromEvent(e);
            if (this.editor) {
                if (cfg.key === this.currentEditorKey) {
                    return;
                }
                this.removeEditor();
            }

            Y.log("SetupEditor for " + cfg.key);
            this.currentEditorKey = cfg.key;
            if (this.contents[cfg.key] === undefined) {
                // save initial values
                this.contents[cfg.key] = this.toInjectorStyle(cfg.node.one(".wegas-translation--value").getHTML());
            }

            var tinyConfig = {
                inline: true,
                selector: "#" + cfg.node.get("id") + " .wegas-translation--value",
                browser_spellcheck: true,
                plugins: [
                    'autolink link image lists code media table',
                    'paste advlist textcolor',
                        // textcolor wordcount autosave contextmenu
                        // advlist charmap print preview hr anchor pagebreak spellchecker
                        // directionality
                ],
                external_plugins: {
                    "dynamic_toolbar": Y.Wegas.app.get("base") +
                        "wegas-editor/js/plugin/wegas-tinymce-dynamictoolbar.js"
                },
                toolbar1: 'bold italic bullist | link image media code addToolbarButton',
                toolbar2: 'forecolor backcolor underline alignleft aligncenter alignright alignjustify table',
                toolbar3: 'fontsizeselect styleselect',
                // formatselect removeformat underline unlink forecolor backcolor anchor previewfontselect
                // fontsizeselect styleselect spellchecker template
                // contextmenu: 'link image inserttable | cell row
                // column deletetable | formatselect forecolor',
                menubar: false,
                resize: 'both',
                max_height: 500,
                statusbar: true,
                branding: false,
                relative_urls: false,
                toolbar_items_size: 'small',
                hidden_tootlbar: [2, 3],
                file_browser_callback: Y.bind(this.onFileBrowserClick, this),
                setup: Y.bind(function(editor) {
                    this.editor = editor;
                    editor.on('change', Y.bind(this._onHtmlChange, this));
                    editor.on('keyUp', Y.bind(this._onHtmlChange, this));
                    editor.on('blur', Y.bind(this._onHtmlBlur, this)); // text input & ctrl-related operations
                    editor.on('init', Y.bind(function() {
                        this.editor = editor;
                        this.editor.focus();
                    }, this));
                    //this.editor.focus();
                    //his.editor.targetElm.click()
                }, this),
                image_advtab: true,
                content_css: [
                    '//maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
                    Y.Wegas.app.get('base') + "wegas-editor/css/wegas-tinymce-editor.css",
                ],
                style_formats: [
                    {
                        // Style formats
                        title: 'Title 1',
                        block: 'h1',
                    },
                    {
                        title: 'Title 2',
                        block: 'h2',
                        // styles : {
                        //    color : '#ff0000'
                        // }
                    },
                    {
                        title: 'Title 3',
                        block: 'h3',
                    },
                    {
                        title: 'Normal',
                        inline: 'span',
                    },
                    {
                        title: 'Code',
                        // icon: 'code',
                        block: 'code',
                    },
                ],
            };
            if (cfg.node.hasClass("wegas-translation-string")) {
                tinyConfig.theme = 'inlite';
            }
            tinyMCE.init(tinyConfig);
        },
        onFileBrowserClick: function(field_name, url, type, win) {
            this.filePanel = new Y.Wegas.FileSelect();
            this.filePanel.after("*:fileSelected", Y.bind(function(e, path) {
                e.stopImmediatePropagation();
                e.preventDefault();
                var win = this.filePanel.win,
                    field_name = this.filePanel.field_name,
                    targetInput = win.document.getElementById(field_name);
                targetInput.value = Y.Wegas.Facade.File.getPath() + path; // update the input field

                if (typeof (win.ImageDialog) !== "undefined") { // are we an image browser
                    if (win.ImageDialog.getImageData) { // we are, so update image dimensions...
                        win.ImageDialog.getImageData();
                    }

                    if (win.ImageDialog.showPreviewImage) { // ... and preview if necessary
                        win.ImageDialog.showPreviewImage(Wegas.Facade.File.getPath() + path);
                    }
                }
                if (win.Media) { // If in an editor window
                    win.Media.formToData("src"); // update the data
                }
                this.filePanel.destroy();
            }, this));
            this.filePanel.win = win;
            this.filePanel.field_name = field_name;
            return false;
        },
        destructor: function() {
            var k;
            for (k in this.handlers) {
                this.handlers[k].detach();
            }
        }
    }, {
        NS: 'TranslationEditor',
        ATTRS: {
        }
    }
    );
    Y.Plugin.TranslationEditor = TranslationEditor;
});
