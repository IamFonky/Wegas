/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.persistence;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.wegas.core.security.util.WegasPermission;
import java.util.Collection;

/**
 *
 * @author maxence
 */
public interface WithPermission {

    /**
     * Comma-separated list of permission, only one is required to grant the permission
     * <p>
     * <ul>
     * <li>null means no special permission required</li>
     * <li>empty string "" means completely forbidden</li>
     * </ul>
     *
     * @return
     */
    @JsonIgnore
    Collection<WegasPermission> getRequieredCreatePermission();

    @JsonIgnore
    Collection<WegasPermission> getRequieredDeletePermission();

    @JsonIgnore
    Collection<WegasPermission> getRequieredReadPermission();

    @JsonIgnore
    Collection<WegasPermission> getRequieredUpdatePermission();

}
