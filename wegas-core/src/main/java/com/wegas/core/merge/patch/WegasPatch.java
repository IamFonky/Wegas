/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.merge.patch;

import com.wegas.core.IndentLogger;
import com.wegas.core.exception.client.WegasConflictException;
import com.wegas.core.merge.utils.LifecycleCollector;
import com.wegas.core.merge.utils.WegasCallback;
import com.wegas.core.persistence.Mergeable;
import com.wegas.core.persistence.game.GameModel;
import com.wegas.core.persistence.variable.ModelScoped;
import com.wegas.core.persistence.variable.ModelScoped.ProtectionLevel;
import com.wegas.core.persistence.variable.ModelScoped.Visibility;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.LoggerFactory;

/**
 *
 * @author maxence
 */
public abstract class WegasPatch {

    protected final static IndentLogger logger = new IndentLogger(LoggerFactory.getLogger(WegasPatch.class));

    /**
     * Represent the patch mode
     */
    public static enum PatchMode {
        /**
         * object is to be created
         */
        CREATE,
        /**
         * object is to be deleted
         */
        DELETE,
        /**
         * object is to be updated, but only if the change doesn't overwrite a user change
         */
        UPDATE,
        /**
         * object is to be update
         */
        OVERRIDE,
        /**
         * Nothing to do (e.g. deleting a non existing object)
         */
        SKIP
    }

    /**
     * Id which identify the patch
     */
    protected Object identifier;

    /**
     * Patch order allows to apply patches in a defined order
     */
    protected Integer order;

    /**
     * getter get the value to patch
     */
    protected Method getter;

    /**
     * setter to set the new patched value
     */
    protected Method setter;

    /**
     * Some
     */
    protected WegasCallback fieldCallback;

    protected final ProtectionLevel protectionLevel;

    protected boolean ignoreNull;
    protected boolean sameEntityOnly;
    protected boolean initOnly;
    protected boolean recursive;

    protected WegasPatch(Object identifier, Integer order,
            Method getter, Method setter,
            WegasCallback fieldCallback,
            boolean ignoreNull, boolean sameEntityOnly,
            boolean initOnly, boolean recursive,
            ProtectionLevel protectionLevel) {
        this.identifier = identifier;
        this.order = order;
        this.getter = getter;
        this.setter = setter;
        this.fieldCallback = fieldCallback;
        this.ignoreNull = ignoreNull;
        this.sameEntityOnly = sameEntityOnly;
        this.initOnly = initOnly;
        this.recursive = recursive;
        this.protectionLevel = protectionLevel;
    }

    /**
     * Get all callbacks to take into account for this patch (entity + entity super classed + field + user callbacks)
     *
     * @param userCallback callback specific to patch
     *
     * @return list of all callback to call
     */
    protected List<WegasCallback> getCallbacks(WegasCallback userCallback) {
        ArrayList<WegasCallback> cbs = new ArrayList<>();
        if (fieldCallback != null) {
            cbs.add(this.fieldCallback);
        }
        if (userCallback != null) {
            cbs.add(userCallback);
        }
        return cbs;
    }

    /**
     * Test sameEntityOnly condition
     *
     * @param target    entity to patch
     * @param reference entity which represent the new value
     *
     * @return whether or not this patch should be applied on target
     */
    protected boolean shouldApplyPatch(Mergeable target, Mergeable reference) {
        return (!sameEntityOnly || target.equals(reference));
    }

    public Object getIdentifier() {
        return identifier;
    }

    public void setIdentifier(Object identifier) {
        this.identifier = identifier;
    }

    public Integer getOrder() {
        return order;
    }

    public void setOrder(Integer order) {
        this.order = order;
    }

    public WegasCallback getUserCallback() {
        return fieldCallback;
    }

    public void setUserCallback(WegasCallback userCallback) {
        this.fieldCallback = userCallback;
    }

    public void apply(GameModel gameModel, Mergeable target) {
        this.apply(gameModel, target, null, PatchMode.UPDATE, null, null, null, false);
    }

    /**
     * Like apply but ignore visiblity related restrictions
     *
     * @param gameModel
     * @param target
     */
    public void applyForce(GameModel gameModel, Mergeable target) {
        this.apply(gameModel, target, null, PatchMode.UPDATE, null, null, null, true);
    }

    protected abstract LifecycleCollector apply(GameModel targetGameModel, Object target, WegasCallback callback, PatchMode parentMode, Visibility visibility, LifecycleCollector collector, Integer numPass, boolean bypassVisibility);

    /**
     * Guess current mode according to protectionLevel, current visibility, and parent mode and visibility
     *
     * @param inheritedVisibility visibility of parent
     * @param visibility          optional current visibility
     *
     * @return current mode OVERRIDE if visibility equals INTERNAL or PROTECTED or if parent mode is OVERRIDE and the parent child link allow to cascade OVERRIDE
     *         , UPDATE in all other case
     */
    protected PatchMode updateOrOverride(Visibility inheritedVisibility, Visibility visibility) {
        logger.trace("override ? (inheritedV: {}, ownVisibility: {}; protection: {}", inheritedVisibility, visibility, protectionLevel);
        Visibility eVisibility = visibility != null ? visibility : inheritedVisibility;

        switch (protectionLevel) {
            case CASCADED:
                logger.error("CASCADED SHOULD HAVE BEEN REPLACED BY PARENT ENTITY ONE");
            case PROTECTED:
                if (eVisibility == Visibility.INTERNAL || eVisibility == Visibility.PROTECTED) {
                    return PatchMode.OVERRIDE;
                }
                break;
            case INTERNAL:
                if (eVisibility == Visibility.INTERNAL) {
                    return PatchMode.OVERRIDE;
                }
                break;
            case ALL:
                return PatchMode.OVERRIDE;
        }

        return PatchMode.UPDATE;
    }

    /**
     * Determine the patch mode according to concerned entities and visibilities
     *
     * @param target              object to patch
     * @param from                initial value reference
     * @param to                  final value reference
     * @param parentMode          parent PatchMode
     * @param inheritedVisibility parent visibility
     * @param visibility          current visibility
     * @param bypassVisibility    if true, do not skip private
     *
     * @return
     */
    protected PatchMode getPatchMode(Object target, Object from, Object to, PatchMode parentMode, Visibility inheritedVisibility, Visibility visibility, boolean bypassVisibility) {
        PatchMode mode;

        logger.info("Get MODE: target: {}; from: {}; to: {}; parentMode: {}; iV: {}; v: {}", target, from, to, parentMode, inheritedVisibility, visibility);
        /* 
         * Determine patch mode
         */
        if (PatchMode.DELETE.equals(parentMode)) {
            // delete is delete, always.
            mode = PatchMode.DELETE;
        } else if (target == null) {
            // No target
            if (to != null) {
                // CREATE
                mode = PatchMode.CREATE;

                // but skip PRIVATE visibility
                // Allow to
                if (!bypassVisibility && to instanceof ModelScoped) {
                    if (Visibility.PRIVATE.equals(((ModelScoped) to).getVisibility())) {
                        mode = PatchMode.SKIP;
                    }
                }
            } else {
                // should be DELETE but target does not exists
                mode = PatchMode.SKIP;
            }
        } else {
            if (from != null) {
                if (to == null) {
                    // from not null to null -> DELETE
                    mode = PatchMode.DELETE;
                } else {
                    // from not null to not null
                    if (to instanceof ModelScoped && from instanceof ModelScoped) {

                        if (bypassVisibility || from.equals(target)) {
                            // same entity -> Update or override
                            mode = updateOrOverride(inheritedVisibility, visibility);
                        } else {
                            Visibility fromScope = ((ModelScoped) from).getVisibility();
                            Visibility toScope = ((ModelScoped) to).getVisibility();

                            // cross gameModel entities
                            if (toScope.equals(Visibility.PRIVATE)) {
                                // change from * to PRIVATE -> DELETE
                                mode = PatchMode.DELETE;
                            } else if (fromScope.equals(Visibility.PRIVATE)) {
                                // change from PRIVATE TO not private -> CREATE
                                mode = PatchMode.CREATE;
                            } else if (toScope.equals(fromScope)) {
                                // no change -> UPDATE
                                mode = updateOrOverride(inheritedVisibility, visibility);
                            } else {
                                // change from not private to not private
                                mode = PatchMode.OVERRIDE;// really ?
                            }
                        }
                    } else {
                        mode = updateOrOverride(inheritedVisibility, visibility);
                    }
                }
            } else {
                //should create but already exists !
                throw new WegasConflictException();
            }
        }

        return mode;
    }

    @Override
    public String toString() {
        return this.print(0).toString();
    }

    /**
     * Pretty printer
     *
     * @param ident
     *
     * @return
     */
    protected StringBuilder print(int ident) {
        StringBuilder sb = new StringBuilder();
        newLine(sb, ident);
        sb.append("Patch ").append(this.getClass().getSimpleName()).append(" ").append(identifier);
        if (fieldCallback != null) {
            newLine(sb, ident + 1);
            sb.append("FieldCallback: ").append(fieldCallback);
        }

        return sb;
    }

    protected void indent(StringBuilder sb, int ident) {
        for (int i = 0; i < ident; i++) {
            sb.append("  ");
        }
    }

    protected void newLine(StringBuilder sb, int ident) {
        sb.append("\n");
        this.indent(sb, ident);
    }

}
