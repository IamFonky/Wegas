/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.persistence.game;

import com.fasterxml.jackson.annotation.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.wegas.core.Helper;
import com.wegas.core.jcr.page.Page;
import com.wegas.core.jcr.page.Pages;
import com.wegas.core.persistence.NamedEntity;
import com.wegas.core.persistence.variable.DescriptorListI;
import com.wegas.core.persistence.variable.VariableDescriptor;
import com.wegas.core.persistence.variable.VariableInstance;
import com.wegas.core.rest.util.Views;
import com.wegas.core.security.persistence.User;

import javax.jcr.RepositoryException;
import javax.persistence.*;
import java.util.*;
import java.util.Map.Entry;
import javax.validation.constraints.Pattern;
import org.apache.shiro.SecurityUtils;
import com.wegas.core.persistence.InstanceOwner;
import com.wegas.core.merge.annotations.WegasEntityProperty;

/**
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Entity
//@Table(uniqueConstraints =
//        @UniqueConstraint(columnNames = "name"))
@JsonIgnoreProperties(ignoreUnknown = true)
@NamedQueries({
    @NamedQuery(name = "GameModel.findByTypeAndStatus", query = "SELECT a FROM GameModel a WHERE a.status = :status AND a.type = :type ORDER BY a.name ASC"),
    @NamedQuery(name = "GameModel.findDistinctChildrenLabels", query = "SELECT DISTINCT(child.label) FROM VariableDescriptor child WHERE child.rootGameModel.id = :containerId"),
    @NamedQuery(name = "GameModel.findByName", query = "SELECT a FROM GameModel a WHERE a.name = :name AND a.type = com.wegas.core.persistence.game.GameModel.GmType.SCENARIO"),
    @NamedQuery(name = "GameModel.findAll", query = "SELECT gm FROM GameModel gm WHERE gm.type = com.wegas.core.persistence.game.GameModel.GmType.SCENARIO")
})
public class GameModel extends NamedEntity implements DescriptorListI<VariableDescriptor>, InstanceOwner {

    private static final long serialVersionUID = 1L;

    @Transient
    private Boolean canView = null;
    @Transient
    private Boolean canEdit = null;
    @Transient
    private Boolean canInstantiate = null;
    @Transient
    private Boolean canDuplicate = null;

    /**
     *
     */
    @Id
    @Column(name = "gamemodelid")
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    @JsonView(Views.IndexI.class)
    private Long id;

    /**
     *
     */
    @Basic(optional = false)
    @Pattern(regexp = "^.*\\S+.*$", message = "GameModel name cannot be empty")// must at least contains one non-whitespace character
    @WegasEntityProperty(sameEntityOnly = true)
    private String name;

    /**
     *
     */
    @Lob
    //@Basic(fetch = FetchType.LAZY)
    @JsonView(Views.ExtendedI.class)
    @WegasEntityProperty(sameEntityOnly = true)
    private String description;

    /**
     *
     */
    @Enumerated(value = EnumType.STRING)
    
    @Column(length = 24, columnDefinition = "character varying(24) default 'LIVE'::character varying")
    private Status status = Status.LIVE;

    @Enumerated(value = EnumType.STRING)
    
    @Column(length = 24, columnDefinition = "character varying(24) default 'LIVE'::character varying")
    private GmType type = GmType.SCENARIO;

    /**
     *
     */
    @Lob
    //@Basic(fetch = FetchType.LAZY)
    @JsonView(Views.ExtendedI.class)
    @WegasEntityProperty(sameEntityOnly = true)
    private String comments;

    /**
     *
     */
    @Temporal(TemporalType.TIMESTAMP)
    @Column(columnDefinition = "timestamp with time zone")
    private Date createdTime = new Date();

    /**
     *
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    private User createdBy;

    /**
     *
     */
    @ManyToOne
    private GameModel reference;

    /**
     *
     */
    @OneToMany(mappedBy = "reference")
    private List<GameModel> implementations = new ArrayList<>();

    /**
     *
     */
    @OneToMany(mappedBy = "gameModel", cascade = {CascadeType.ALL}, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<VariableDescriptor> variableDescriptors = new ArrayList<>();

    /**
     * A list of Variable Descriptors that are at the root level of the
     * hierarchy (other VariableDescriptor can be placed inside of a
     * ListDescriptor's items List).
     */
    @OneToMany(cascade = {CascadeType.ALL}, fetch = FetchType.LAZY)
    @JoinColumn(name = "rootgamemodel_id")
    @OrderColumn
    @JsonView(Views.Export.class)
    
    @WegasEntityProperty(includeByDefault = false, callback = DescriptorListI.UpdateChild.class)
    private List<VariableDescriptor> childVariableDescriptors = new ArrayList<>();

    /**
     * All gameModelScoped instances
     */
    @JsonIgnore
    @OneToMany(mappedBy = "gameModel", cascade = CascadeType.ALL)
    private List<VariableInstance> privateInstances = new ArrayList<>();

    /**
     *
     */
    @OneToMany(mappedBy = "gameModel", cascade = {CascadeType.ALL}, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    @JsonIgnore
    //@JsonView(Views.ExportI.class)
    private List<Game> games = new ArrayList<>();

    /**
     * Holds all the scripts contained in current game model.
     */
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "scriptlibrary_gamemodelid")
    @JsonView({Views.Export.class})
    @WegasEntityProperty(includeByDefault = false)
    private List<GameModelContent> scriptLibrary = new ArrayList<>();

    /**
     *
     */
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "csslibrary_gamemodelid")
    @JsonView({Views.Export.class})
    @WegasEntityProperty(includeByDefault = false)
    private List<GameModelContent> cssLibrary = new ArrayList<>();

    /**
     *
     */
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "clientscriptlibrary_gamemodelid")
    @JsonView({Views.Export.class})
    @WegasEntityProperty(includeByDefault = false)
    private List<GameModelContent> clientScriptLibrary = new ArrayList<>();

    /**
     *
     */
    @Embedded
    @WegasEntityProperty
    private GameModelProperties properties = new GameModelProperties();

    /**
     * Holds a reference to the pages, used to serialize page and game model at
     * the same time.
     */
    @Transient
    @JsonView({Views.Export.class})
    @WegasEntityProperty(includeByDefault = false)
    private Map<String, JsonNode> pages;

    /**
     *
     */
    public GameModel() {
    }

    /**
     * @param name
     */
    public GameModel(String name) {
        this.name = name;
    }

    /**
     * @param pageMap
     *
     * @throws RepositoryException
     */
    @JsonCreator
    public GameModel(@JsonProperty("pages") JsonNode pageMap) throws RepositoryException {
        Map<String, JsonNode> map = new HashMap<>();
        if (pageMap == null) {
            return;
        }
        String curKey;
        Iterator<String> iterator = pageMap.fieldNames();
        while (iterator.hasNext()) {
            curKey = iterator.next();
            map.put(curKey, pageMap.get(curKey));
        }
        this.setPages(map);
    }

    /**
     *
     */
    public void propagateGameModel() {
        //this.variableDescriptors.clear();
        this.propagateGameModel(this);
    }

    public void addToVariableDescriptors(VariableDescriptor vd) {
        if (!this.getVariableDescriptors().contains(vd)) {
            this.getVariableDescriptors().add(vd);
            vd.setGameModel(this);
        }
    }

    public void addToChildVariableDescriptors(Integer index, VariableDescriptor vd) {
        if (index != null) {
            this.getChildVariableDescriptors().remove(vd);
            this.getChildVariableDescriptors().add(index, vd);
        } else {
            if (!this.getChildVariableDescriptors().contains(vd)) {
                this.getChildVariableDescriptors().add(vd);
            }
        }
        vd.setRootGameModel(this);
    }

    public void removeFromVariableDescriptors(VariableDescriptor vd) {
        this.getVariableDescriptors().remove(vd);
    }

    /**
     * @param list
     */
    private void propagateGameModel(final DescriptorListI<? extends VariableDescriptor> list) {
        for (VariableDescriptor vd : list.getItems()) {
            this.addToVariableDescriptors(vd);
            if (vd instanceof DescriptorListI) {
                this.propagateGameModel((DescriptorListI<? extends VariableDescriptor>) vd);
            }
        }
    }

    /**
     *
     */
    @PrePersist
    public void prePersist() {
        this.setCreatedTime(new Date());
    }

    /**
     * For serialization
     *
     * @return true if current user has view permission on this
     */
    @JsonView(Views.IndexI.class)
    public Boolean getCanView() {
        if (canView != null) {
            return canView;
        } else {
            // I DO NOT LIKE VERY MUCH USING SHIRO WITHIN ENTITIES...
            return SecurityUtils.getSubject().isPermitted("GameModel:View:gm" + this.id);
        }
    }

    /**
     * @return true if current user has edit permission on this
     */
    @JsonView(Views.IndexI.class)
    public Boolean getCanEdit() {
        if (canEdit != null) {
            return canEdit;
        } else {
            // I DO NOT LIKE VERY MUCH USING SHIRO WITHIN ENTITIES...
            return SecurityUtils.getSubject().isPermitted("GameModel:Edit:gm" + this.id);
        }
    }

    /**
     * @return true if current user has duplicate permission on this
     */
    @JsonView(Views.IndexI.class)
    public Boolean getCanDuplicate() {
        if (canDuplicate != null) {
            return canDuplicate;
        } else {
            // I DO NOT LIKE VERY MUCH USING SHIRO WITHIN ENTITIES...
            return SecurityUtils.getSubject().isPermitted("GameModel:Duplicate:gm" + this.id);
        }
    }

    /**
     * @return true if current user has instantiate permission on this
     */
    @JsonView(Views.IndexI.class)
    public Boolean getCanInstantiate() {
        if (canInstantiate != null) {
            return canInstantiate;
        } else {
            // I DO NOT LIKE VERY MUCH USING SHIRO WITHIN ENTITIES...
            return SecurityUtils.getSubject().isPermitted("GameModel:Instantiate:gm" + this.id);
        }
    }

    public void setCanView(Boolean canView) {
        this.canView = canView;
    }

    public void setCanEdit(Boolean canEdit) {
        this.canEdit = canEdit;
    }

    public void setCanInstantiate(Boolean canInstantiate) {
        this.canInstantiate = canInstantiate;
    }

    public void setCanDuplicate(Boolean canDuplicate) {
        this.canDuplicate = canDuplicate;
    }

    @Override
    public Long getId() {
        return id;
    }

    /**
     * @param id
     */
    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public void setName(String name) {
        this.name = name;
    }

    /**
     * @return Current GameModel's status
     */
    @JsonIgnore
    public Status getStatus() {
        return status;
    }

    /**
     * @param status status to set
     */
    @JsonIgnore
    public void setStatus(Status status) {
        this.status = status;
    }

    /**
     * @return all variable descriptors
     */
    @JsonIgnore
    public List<VariableDescriptor> getVariableDescriptors() {
        return variableDescriptors;
    }

    /**
     * @param variableDescriptors
     */
    public void setVariableDescriptors(List<VariableDescriptor> variableDescriptors) {
        this.variableDescriptors = new ArrayList<>();
        for (VariableDescriptor vd : variableDescriptors) {
            this.addToVariableDescriptors(vd);
        }
    }

    @Override
    public List<VariableInstance> getPrivateInstances() {
        return privateInstances;
    }

    @Override
    public List<VariableInstance> getAllInstances() {
        List<VariableInstance> instances = new ArrayList<>();
        instances.addAll(getPrivateInstances());
        for (Game g : getGames()) {
            instances.addAll(g.getAllInstances());
        }
        return instances;
    }

    public void setPrivateInstances(List<VariableInstance> privateInstances) {
        this.privateInstances = privateInstances;
    }

    /**
     * @return a list of Variable Descriptors that are at the root level of the
     *         hierarchy (other VariableDescriptor can be placed inside of a
     *         ListDescriptor's items List)
     */
    public List<VariableDescriptor> getChildVariableDescriptors() {
        return childVariableDescriptors;
    }

    /**
     * @param variableDescriptors
     */
    public void setChildVariableDescriptors(List<VariableDescriptor> variableDescriptors) {
        this.childVariableDescriptors = new ArrayList<>();
        this.variableDescriptors = new ArrayList<>();
        for (VariableDescriptor vd : variableDescriptors) {
            this.addItem(vd);
        }
    }

    @Override
    public void addItem(VariableDescriptor variableDescriptor) {
        this.addItem(null, variableDescriptor);
    }

    @Override
    public void addItem(Integer index, VariableDescriptor variableDescriptor) {
        this.addToVariableDescriptors(variableDescriptor);
        this.addToChildVariableDescriptors(index, variableDescriptor);
    }

    /**
     * @return the games
     */
    @JsonIgnore
    public List<Game> getGames() {
        return games;
    }

    /**
     * @param games the games to set
     */
    public void setGames(List<Game> games) {
        this.games = games;
        for (Game g : games) {
            g.setGameModel(this);
        }
    }

    /**
     * @param game
     */
    public void addGame(Game game) {
        this.getGames().add(game);
        game.setGameModel(this);
        //game.setGameModelId(this.getId());
    }

    /**
     * @return the scriptLibrary
     */
    @JsonIgnore
    public List<GameModelContent> getScriptLibraryList() {
        return scriptLibrary;
    }

    /**
     * @param scriptLibrary the scriptLibrary to set
     */
    @JsonIgnore
    public void setScriptLibraryList(List<GameModelContent> scriptLibrary) {
        this.scriptLibrary = scriptLibrary;
    }

    /**
     * @return all players from all teams and all games
     */
    @JsonIgnore
    @Override
    public List<Player> getPlayers() {
        List<Player> players = new ArrayList<>();
        for (Game g : this.getGames()) {
            players.addAll(g.getPlayers());
        }
        return players;
    }

    /**
     * @return the createdTime
     */
    public Date getCreatedTime() {
        return (createdTime != null ? new Date(createdTime.getTime()) : null);
    }

    /**
     * @param createdTime the createdTime to set
     */
    public void setCreatedTime(Date createdTime) {
        this.createdTime = createdTime != null ? new Date(createdTime.getTime()) : null;
    }

    /**
     * @return the properties
     */
    public GameModelProperties getProperties() {
        return this.properties;
    }

    /**
     * @param properties the properties to set
     */
    public void setProperties(GameModelProperties properties) {
        this.properties = properties;
    }

    @JsonIgnore
    public Map<String, Map<String, GameModelContent>> getLibraries() {
        Map<String, Map<String, GameModelContent>> libraries = new HashMap<>();

        libraries.put("Script", this.getScriptLibrary());
        libraries.put("ClientScript", this.getClientScriptLibrary());
        libraries.put("CSS", this.getCssLibrary());

        return libraries;
    }

    public void setLibraries(Map<String, Map<String, GameModelContent>> libraries) {
        this.setScriptLibrary(libraries.get("Script"));
        this.setClientScriptLibrary(libraries.get("ClientScript"));
        this.setCssLibrary(libraries.get("CSS"));
    }

    /**
     * @return the cssLibrary
     */
    @JsonIgnore
    public List<GameModelContent> getCssLibraryList() {
        return cssLibrary;
    }

    /**
     * @param cssLibrary the cssLibrary to set
     */
    @JsonIgnore
    public void setCssLibraryList(List<GameModelContent> cssLibrary) {
        this.cssLibrary = cssLibrary;
    }

    private Map<String, GameModelContent> getLibraryAsMap(List<GameModelContent> library) {
        Map<String, GameModelContent> map = new HashMap<>();
        for (GameModelContent gmc : library) {
            map.put(gmc.getContentKey(), gmc);
        }
        return map;
    }

    public Map<String, GameModelContent> getCssLibrary() {
        return getLibraryAsMap(cssLibrary);
    }

    public void setCssLibrary(Map<String, GameModelContent> library) {
        this.cssLibrary = new ArrayList<>();
        for (Entry<String, GameModelContent> entry : library.entrySet()) {
            String key = entry.getKey();
            GameModelContent gmc = entry.getValue();
            gmc.setCsslibrary_GameModel(this);
            gmc.setContentKey(key);
            cssLibrary.add(gmc);
        }
    }

    /**
     * @return the clientScriptLibrary
     */
    @JsonIgnore
    public List<GameModelContent> getClientScriptLibraryList() {
        return clientScriptLibrary;
    }

    public Map<String, GameModelContent> getScriptLibrary() {
        return getLibraryAsMap(scriptLibrary);
    }

    public Map<String, GameModelContent> getClientScriptLibrary() {
        return getLibraryAsMap(clientScriptLibrary);
    }

    public void setScriptLibrary(Map<String, GameModelContent> library) {
        this.scriptLibrary = new ArrayList<>();
        for (Entry<String, GameModelContent> entry : library.entrySet()) {
            String key = entry.getKey();
            GameModelContent gmc = entry.getValue();
            gmc.setScriptlibrary_GameModel(this);
            gmc.setContentKey(key);
            scriptLibrary.add(gmc);
        }
    }

    public void setClientScriptLibrary(Map<String, GameModelContent> library) {
        this.clientScriptLibrary = new ArrayList<>();
        for (Entry<String, GameModelContent> entry : library.entrySet()) {
            String key = entry.getKey();
            GameModelContent gmc = entry.getValue();
            gmc.setClientscriptlibrary_GameModel(this);
            gmc.setContentKey(key);
            clientScriptLibrary.add(gmc);
        }
    }

    /**
     * @param key
     *
     * @return the clientScript matching the key or null
     */
    public GameModelContent getClientScript(String key) {
        return this.getGameModelContent(clientScriptLibrary, key);
    }

    /**
     * @param key
     *
     * @return the clientScript matching the key or null
     */
    public GameModelContent getScript(String key) {
        return this.getGameModelContent(scriptLibrary, key);
    }

    /**
     * @param key
     *
     * @return the clientScript matching the key or null
     */
    public GameModelContent getCss(String key) {
        return this.getGameModelContent(cssLibrary, key);
    }

    public GameModelContent getGameModelContent(List<GameModelContent> list, String key) {
        for (GameModelContent gmc : list) {
            if (gmc.getContentKey().equals(key)) {
                return gmc;
            }
        }
        return null;
    }

    /**
     * @param clientScriptLibrary the clientScriptLibrary to set
     */
    @JsonIgnore
    public void setClientScriptLibraryList(List<GameModelContent> clientScriptLibrary) {
        this.clientScriptLibrary = clientScriptLibrary;
    }

    /**
     * @return the pages
     */
    public Map<String, JsonNode> getPages() {
        try (final Pages pagesDAO = new Pages(this.id)) {
            return pagesDAO.getPagesContent();
        } catch (RepositoryException ex) {
            return new HashMap<>();
        }
    }

    /**
     * @param pageMap
     */
    public final void setPages(Map<String, JsonNode> pageMap) {
        this.pages = pageMap;
        if (this.id != null) {
            this.storePages();
        }
    }

    @Override
    @JsonIgnore
    public List<VariableDescriptor> getItems() {
        return this.getChildVariableDescriptors();
    }

    @Override
    @JsonIgnore
    public void setItems(List<VariableDescriptor> items) {
        this.setChildVariableDescriptors(items);
    }

    @Override
    public int size() {
        return this.getChildVariableDescriptors().size();
    }

    @Override
    public VariableDescriptor item(int index) {
        return this.getChildVariableDescriptors().get(index);
    }

    @Override
    public boolean remove(VariableDescriptor item) {
        item.setRootGameModel(null);
        this.getVariableDescriptors().remove(item);
        return this.getChildVariableDescriptors().remove(item);
    }

    @PostPersist
    private void storePages() {
        if (this.pages != null) {
            try (final Pages pagesDAO = new Pages(this.id)) {
                pagesDAO.delete();                                              // Remove existing pages
                // Pay Attention: this.pages != this.getPages() ! 
                // this.pages contains deserialized pages, getPages() fetchs them from the jackrabbit repository
                for (Entry<String, JsonNode> p : this.pages.entrySet()) {       // Add all pages
                    pagesDAO.store(new Page(p.getKey(), p.getValue()));
                }

            } catch (RepositoryException ex) {
                System.err.println("Failed to create repository for GameModel " + this.id);
            }
        }

    }

    /**
     * @return the description
     */
    public String getDescription() {
        return description;
    }

    /**
     * @param description the description to set
     */
    public void setDescription(String description) {
        this.description = description;
    }

    public String getComments() {
        return comments;
    }

    public void setComments(String comments) {
        this.comments = comments;
    }

    /**
     * @return the createdBy
     */
    @JsonIgnore
    public User getCreatedBy() {
        return createdBy;
    }

    /**
     * @param createdBy the createdBy to set
     */
    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    /**
     * @return name of the user who created this or null if user no longer
     *         exists
     */
    public String getCreatedByName() {
        if (this.getCreatedBy() != null) {
            return this.getCreatedBy().getName();
        }
        return null;
    }

    /**
     * @param createdByName
     */
    public void setCreatedByName(String createdByName) {
        // Here so game deserialization works
    }

    public GmType getType() {
        return type;
    }

    public void setType(GmType type) {
        this.type = type;
    }

    public GameModel getReference() {
        return reference;
    }

    public void setReference(GameModel reference) {
        this.reference = reference;
        if (reference != null) {
            reference.getImplementations().add(this);
        }
    }

    public List<GameModel> getImplementations() {
        return implementations;
    }

    public void setImplementations(List<GameModel> implementations) {
        this.implementations = implementations;
        for (GameModel implementation : implementations) {
            implementation.setReference(this);
        }
    }

    /**
     * TODO: select game.* FROM GAME where dtype like 'DEBUGGAME' and
     * gamemodelid = this.getId()
     *
     * @return true if the gameModel has a DebugGame
     */
    public boolean hasDebugGame() {
        for (Game g : getGames()) {
            if (g instanceof DebugGame) {
                return true;
            }
        }
        return false;
    }

    @Override
    @JsonIgnore
    public String getChannel() {
        return Helper.GAMEMODEL_CHANNEL_PREFIX + getId();
    }

    /*@Override
    public Map<String, List<AbstractEntity>> getEntities() {
        Map<String, List<AbstractEntity>> map = new HashMap<>();
        ArrayList<AbstractEntity> entities = new ArrayList<>();
        entities.add(this);
        map.put(this.getChannel(), entities);
        return map;
    }*/
    public enum GmType {
        /**
         * A model
         */
        MODEL,
        /**
         * Model reference
         */
        REFERENCE,
        /**
         * Model implementation
         */
        SCENARIO,
        /**
         * Private COPY for games
         */
        PLAY
    }

    public enum Status {
        /**
         * Template GameModel
         */
        LIVE,
        /**
         * Template GameModel in the wast bin
         */
        BIN,
        /**
         * Template GameModel Scheduled for deletion
         */
        DELETE,
        /**
         * Does not exist anymore. Actually, this status should never persist.
         * Used internally as game's missing.
         */
        SUPPRESSED
    }

    /* try transient anotation on field "pages". Problem with anotation mixin'
     private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
     in.defaultReadObject();
     this.pages = new HashMap<>();
     }*/
}
