/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
/**
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */
YUI.add('wegas-pageeditor', function(Y) {
    "use strict";

    var PageEditor, BOUNDINGBOX = "boundingBox",
            CONTENTBOX = "contentBox",
            Alignable = Y.Base.create("wegas-pageeditor-overlay", Y.Widget,
            [Y.WidgetPosition, Y.WidgetPositionAlign, Y.WidgetStack], {
        //CONTENT_TEMPLATE: '<div><span class="wegas-icon wegas-icon-edit"></span><div>'
    }, {
        CSS_PREFIX: "wegas-pageeditor-overlay"
    });

    /**
     *  @class
     *  @name Y.Plugin.PageEditor
     *  @extends Y.Plugin.Base
     *  @constructor
     */
    PageEditor = function() {
        PageEditor.superclass.constructor.apply(this, arguments);
    };

    Y.extend(PageEditor, Y.Plugin.Base, {
        // *** Lifecycle methods *** //
        initializer: function() {
            this.afterHostEvent("render", this.render);
            this.handlers = [];
        },
        render: function() {
            var el, host = this.get('host');

            if (host.toolbar) {
                el = host.toolbar.get('header');
                this.designButton = new Y.ToggleButton({
                    label: "<span class=\"wegas-icon wegas-icon-designmode\"></span><span class='experimental'>Edit page</span>"
                }).render(el);
                this.designButton.after("pressedChange", function(e) {
                    var host = this.get("host");
                    host.get(BOUNDINGBOX).toggleClass("wegas-pageeditor-designmode",
                            e.newVal);
                    if (e.newVal) {

                        Y.Wegas.Facade.Page.cache.getIndex(function(index) {
                            var pageName = Y.Lang.isString(index[host.get("pageId")])
                                    ? index[host.get("pageId")]
                                    : "unamed(" + host.get("pageId") + ")";
                            host.toolbar.setStatusMessage("Editing page " + pageName);
                        });
                        this.bind();
                        this.layoutbutton.show();
                        host.get(CONTENTBOX).prepend(this.overlayMask);
                    } else {
                        this.detach();
                        host.toolbar.setStatusMessage("");
                        this.overlayMask.remove(false);
                        this.highlightOverlay.hide();
                        this.layoutbutton.set("pressed", false);
                        this.layoutbutton.hide();
                    }
                }, this);
                this.layoutbutton = new Y.ToggleButton({
                    label: "<span class=\"wegas-icon wegas-icon-designmode\"></span>Show regions</span>",
                    visible: false
                }).render(el);
                this.layoutbutton.after("pressedChange", function(e) {
                    this.get("host").get(BOUNDINGBOX).toggleClass("wegas-pageeditor-layoutmode",
                            e.newVal);
                }, this);

                /** Source view**/

                this.sourceButton = new Y.ToggleButton({
                    label: "<span class=\"wegas-icon wegas-icon-viewsrc\"></span>Source",
                    on: {
                        click: Y.bind(this.processSource, this)
                    }
                }).render(el);
                this.sourceButton.get("boundingBox").addClass("wegas-advanced-feature");
                this.afterHostEvent("widgetChange", this.processSource);

                this.saveButton = new Y.Button({
                    label: "<span class=\"wegas-icon wegas-icon-save\"></span>Save",
                    on: {
                        click: Y.bind(this.processSave, this)
                    }
                }).render(el);
            }

            this.highlightOverlay = new Alignable({// Init the highlighting overlay
                zIndex: 30,
                render: true,
                visible: false
            });
            this.overlayMask = new Y.Node.create("<div class='pageeditor-overlay-mask'></div>");
            this.overlayMask.plug(Y.Plugin.WidgetMenu, {
                event: "click"
            });
            this.get("host").get(BOUNDINGBOX).prepend(this.highlightOverlay.get(BOUNDINGBOX));
            host.get(CONTENTBOX).plug(Y.Plugin.ScrollInfo);
            this.doBefore("pageIdChange", function() {
                this.designButton.set("pressed", false);
            });
        },
        bind: function() {
            this.handlers.push(this.overlayMask.menu.on("menuOpen", function(e) {
                if (!this.highlightOverlay.get("visible")) {
                    this.overlayMask.menu.menu.hide();
                    return;
                }
                this.overlayMask.menu.menu.set("xy", [e.domEvent.clientX, e.domEvent.clientY]);
                this.targetWidget = this.overlayWidget;
                this.overlayMask.menu.set("children", this.targetWidget.getMenuCfg({
                    widget: this.targetWidget
                }));
                if (this.overlayMask.menu.getMenu().size() > 0) {
                    this.overlayMask.menu.getMenu().item(0).fire("click");
                }
            }, this));

            this.handlers.push(this.overlayMask.on("mousemove", function(e) {
                var widget;
                e.halt(true);
                this.overlayMask.hide();
                this.highlightOverlay.hide();
                widget = Y.Widget.getByNode(//Find a parent Wegas widget or self
                        Y.Node(window.document.elementFromPoint(e.clientX, e.clientY)).ancestor(".wegas-widget", true)
                        );
                this.overlayMask.show();
                if (this.get("host") === widget) {
                    return;
                }
                if (this.overlayWidget !== widget) {
                    this.showOverlay(widget);
                } else {
                    this.highlightOverlay.show();
                }
            }, this));
            this.get("host").get(CONTENTBOX).after("mouseout", function() {
                this.hideOverlay();
            }, this);
            this.get("host").get(CONTENTBOX).scrollInfo.on("*:scroll", function(e) {
                this.overlayMask.setStyles({top: e.scrollTop, left: e.scrollLeft});
            }, this);
        },
        processSave: function() {
            var host = this.get("host"),
                    page = Y.JSON.parse(this.jsonView.getValue());
            this.sourceButton.set("pressed", false);
            host.get("contentBox").show();
            this.jsonView.hide();
            this.designButton.enable();
            this.saveButton.hide();
            //host.get("widget").set("@pageId", host.get("widget")["@pageId"]);
            page["@pageId"] = host.get("widget")["@pageId"];
            Y.Wegas.Facade.Page.cache.patch(page);
        },
        processSource: function() {
            var host = this.get("host");

            if (this.sourceButton.get("pressed")) {
                if (!this.jsonView) {
                    this.initJsonView();
                    return;
                }
                this.jsonView.setValue(Y.JSON.stringify(host.get("widget").toObject("@pageId"), null, "\t"));
                host.get("contentBox").hide();
                this.jsonView.show();
                this.jsonView.editor.resize();
                this.jsonView.focus();
                this.designButton.disable();
                this.saveButton.show();
            } else {
                host.get("contentBox").show();
                if (this.jsonView) {
                    this.jsonView.hide();
                }
                this.designButton.enable();
                this.saveButton.hide();
            }
        },
        initJsonView: function() {
            if (!this.jsonView) {
                Y.use("wegas-inputex-ace", Y.bind(function(Y) {
                    this.jsonView = new Y.inputEx.AceField({
                        parentEl: this.get("host").get("boundingBox"),
                        name: 'text',
                        type: 'ace',
                        height: "100%",
                        language: "json",
                        value: '',
                        wrapperClass: "wegas-pageeditor-ace"
                    });
                    this.jsonView.hide();
                    this.processSource();
                }, this));
            }
        },
        detach: function() {
            var i;
            for (i = 0; i < this.handlers.length; i = i + 1) {
                this.handlers[i].detach();
            }
        },
        showOverlay: function(widget) {
            var targetNode = widget.get(BOUNDINGBOX), bb = this.highlightOverlay.get("boundingBox");
            if (!widget.toObject || this.overlayWidget === widget) {
                return;
            }

            this.overlayWidget = widget;
            //targetNode.prepend(this.highlightOverlay.get(BOUNDINGBOX));

            this.highlightOverlay.show();
            this.anim = this.anim || new Y.Anim({
                node: bb,
                duration: 0.15
            });
            //this.highlightOverlay.align(targetNode, [Y.WidgetPositionAlign.TL, Y.WidgetPositionAlign.TL]);
            try {
                this.anim.stop();
                if (this.runTimeout) {
                    this.runTimeout.cancel();
                }
                if (this.overlayWidget) {

                    this.runTimeout = Y.later(100, this, function() {
                        this.highlightOverlay.get(CONTENTBOX).setContent("<div>" + widget.getName() + "</div>");
                        this.anim.set("from", {
                            xy: bb.getXY(),
                            width: bb.getDOMNode().offsetWidth,
                            height: bb.getDOMNode().offsetHeight
                        });
                        this.anim.set("to", {
                            xy: targetNode.getXY(),
                            width: targetNode.getDOMNode().offsetWidth,
                            height: targetNode.getDOMNode().offsetHeight
                        });
                        this.anim.run();
                    });
                } else {

                    this.highlightOverlay.align(targetNode, [Y.WidgetPositionAlign.TL, Y.WidgetPositionAlign.TL]);
                    this.highlightOverlay.get(BOUNDINGBOX).setStyles({
                        width: widget.get(BOUNDINGBOX).getDOMNode().offsetWidth,
                        height: widget.get(BOUNDINGBOX).getDOMNode().offsetHeight
                    });
                }
            } catch (e) {
            } finally {
                this.overlayWidget = widget;
            }
        },
        hideOverlay: function() {
            this.overlayWidget = null;
            this.highlightOverlay.hide();
        }

    }, {
        NS: "pageeditor",
        NAME: "pageeditor",
        ATTRS: {}
    });
    Y.namespace('Plugin').PageEditor = PageEditor;

});
