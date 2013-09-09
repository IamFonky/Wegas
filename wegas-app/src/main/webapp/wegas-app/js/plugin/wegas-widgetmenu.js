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
YUI.add('wegas-widgetmenu', function(Y) {
    "use strict";

    /**
     * @name Y.Plugin.WidgetMenu
     * @extends Y.Plugin.Base
     * @class Plugin to be attached to a Y.Widget, adds a menu
     *  that shows up when the target event is triggered (by default click). Uses
     *  a Y.Wegas.Menu to display the menu.
     * @constructor
     */
    var HOST = "host", BOUNDINGBOX = "boundingBox",
            WidgetMenu = function() {
        WidgetMenu.superclass.constructor.apply(this, arguments);
    };

    Y.extend(WidgetMenu, Y.Plugin.Base, {
        /** @lends Y.Plugin.WidgetMenu# */

        // *** Lifecycle methods *** //
        /**
         * @function
         * @private
         */
        initializer: function() {
            var host = this.get(HOST);

            if (host instanceof Y.Node) {                                       // 1st case: host is a Y.Node
                this.bind();
            } else if (host instanceof Y.Widget) {                              // 2nd case: host is a Y.Widiget
                this.afterHostEvent("render", this.bind);
            }

            this.after("childrenChange", function() {                           // On children attribute update
                if (this.menu) {
                    this.menu.removeAll();
                    this.menu.add(this.get("children"));                        // update menu items
                }
            });
        },
        destructor: function() {
            if (this.menu) {
                this.menu.destroy();
            }
        },
        bind: function() {
            var node = this.get("targetNode");
            node.delegate(this.get("event"), function(e) {                      // Target event listener
                this.show(e.target);
                e.halt(true);                                                   // Prevent event from bubbling
                this.fire("menuOpen", {domEvent: e});                           // Notify the parent the menu has been opened
            }, this.get("selector"), this);

            node.addClass("wegas-widgetmenu-hassubmenu");                       // Add submenu class
            if (this.get("menuCfg.points") && this.get("menuCfg.points")[0].indexOf("b") < 0) {
                node.addClass("wegas-widgetmenu-hassubmenuright");
            }
        },
        add: function(widget) {
            var children = this.get("children");
            children.push(widget);
            this.set("children", children);
        },
        size: function() {
            return this.get("children").length;
        },
        /**
         * @function
         * @private
         */
        show: function(node) {
            node = node || this.get("targetNode");
            this.getMenu().attachTo(node);                                      // /Get a menu instance and attach it to the target node
        },
        // *** Private methods *** //
        /**
         * @function
         * @private
         */
        getMenu: function() {
            if (!this.menu) {
                var cfg = this.get("menuCfg"),
                        host = this.get(HOST),
                        parent = host.get("parent"),
                        menu;
                cfg.children = this.get("children");

                menu = new Menu(cfg);
                menu.addTarget(this);                                           // Catch any event generated by the menu
                menu._menuPlugin = this;
                this.menu = menu;                                               // Set up reference

                if (this.get("isSubmenu")) {                                    // Handle nested menus, events are forwarded to the parent widget
                    if (parent._menuPlugin) {
                        menu.addTarget(parent._menuPlugin);                     // Forward events to parent plugin
                    }
                    menu.on("timerCanceled", parent.cancelMenuTimer, parent);
                    menu.on("timerStarted", parent.startMenuHideTimer, parent);
                }

                (host.get("contentBox") || host).delegate("mouseleave", function() {
                    this.menu.startMenuHideTimer(false);
                }, this.get("selector"), this);
            }
            return this.menu;
        }
    }, {
        /** @lends Y.Plugin.WidgetMenu */

        NS: "menu",
        NAME: "widgetmenu",
        ATTRS: {
            isSubmenu: {
                getter: function() {
                    var parent = this.get(HOST).get("parent");
                    return (parent && parent instanceof Menu);
                }
            },
            targetNode: {
                getter: function() {
                    var host = this.get(HOST),
                            node = (host instanceof Y.Widget) ?
                            host.get(BOUNDINGBOX) : host;
                    return node;
                }
            },
            children: {
                value: []
            },
            selector: {
                value: "*"
            },
            menuCfg: {
                value: {}
            },
            event: {
                value: "click"
            }
        }
    });
    Y.namespace('Plugin').WidgetMenu = WidgetMenu;

    /**
     * @name Y.Wegas.Menu
     * @class Menu Widget, an positionnalbe overlay, intendend to be used by the menu plugin.
     * @contstructor
     * @extends Y.Widget
     * @augments Y.WidgetPosition
     * @augments Y.WidgetPositionAlign
     * @augments Y.WidgetStack
     * @augments Y.WidgetParent
     * @augments Y.WidgetPositionConstrain
     */
    var Menu = Y.Base.create("menu", Y.Widget, [Y.WidgetPosition, Y.WidgetPositionAlign, Y.WidgetStack, Y.WidgetParent, Y.WidgetPositionConstrain], {
        /** @lends Y.Wegas.Menu# */

        // *** private fields *** //
        timer: null,
        // *** Lifecycle methods *** //
        initializer: function() {
            this.publish("cancelMenuTimer", {
                emitFacade: true
            });
        },
        hide: function() {
            this.get("boundingBox").transition({
                duration: 0.1,
                easing: 'ease-out',
                opacity: 0
            }, Y.bind(Menu.superclass.hide, this));
        },
        show: function() {
            Menu.superclass.show.call(this);
            this.get("boundingBox").transition({
                duration: 0.1,
                easing: 'ease-out',
                opacity: 1
            });
        },
        renderUI: function() {
            var bb = this.get(BOUNDINGBOX);

            bb.on("clickoutside", this.clickOutside, this);
            bb.on("click", this.menuClick, this);
            bb.on("mouseenter", this.cancelMenuTimer, this);
            bb.on("mouseleave", this.startMenuHideTimer, this);
        },
        // *** Public methods *** //
        /**
         *
         *  Displays the menu next to the provided node and add mouseenter and
         *  mouseleave callbacks to the node
         *
         * @function
         */
        attachTo: function(node) {
            //node.on("mouseenter", this.show, this);
            //node.on("mouseleave", this.hide, this);
            this.currentNode = node;

            this.set("align", {
                node: node,
                points: this.get("points")
            });
            this.cancelMenuTimer();
            this.show();
        },
        // *** Private methods *** //
        menuClick: function() {
            this.hide();
        },
        clickOutside: function(e) {
            if (this.currentNode !== e.target) {
                this.hide();
            }
        },
        startMenuHideTimer: function(fireEvent) {
            //console.log("startMenuHideTimer",this.get("contentBox").one("button").getHTML());
            this.cancelMenuTimer();
            this.timer = Y.later(500, this, this.hide);

            if (!!fireEvent) {
                this.fire("timerStarted");
            }
        },
        cancelMenuTimer: function() {
            //console.log("cancelMenuTimer", this.get("contentBox").one("button").getHTML());
            if (this.timer) {
                this.timer.cancel();
            }
            this.fire("timerCanceled");
        }

    }, {
        /** @lends Y.Wegas.Menu */
        ATTRS: {
            points: {
                value: ["tl", "bl"]
            },
            constrain: {
                value: true
            },
            preventOverlap: {
                value: true
            },
            zIndex: {
                value: 50
            },
            render: {
                value: true
            },
            visible: {
                value: false
            },
            defaultChildType: {
                value: "Button"
            }
        }
    });
    Y.namespace('Wegas').Menu = Menu;

});
