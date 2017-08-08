/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.event.internal.lifecycle;

import com.wegas.core.persistence.AbstractEntity;

/**
 * LifeCycleEvent, fired once entity has been created
 * @author Cyril Junod (cyril.junod at gmail.com)
 */
public class EntityCreated<T extends AbstractEntity> extends LifeCycleEvent<T> {

    public EntityCreated(T entity) {
        super(entity, Type.POSTPERSIST);
    }
}
