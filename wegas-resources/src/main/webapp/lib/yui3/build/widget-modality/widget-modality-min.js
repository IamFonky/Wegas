/*
YUI 3.8.0 (build 5744)
Copyright 2012 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/
YUI.add("widget-modality",function(e,t){function y(e){}var n="widget",r="renderUI",i="bindUI",s="syncUI",o="boundingBox",u="contentBox",a="visible",f="zIndex",l="Change",c=e.Lang.isBoolean,h=e.ClassNameManager.getClassName,p="maskShow",d="maskHide",v="clickoutside",m="focusoutside",g=function(){
/*! IS_POSITION_FIXED_SUPPORTED - Juriy Zaytsev (kangax) - http://yura.thinkweb2.com/cft/ */
;var t=e.config.doc,n=null,r,i;return t.createElement&&(r=t.createElement("div"),r&&r.style&&(r.style.position="fixed",r.style.top="10px",i=t.body,i&&i.appendChild&&i.removeChild&&(i.appendChild(r),n=r.offsetTop===10,i.removeChild(r)))),n}(),b="modal",w="mask",E={modal:h(n,b),mask:h(n,w)};y.ATTRS={maskNode:{getter:"_getMaskNode",readOnly:!0},modal:{value:!1,validator:c},focusOn:{valueFn:function(){return[{eventName:v},{eventName:m}]},validator:e.Lang.isArray}},y.CLASSES=E,y._GET_MASK=function(){var t=e.one("."+E.mask),n=e.one("win");return t?t:(t=e.Node.create("<div></div>").addClass(E.mask),g?t.setStyles({position:"fixed",width:"100%",height:"100%",top:"0",left:"0",display:"block"}):t.setStyles({position:"absolute",width:n.get("winWidth")+"px",height:n.get("winHeight")+"px",top:"0",left:"0",display:"block"}),t)},y.STACK=[],y.prototype={initializer:function(){e.after(this._renderUIModal,this,r),e.after(this._syncUIModal,this,s),e.after(this._bindUIModal,this,i)},destructor:function(){this._uiSetHostVisibleModal(!1)},_uiHandlesModal:null,_renderUIModal:function(){var e=this.get(o);this._repositionMask(this),e.addClass(E.modal)},_bindUIModal:function(){this.after(a+l,this._afterHostVisibleChangeModal),this.after(f+l,this._afterHostZIndexChangeModal),this.after("focusOnChange",this._afterFocusOnChange),(!g||e.UA.ios&&e.UA.ios<5||e.UA.android&&e.UA.android<3)&&e.one("win").on("scroll",this._resyncMask,this)},_syncUIModal:function(){this._uiSetHostVisibleModal(this.get(a)),this._uiSetHostZIndexModal(this.get(f))},_focus:function(e){var t=this.get(o),n=t.get("tabIndex");t.set("tabIndex",n>=0?n:0),this.focus()},_blur:function(){this.blur()},_getMaskNode:function(){return y._GET_MASK()},_uiSetHostVisibleModal:function(t){var n=y.STACK,r=this.get("maskNode"),i=this.get("modal"),s,o;t?(e.Array.each(n,function(e){e._detachUIHandlesModal(),e._blur()}),n.unshift(this),this._repositionMask(this),this._uiSetHostZIndexModal(this.get(f)),i&&(r.show(),e.later(1,this,"_attachUIHandlesModal"),this._focus())):(o=e.Array.indexOf(n,this),o>=0&&n.splice(o,1),this._detachUIHandlesModal(),this._blur(),n.length?(s=n[0],this._repositionMask(s),s._uiSetHostZIndexModal(s.get(f)),s.get("modal")&&(e.later(1,s,"_attachUIHandlesModal"),s._focus())):r.getStyle("display")==="block"&&r.hide())},_uiSetHostZIndexModal:function(e){this.get("modal")&&this.get("maskNode").setStyle(f,e||0)},_attachUIHandlesModal:function(){if(this._uiHandlesModal||y.STACK[0]!==this)return;var t=this.get(o),n=this.get("maskNode"),r=this.get("focusOn"),i=e.bind(this._focus,this),s=[],u,a,f;for(u=0,a=r.length;u<a;u++)f={},f.node=r[u].node,f.ev=r[u].eventName,f.keyCode=r[u].keyCode,!f.node&&!f.keyCode&&f.ev?s.push(t.on(f.ev,i)):f.node&&!f.keyCode&&f.ev?s.push(f.node.on(f.ev,i)):f.node&&f.keyCode&&f.ev?s.push(f.node.on(f.ev,i,f.keyCode)):e.Log('focusOn ATTR Error: The event with name "'+f.ev+'" could not be attached.');g||s.push(e.one("win").on("scroll",e.bind(function(e){n.setStyle("top",n.get("docScrollY"))},this))),this._uiHandlesModal=s},_detachUIHandlesModal:function(){e.each(this._uiHandlesModal,function(e){e.detach()}),this._uiHandlesModal=null},_afterHostVisibleChangeModal:function(e){this._uiSetHostVisibleModal(e.newVal)},_afterHostZIndexChangeModal:function(e){this._uiSetHostZIndexModal(e.newVal)},isNested:function(){var e=y.STACK.length,t=e>1?!0:!1;return t},_repositionMask:function(t){var n=this.get("modal"),r=t.get("modal"),i=this.get("maskNode"),s,u;if(n&&!r)i.remove(),this.fire(d);else if(!n&&r||n&&r)i.remove(),this.fire(d),s=t.get(o),u=s.get("parentNode")||e.one("body"),u.insert(i,u.get("firstChild")),this.fire(p)},_resyncMask:function(e){var t=e.currentTarget,n=t.get("docScrollX"),r=t.get("docScrollY"),i=t.get("innerWidth")||t.get("winWidth"),s=t.get("innerHeight")||t.get("winHeight"),o=this.get("maskNode");o.setStyles({top:r+"px",left:n+"px",width:i+"px",height:s+"px"})},_afterFocusOnChange:function(e){this._detachUIHandlesModal(),this.get(a)&&this._attachUIHandlesModal()}},e.WidgetModality=y},"3.8.0",{requires:["base-build","event-outside","widget"],skinnable:!0});
