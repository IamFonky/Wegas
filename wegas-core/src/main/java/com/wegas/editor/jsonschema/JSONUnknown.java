/**
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2020 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.editor.jsonschema;

public final class JSONUnknown extends JSONType {

    public JSONUnknown() {
        super(false);
    }
    
    @Override
    public String getType() {
        return null;
    }

}