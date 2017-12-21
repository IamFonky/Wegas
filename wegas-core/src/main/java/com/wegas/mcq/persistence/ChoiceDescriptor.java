/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.mcq.persistence;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonView;
import com.wegas.core.Helper;
import com.wegas.core.exception.internal.WegasNoResultException;
import com.wegas.core.merge.annotations.WegasEntity;
import com.wegas.core.merge.annotations.WegasEntityProperty;
import com.wegas.core.merge.utils.WegasCallback;
import com.wegas.core.persistence.Mergeable;
import com.wegas.core.persistence.game.Player;
import com.wegas.core.persistence.game.Script;
import com.wegas.core.persistence.variable.DescriptorListI;
import com.wegas.core.persistence.variable.Scripted;
import com.wegas.core.persistence.variable.VariableDescriptor;
import com.wegas.core.rest.util.Views;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.*;

/**
 *
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Entity
@Table(name = "MCQChoiceDescriptor",
        indexes = {
            @Index(columnList = "question_variabledescriptor_id")
        })
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@JsonSubTypes(value = {
    @JsonSubTypes.Type(name = "SingleResultChoiceDescriptor", value = SingleResultChoiceDescriptor.class)
})
@WegasEntity(callback = ChoiceDescriptor.ChoiceDescriptorMergeCallback.class)
public class ChoiceDescriptor extends VariableDescriptor<ChoiceInstance> implements Scripted {

    private static final long serialVersionUID = 1L;
    // private static final Logger logger = LoggerFactory.getLogger(ChoiceDescriptor.class);
    /**
     *
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    @JsonBackReference
    private QuestionDescriptor question;
    /**
     *
     */
    @OneToMany(mappedBy = "choiceDescriptor", cascade = CascadeType.ALL, orphanRemoval = true)
//    @OrderBy("id")
    @OrderColumn
    @JsonManagedReference
    @JsonView(Views.EditorI.class)
    @WegasEntityProperty(callback = ResultMergeCallback.class)
    private List<Result> results = new ArrayList<>();
    /**
     *
     */
    @Basic(fetch = FetchType.EAGER) // CARE, lazy fetch on Basics has some trouble.
    @Lob
    @WegasEntityProperty
    private String description;

    /**
     *
     */
    @WegasEntityProperty
    private Long duration = 1L;
    /**
     *
     */
    @WegasEntityProperty
    private Long cost = 0L;

    @Override
    @JsonIgnore
    public List<Script> getScripts() {
        List<Script> ret = new ArrayList<>();
        //Avoid stream
        for (Result r : this.getResults()) {
            ret.addAll(r.getScripts());
        }
        return ret;
    }

    /**
     *
     * @param r
     */
    public void addResult(Result r) {
        this.results.add(r);
        r.setChoiceDescriptor(this);
    }

    // ~~~  Sugar to use from scripts ~~~
    /**
     * @param player
     * @param resultName
     *
     * @throws com.wegas.core.exception.internal.WegasNoResultException
     */
    public void setCurrentResult(Player player, String resultName) throws WegasNoResultException {
        ChoiceInstance instance = this.getInstance(player);
        Result resultByName = getResultByName(resultName);
        this.changeCurrentResult(instance, resultByName);
    }

    public void changeCurrentResult(ChoiceInstance choiceInstance, Result newCurrentResult) {
        //Result previousResult = choiceInstance.getCurrentResult();
        /*if (previousResult != null) {
            previousResult.removeChoiceInstance(choiceInstance);
        }*/

 /*if (newCurrentResult != null) {
            newCurrentResult.addChoiceInstance(choiceInstance);
        }*/
        choiceInstance.setCurrentResult(newCurrentResult);
    }

    /**
     * Select this choice result matching given name
     * <p>
     * @param name result-to-find's name
     *
     * @return the specified result
     *
     * @throws com.wegas.core.exception.internal.WegasNoResultException
     */
    public Result getResultByName(String name) throws WegasNoResultException {
        for (Result r : this.getResults()) {
            if (r.getName().equals(name)) {
                return r;
            }
        }
        throw new WegasNoResultException();
    }

    /**
     *
     * @param p
     */
    public void activate(Player p) {
        this.getInstance(p).activate();
    }

    /**
     *
     * @param p
     */
    public void desactivate(Player p) {
        this.getInstance(p).desactivate();
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

    /**
     * @return the duration
     */
    public Long getDuration() {
        return duration;
    }

    /**
     * @param duration the duration to set
     */
    public void setDuration(Long duration) {
        this.duration = duration;
    }

    /**
     * @return the results
     */
    public List<Result> getResults() {
        return results;
    }

    /**
     * @param results the results to set
     */
    public void setResults(List<Result> results) {
        if (results != null) {
            for (Result r : results) {
                r.setChoiceDescriptor(this);
            }
        }
        this.results = results;
    }

    /**
     * Is the player instance active ?
     *
     * @param p <p>
     * @return player instance active status
     */
    public boolean isActive(Player p) {
        return this.getInstance(p).getActive();
    }

    /**
     * has the choice been explicitely ignored ?
     *
     * @param p
     *
     * @return true only if the choice is not selectable any longer
     */
    public boolean hasBeenIgnored(Player p) {
        QuestionInstance qi = this.getQuestion().getInstance(p);

        if (this.getQuestion().getCbx()) {
            if (!qi.getValidated()) {
                //Check box not yet validated -> no choices have been submited, nor ignorated
                return false;
            } else {
                for (Reply r : this.getInstance(p).getReplies()) {
                    // reply for this choice found
                    return r.getIgnored();
                }
                return false;
            }
        } else {
            // Choice is linked to at least a reply => not ignored
            if (!this.getInstance(p).getReplies().isEmpty()) {
                return false;
            }
        }
        // this choice has not been selected and no choices are selectable any longer
        return !(this.getQuestion().getAllowMultipleReplies() || qi.getReplies(p).isEmpty());
    }

    /**
     * has the choice not (yet) been selected ? <br>
     * Such a case happened for
     * <ul>
     * <li>MCQ Questions, after the question has been validated, for all
     * unselected choices, or before the validation, for all choices </li>
     * <li>Standard question, if the choice is not linked to a reply </li>
     * </ul>
     *
     * @param p the player
     *
     * @return return true if this choice can be selected by the player
     */
    public boolean hasNotBeenSelected(Player p) {
        if (this.getQuestion().getCbx()) {
            if (!this.getQuestion().getInstance(p).getValidated()) {
                //Check box not yet validated -> no chocie have been selected 
                return true;
            } else {
                for (Reply r : this.getInstance(p).getReplies()) {
                    // reply for this choice found
                    return r.getIgnored();
                }
                return false;
            }
        } else {
            if (!this.getInstance(p).getReplies().isEmpty()) {
                // Choice is linked to a reply => not ignored
                return false;
            }
            return true;
        }
    }

    /**
     * Does this choice has been selected by the given player
     * <p>
     * @param p the player
     * <p>
     * @return true if one or more question replies referencing this choice
     *         exist
     */
    public boolean hasBeenSelected(Player p) {
        if (this.getQuestion().getCbx() && !this.getQuestion().getInstance(p).getValidated()) {
            return false;
        }
        for (Reply r : this.getInstance(p).getReplies()) {
            if (!r.getIgnored()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Does this result has been selected by the given player
     * <p>
     * @param p      the player
     * @param result <p>
     * @return true if one or more question reply referencing the given result
     *         exist
     */
    public boolean hasResultBeenApplied(Player p, Result result) {
        for (Reply r : this.getInstance(p).getReplies()) {
            if (r.getResult().equals(result)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Does this result has been selected by the given player
     * <p>
     * @param p          the player
     * @param resultName result name
     * <p>
     * @return true if one or more question reply referencing the given result
     *         exist
     *
     * @throws com.wegas.core.exception.internal.WegasNoResultException
     */
    public boolean hasResultBeenApplied(Player p, String resultName) throws WegasNoResultException {
        return this.hasResultBeenApplied(p, this.getResultByName(resultName));
    }

    /**
     * @return the cost
     */
    public Long getCost() {
        return cost;
    }

    /**
     * @param cost the cost to set
     */
    public void setCost(Long cost) {
        this.cost = cost;
    }

    /**
     * @return the question
     */
    public QuestionDescriptor getQuestion() {
        return question;
    }

    @JsonIgnore
    @Override
    public DescriptorListI<? extends VariableDescriptor> getParent() {
        if (this.getQuestion() != null) {
            return this.getQuestion();
        } else {
            return super.getParent();
        }
    }

    /**
     * @param question the question to set
     */
    @JsonBackReference
    public void setQuestion(QuestionDescriptor question) {
        this.question = question;
        if (question != null) { // Hum... question should never be null...
            this.setRootGameModel(null);
            this.setParentList(null);
        }
    }

    @Override
    public Boolean containsAll(List<String> criterias) {
        if (Helper.insensitiveContainsAll(this.getDescription(), criterias)
                || super.containsAll(criterias)) {
            return true;
        }
        for (Result r : this.getResults()) {
            if (r.containsAll(criterias)) {
                return true;
            }
        }
        return false;
    }

    public static class ChoiceDescriptorMergeCallback implements WegasCallback {

        @Override
        public void postUpdate(Mergeable entity, Object ref, Object identifier) {
            if (entity instanceof ChoiceDescriptor) {
                ChoiceDescriptor cd = (ChoiceDescriptor) entity;

                List<String> labels = new ArrayList<>();
                List<String> names = new ArrayList<>();
                List<Result> newResults = new ArrayList<>();

                for (Result r : cd.getResults()) {
                    if (r.getId() != null) {
                        // Store name and label existing result
                        labels.add(r.getLabel());
                        names.add(r.getName());
                    } else {
                        newResults.add(r);
                    }
                }

                // set names and labels unique
                for (Result r : newResults) {
                    Helper.setNameAndLabelForResult(r, names, labels);
                }
            }
        }

    }

    public static class ResultMergeCallback implements WegasCallback {

        @Override
        public Object remove(Object entity, Object container, Object identifier) {
            if (entity instanceof Result) {
                Result resultToRemove = (Result) entity;
                for (ChoiceInstance ci : resultToRemove.getChoiceInstances()) {
                    ci.setCurrentResult(null);
                }
            }
            return null;
        }
    }
}
