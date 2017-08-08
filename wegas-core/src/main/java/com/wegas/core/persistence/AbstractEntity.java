/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.persistence;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.wegas.core.persistence.game.Game;
import com.wegas.core.persistence.game.GameModel;
import com.wegas.core.persistence.game.Player;
import com.wegas.core.persistence.game.Team;
import com.wegas.core.persistence.variable.VariableDescriptor;
import com.wegas.core.persistence.variable.VariableInstance;
import com.wegas.core.rest.util.JacksonMapperProvider;
import com.wegas.core.rest.util.Views;
import java.io.IOException;
import java.io.Serializable;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.JsonTypeName;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wegas.core.persistence.merge.annotations.WegasEntityProperty;
import com.wegas.core.persistence.merge.patch.WegasEntityPatch;
import com.wegas.core.persistence.variable.Beanjection;
import javax.persistence.MappedSuperclass;
import javax.persistence.Transient;
import org.eclipse.persistence.annotations.Cache;
import org.eclipse.persistence.annotations.CacheCoordinationType;
import org.slf4j.LoggerFactory;

/**
 *
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "@class")
@JsonSubTypes(value = {
    @JsonSubTypes.Type(name = "GameModel", value = GameModel.class),
    @JsonSubTypes.Type(name = "Game", value = Game.class),
    @JsonSubTypes.Type(name = "Player", value = Player.class),
    @JsonSubTypes.Type(name = "Team", value = Team.class),
    @JsonSubTypes.Type(name = "VariableDescriptor", value = VariableDescriptor.class),
    @JsonSubTypes.Type(name = "VariableInstance", value = VariableInstance.class)
})
/**
 * Default EclipseLink coodinationType (SEND_OBJECT_CHANGE) leads to buggy coordination for some object (eg ChoiceDescriptor and result).
 * INVALIDATE_CHANGED_OBJECTS must be set to fix this problem.
 */
@MappedSuperclass
@Cache(coordinationType = CacheCoordinationType.INVALIDATE_CHANGED_OBJECTS)
public abstract class AbstractEntity implements Serializable, Cloneable {

    private static final long serialVersionUID = -2538440276749623728L;

    static final private org.slf4j.Logger logger = LoggerFactory.getLogger(AbstractEntity.class);

    /**
     * Get entity id
     *
     * @return entity id
     */
    abstract public Long getId();


    /*
    @Id
    private Long oid;

    public Long getOid() {
        return oid;
    }

    public void setOid(Long oid) {
        this.oid = oid;
    }*/
    @Transient
    @WegasEntityProperty(initOnly = true)
    private String safeId;

    /**
     * Get entity cross-gamemodel identifier
     *
     * @return
     */
    public String getSafeId() {
        if (this.safeId != null) {
            return this.safeId;
        } else if (this.getId() != null) {
            return this.getId().toString();
        } else {
            return null;
        }
    }

    public void setSafeId(String safeId) {
        this.safeId = safeId;
    }

    /**
     * Merge other into this
     *
     * @param other the entity to copy values from
     */
    public abstract void __merge(AbstractEntity other);

    public final void merge(AbstractEntity other) {
        WegasEntityPatch wegasEntityPatch = new WegasEntityPatch(this, other, false);
        wegasEntityPatch.apply(this);
    }

    /**
     * this hashCode is base on id and class hashcode
     *
     * @return a hashCode value for this entity
     *
     */
    @Override
    public int hashCode() {
        int hash = 17;
        hash = 31 * hash + (getId() != null ? getId().hashCode() : 0);
        hash = 31 * hash + getClass().hashCode();
        return hash;
    }

    /**
     * Determine if the given entity equals this. To be equal, both objects must
     * have the id and being instances of the same class
     *
     * @param object entity to compare to
     *
     * @return true if object equals this, false otherwise
     */
    @Override
    public boolean equals(Object object) {
        if (object == this) {
            return true;
        }

        if (object == null) {
            return false;
        }

        if (this.getClass() != object.getClass()) {                             // First, the two object shall be instances of the same class
            return false;
        }

        if (object instanceof AbstractEntity) {                                 // Then, object shall be an AbstractEntity
            AbstractEntity other = (AbstractEntity) object;
            return this.getId() != null && this.getId().equals(other.getId());
        }
        return false;
    }

    /**
     * Make a copy of this entity
     *
     * @return the new copied entity
     */
    @Override
    public AbstractEntity clone() {
        AbstractEntity ae = null;
        try {
            if (this.getId() != null) {
                ae = this.getClass().newInstance();
                ae.merge(this);
            } else {
                // no need to clone entity without id
                ae = this;
            }
        } catch (InstantiationException | IllegalAccessException ex) {
            logger.error("Error during clone", ex);
        }
        return ae;
    }

    /**
     * Duplicate an entity by using Jackson Mapper and provided view
     *
     * @param view
     *
     * @return copy of this
     *
     * @throws IOException
     */
    public AbstractEntity duplicate(Class view) throws IOException {
        //AnonymousEntity ae = (AnonymousEntity)super.clone();
        //AbstractEntity ae = (AbstractEntity) SerializationUtils.clone(this);
        //ae.setId(null);
        ObjectMapper mapper = JacksonMapperProvider.getMapper();                // Retrieve a jackson mapper instance
        String serialized = mapper.writerWithView(view).
                writeValueAsString(this);                                       // Serialize the entity

        return mapper.readValue(serialized, AbstractEntity.class);              // and deserialize it
    }

    /**
     * Same as duplicate(Views.Export)
     *
     * @return copy of this
     *
     * @throws IOException
     */
    public AbstractEntity duplicate() throws IOException {
        return this.duplicate(Views.Export.class);
    }

    /**
     * Serialize to JSON
     *
     * @return JSON String representing this
     *
     * @throws IOException
     */
    public String toJson() throws IOException {
        ObjectMapper mapper = JacksonMapperProvider.getMapper();
        return mapper.writeValueAsString(this);
    }

    /**
     * Serialize to JSON with view
     *
     * @param view the view to use to export this
     *
     * @return JSON String representing this
     *
     * @throws IOException
     */
    public String toJson(Class view) throws IOException {
        ObjectMapper mapper = JacksonMapperProvider.getMapper();
        return mapper.writerWithView(view).writeValueAsString(this);
    }

    /**
     * String representation of this
     *
     * @return a String which contains the class name + id
     */
    @Override
    public String toString() {
        return this.getClass().getSimpleName() + "( " + getId() + " )";
    }

    /**
     * Default behaviour is to do nothing
     * <p>
     * Overriding this method may helps to maintain cache integrity after
     * cascaded entity deletion
     *
     * @param beans facade wrapper
     */
    public void updateCacheOnDelete(Beanjection beans) {
    }

    @JsonIgnore
    public String getJSONClassName() {
        JsonTypeName annotation = this.getClass().getAnnotation(JsonTypeName.class);

        if (annotation != null) {
            return annotation.value();
        } else {
            return this.getClass().getSimpleName();
        }
    }
}
