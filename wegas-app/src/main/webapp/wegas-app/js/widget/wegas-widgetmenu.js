/*
 * Wegas
 * http://www.albasim.com/wegas/
 *
 * School of Business and Engineering Vaud, http://www.heig-vd.ch/
 * Media Engineering :: Information Technology Managment :: Comem
 *
 * Copyright (C) 2012
 */

/**
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */

YUI.add('wegas-widgetmenu', function (Y) {
    "use strict";

    /**
     *  @class WidgetMenu
     *  @module Wegas
     *  @constructor
     */
    var  WidgetMenu = function () {
        WidgetMenu.superclass.constructor.apply(this, arguments);
    };

    Y.extend(WidgetMenu, Y.Plugin.Base, {

        // *** Lifecycle methods *** //
        initializer: function () {
            this.afterHostEvent("render", function () {
                var bb = this.get("host").get("boundingBox");

                bb.delegate(this.get("event"), function (e) {
                    var menu = this.getMenu();                                  // Get a menu instance

                    menu.attachTo(e.target);                                    // Attach it to the target node
                    e.halt(true);                                               // Prevent event from bubbling
                    this.fire("menuOpen");                                      // Notify the parent the menu has been opened
                }, this.get("selector"), this);


                bb.append('<span class="wegas-widgetmenu-submenuindicator"></span>');      // Add submenu indicator
                bb.addClass("wegas-widgetmenu-hassubmenu");
                //bb.all(this.get("selector")).addClass("wegas-widgetmenu-hassubmenu");
                if (this.get("menuCfg.points") && this.get("menuCfg.points")[0].indexOf("b") < 0) {
                    bb.addClass("wegas-widgetmenu-hassubmenuright");
                }
            });
        },
        show: function () {
            var menu = this.getMenu();                                          // Get a menu instance
            menu.attachTo(
                this.get("host").get("boundingBox").one(this.get("selector"))); // Attach it to the target node
        },
        /*on: function () {
            var menu = this.getMenu();                                          // Get a menu instance
            menu.on.apply(menu, arguments);
        },*/

        // *** Private methods *** //

        getMenu: function () {
            if (!this.menu) {
                var cfg = this.get("menuCfg"),
                host = this.get("host"),
                parentWidget = host.get("parent");
                cfg.children = this.get("children");

                this.menu = new Y.Wegas.Menu(cfg);
                this.menu.addTarget(this);                                      // Catch any event generated by the menu

                if (parentWidget && parentWidget instanceof Y.Wegas.Menu) {     // Handle nested menus, events are forwarded to the parent widget
                    this.menu.on("timerCanceled", function () {
                        parentWidget.cancelMenuTimer();
                    }, this);
                    this.menu.on("timerStarted", function () {
                        parentWidget.startMenuHideTimer();
                    }, this);

                }
                //else {
                host.get("contentBox").delegate("mouseleave", function () {
                    this.menu.startMenuHideTimer(false);
                }, this.get("selector"), this);
            // }
            }
            return this.menu;
        }
    }, {
        NS: "menu",
        NAME: "widgetmenu",
        ATTRS: {
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
     *  Menu Widget, an positionnalbe overlay, intendend to be used by the menu plugin.
     */
    Y.namespace('Wegas').Menu = Y.Base.create("menu", Y.Widget, [ Y.WidgetPosition,  Y.WidgetPositionAlign, Y.WidgetStack, Y.WidgetParent, Y.WidgetPositionConstrain ], {

        // *** private fields *** //

        timer: null,

        // *** Lifecycle methods *** //
        initializer: function () {
            this.publish("click", {
                emitFacade: true,
                bubbles: true
            });
            this.publish("cancelMenuTimer", {
                bubbles: true
            });
        },

        renderUI: function () {
            var bb = this.get("boundingBox");

            bb.on("clickoutside", this.clickOutside, this);
            bb.on("click", this.menuClick, this);
            bb.on("mouseenter", this.cancelMenuTimer, this);
            bb.on("mouseleave", this.startMenuHideTimer, this);
        },

        bindUI: function () {
            this.on("*:click", function (e) {                                   // @hack in order for event to be bubbled up
                //Y.log("fix");
                }, this);
        },

        hide: function () {
            Y.Wegas.Menu.superclass.hide.call(this);
        },
        // *** Public methods *** //
        /**
         *
         *  Displays the menu next to the provided node and add mouseenter and
         *  mouseleave callbacks to the node
         *
         * @method attachTo
         */

        attachTo: function (node) {

            //node.on("mouseenter", this.show, this);
            //node.on("mouseleave", this.hide, this);
            this.currentNode = node;

            this.set("align", {
                node: node,
                points: this.get("points")
            });

            this.cancelMenuTimer();
            this.show();
        // console.log("attachTo", this.get("contentBox").one("button").getHTML());
        },

        // *** Private methods *** //
        menuClick: function () {
            this.hide();
            this.fire("menuClick");
        },

        clickOutside: function (e) {
            if (this.currentNode !== e.target) {
                this.hide();
            }
        },

        startMenuHideTimer: function (fireEvent) {
            //console.log("startMenuHideTimer",this.get("contentBox").one("button").getHTML());
            this.cancelMenuTimer();
            this.timer = Y.later(500, this, this.hide);

            if (!!fireEvent) {
                this.fire("timerStarted");
            }
        },
        cancelMenuTimer: function () {
            //console.log("cancelMenuTimer", this.get("contentBox").one("button").getHTML());
            if (this.timer) {
                this.timer.cancel();
            }
            this.fire("timerCanceled");
        }
    }, {
        ATTRS: {
            points: {
                value: [ "tl", "bl" ]
            },
            constrain: {
                value: true
            },
            zIndex: {
                value: 25
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
});


