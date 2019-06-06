/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.persistence.variable.statemachine;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonView;
import com.wegas.core.merge.annotations.WegasEntityProperty;
import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.Broadcastable;
import com.wegas.core.persistence.WithPermission;
import com.wegas.core.persistence.game.Script;
import com.wegas.core.rest.util.Views;
import com.wegas.core.security.util.WegasPermission;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import javax.persistence.*;

/**
 * @author Cyril Junod (cyril.junod at gmail.com)
 */
@Entity
@Table(
        name = "fsm_state",
        indexes = {
            @Index(columnList = "statemachine_id"),
            @Index(columnList = "text_id") // stands in superclass since index is not generated if defined in DialogueState ...
        }
)
@JsonSubTypes(value = {
    @JsonSubTypes.Type(name = "DialogueState", value = DialogueState.class),
    @JsonSubTypes.Type(name = "State", value = State.class),
    @JsonSubTypes.Type(name = "TriggerState", value = TriggerState.class)
})
//@OptimisticLocking(cascade = true)
public abstract class AbstractState<T extends AbstractTransition> extends AbstractEntity implements Broadcastable {

    private static final long serialVersionUID = 1L;

    @ManyToOne
    @JsonIgnore
    private AbstractStateMachineDescriptor stateMachine;

    @Version
    @Column(columnDefinition = "bigint default '0'::bigint")
    @WegasEntityProperty(sameEntityOnly = true)
    private Long version;

    /**
     *
     */
    @JsonView(value = Views.EditorI.class)
    @WegasEntityProperty
    private Coordinate editorPosition;

    /**
     *
     */
    @Id
    @Column(name = "id")
    @GeneratedValue
    @JsonView(Views.IndexI.class)
    private Long id;

    /**
     *
     */
    @Column(name = "fsm_statekey")
    @WegasEntityProperty
    private Long index;

    /**
     *
     */
    @Embedded
    @JsonView(Views.EditorI.class)
    @WegasEntityProperty
    private Script onEnterEvent;

    /**
     *
     */
    @OneToMany(mappedBy = "state", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @WegasEntityProperty
    //private List<T> transitions = new ArrayList<>(); // templated mapping <T> faisl with eclipselink 2.6.4
    private List<AbstractTransition> transitions = new ArrayList<>();

    /**
     *
     */
    public AbstractState() {
    }

    /**
     * Get the stateMachineDescriptor which defines this state
     *
     * @return this state's parent
     */
    public AbstractStateMachineDescriptor getStateMachine() {
        return stateMachine;
    }

    public void setStateMachine(AbstractStateMachineDescriptor stateMachine) {
        this.stateMachine = stateMachine;
    }

    @JsonView(Views.IndexI.class)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public Long getStateMachineId() {
        return getStateMachine().getId();
    }

    /**
     * @return state position in the stateMachine editor extent
     */
    public Coordinate getEditorPosition() {
        return editorPosition;
    }

    /**
     * @param editorPosition
     */
    public void setEditorPosition(Coordinate editorPosition) {
        this.editorPosition = editorPosition;
    }

    @Override
    public Long getId() {
        return id;
    }

    @JsonProperty
    public Long getIndex() {
        return index;
    }

    @JsonIgnore
    public void setIndex(Long index) {
        this.index = index;
    }

    /**
     * get the script which to execute when this state become the current state
     *
     * @return the script which to execute when this state become the current state
     */
    public Script getOnEnterEvent() {
        this.touchOnEnterEvent();
        return onEnterEvent;
    }

    private void touchOnEnterEvent() {
        if (this.onEnterEvent != null) {
            this.onEnterEvent.setParent(this, "impact");
        }
    }

    /**
     * @param onEnterEvent
     */
    public void setOnEnterEvent(Script onEnterEvent) {
        this.onEnterEvent = onEnterEvent;
        this.touchOnEnterEvent();
    }

    /**
     * @return unmodifiable list of transitions, sorted by index
     */
    @JsonIgnore
    public List<T> getSortedTransitions() {
        Collections.sort(this.transitions, new ComparatorImpl());
        return (List<T>) this.transitions;
    }

    /**
     * @return list of transition going out of the state
     */
    public List<T> getTransitions() {
        return (List<T>) transitions;
    }

    public T addTransition(T t) {
        List<T> ts = this.getTransitions();
        if (!ts.contains(t)) {
            ts.add(t);
        }
        this.setTransitions(ts);
        return t;
    }

    /**
     * @param transitions
     */
    public void setTransitions(List<T> transitions) {
        for (T t : transitions) {
            t.setState(this);
        }
        this.transitions = (List<AbstractTransition>) transitions;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    @Override
    public String toString() {
        return "State{" + "id=" + id + ", v=" + version + ", onEnterEvent=" + onEnterEvent + ", transitions=" + transitions + '}';
    }

    @Override
    public WithPermission getMergeableParent() {
        return this.getStateMachine();
    }

    @Override
    public Map<String, List<AbstractEntity>> getEntities() {
        return this.getStateMachine().getEntities();
    }

    @Override
    public Collection<WegasPermission> getRequieredUpdatePermission() {
        Collection<WegasPermission> perms = this.getStateMachine().getRequieredUpdatePermission();
        // see issue #1441
        perms.add(this.getParentGameModel().getAssociatedTranslatePermission(""));
        return perms;
    }

    @Override
    public Collection<WegasPermission> getRequieredReadPermission() {
        return this.getStateMachine().getRequieredReadPermission();
    }

    /**
     * Compare transition by index
     */
    private static class ComparatorImpl implements Comparator<AbstractTransition>, Serializable {

        private static final long serialVersionUID = -6452488638539643500L;

        public ComparatorImpl() {
        }

        @Override
        public int compare(AbstractTransition t1, AbstractTransition t2) {
            return t1.getIndex() - t2.getIndex();
        }
    }
}
