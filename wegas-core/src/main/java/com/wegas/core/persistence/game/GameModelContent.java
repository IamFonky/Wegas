/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.persistence.game;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.JsonView;
import com.wegas.core.merge.annotations.WegasEntityProperty;
import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.variable.ModelScoped;
import com.wegas.core.rest.util.Views;
import com.wegas.core.security.util.WegasPermission;
import java.io.Serializable;
import java.util.Collection;
import java.util.Objects;
import javax.persistence.*;

/**
 *
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Entity

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "@class")
@Table(indexes = {
    @Index(columnList = "clientscriptlibrary_gamemodelid"),
    @Index(columnList = "scriptlibrary_gamemodelid"),
    @Index(columnList = "csslibrary_gamemodelid"),
    @Index(columnList = "csslibrary_gamemodelid, scriptlibrary_gamemodelid, clientscriptlibrary_gamemodelid, contentKey", unique = true)
})
public class GameModelContent extends AbstractEntity implements Serializable, ModelScoped {

    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue
    @JsonView(Views.IndexI.class)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "csslibrary_gamemodelid")
    @JsonIgnore
    private GameModel csslibrary_GameModel;

    @ManyToOne
    @JoinColumn(name = "scriptlibrary_gamemodelid")
    @JsonIgnore
    private GameModel scriptlibrary_GameModel;

    @ManyToOne
    @JoinColumn(name = "clientscriptlibrary_gamemodelid")
    @JsonIgnore
    private GameModel clientscriptlibrary_GameModel;

    @WegasEntityProperty
    private String contentKey;

    /**
     *
     */
    @WegasEntityProperty
    private String contentType;
    /**
     *
     */
    @Lob
    @Basic(optional = false, fetch = FetchType.EAGER) // CARE, lazy fetch on Basics has some trouble.
    //@Column(columnDefinition = "text")
    //@JsonView({Views.Export.class})
    @WegasEntityProperty
    private String content = "";

    @Enumerated(value = EnumType.STRING)

    @Column(length = 24, columnDefinition = "character varying(24) default 'PRIVATE'::character varying")
    @WegasEntityProperty(protectionLevel = ProtectionLevel.ALL)
    private Visibility visibility = Visibility.PRIVATE;

    /**
     *
     */
    public GameModelContent() {
    }

    /**
     *
     * @param key
     * @param content
     * @param contentType
     */
    public GameModelContent(String key, String content, String contentType) {
        this.contentKey = key;
        this.content = content;
        this.contentType = contentType;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final GameModelContent other = (GameModelContent) obj;
        if (!Objects.equals(this.contentKey, other.contentKey)) {
            return false;
        }
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        if (!Objects.equals(this.csslibrary_GameModel, other.csslibrary_GameModel)) {
            return false;
        }
        if (!Objects.equals(this.scriptlibrary_GameModel, other.scriptlibrary_GameModel)) {
            return false;
        }
        if (!Objects.equals(this.clientscriptlibrary_GameModel, other.clientscriptlibrary_GameModel)) {
            return false;
        }
        return true;
    }

    @JsonIgnore
    public GameModel getClientscriptlibrary_GameModel() {
        return clientscriptlibrary_GameModel;
    }

    @JsonIgnore
    public void setClientscriptlibrary_GameModel(GameModel clientscriptlibrary_GameModel) {
        this.clientscriptlibrary_GameModel = clientscriptlibrary_GameModel;
    }

    /**
     * @return the contentType
     */
    public String getContentType() {
        return contentType;
    }

    /**
     * @param contentType the contentType to set
     */
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    /**
     * @return the content
     */
    public String getContent() {
        return content;
    }

    /**
     * @param content the content to set
     */
    public void setContent(String content) {
        this.content = content;
    }

    @JsonIgnore
    public GameModel getCsslibrary_GameModel() {
        return csslibrary_GameModel;
    }

    @JsonIgnore
    public void setCsslibrary_GameModel(GameModel csslibrary_GameModel) {
        this.csslibrary_GameModel = csslibrary_GameModel;
    }

    /**
     * @return the id
     */
    public Long getId() {
        return id;
    }

    /**
     * @param id the id to set
     */
    public void setId(Long id) {
        this.id = id;
    }

    @JsonIgnore
    public String getContentKey() {
        return contentKey;
    }

    @JsonIgnore
    public void setContentKey(String contentKey) {
        this.contentKey = contentKey;
    }

    @JsonIgnore
    public GameModel getScriptlibrary_GameModel() {
        return scriptlibrary_GameModel;
    }

    @JsonIgnore
    public void setScriptlibrary_GameModel(GameModel scriptlibrary_GameModel) {
        this.scriptlibrary_GameModel = scriptlibrary_GameModel;
    }

    @Override
    public Visibility getVisibility() {
        return this.visibility;
    }

    @Override
    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    @JsonIgnore
    private GameModel getGameModel() {
        if (this.clientscriptlibrary_GameModel != null) {
            return clientscriptlibrary_GameModel;
        } else if (this.scriptlibrary_GameModel != null) {
            return scriptlibrary_GameModel;
        } else {
            return csslibrary_GameModel;
        }
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 29 * hash + Objects.hashCode(this.id);
        hash = 29 * hash + Objects.hashCode(csslibrary_GameModel);
        hash = 29 * hash + Objects.hashCode(scriptlibrary_GameModel);
        hash = 29 * hash + Objects.hashCode(clientscriptlibrary_GameModel);
        hash = 29 * hash + Objects.hashCode(this.contentKey);
        return hash;
    }

    @Override
    public Collection<WegasPermission> getRequieredReadPermission() {
        return this.getGameModel().getRequieredReadPermission();
    }

    @Override
    public Collection<WegasPermission> getRequieredUpdatePermission() {
        return this.getGameModel().getRequieredUpdatePermission();
    }

    @Override
    public boolean isProtected() {
        return this.getGameModel().isProtected();
    }

    @Override
    public Visibility getInheritedVisibility() {
        return Visibility.INHERITED;
    }
}
