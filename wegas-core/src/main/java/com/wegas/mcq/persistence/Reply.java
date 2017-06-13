/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013, 2014, 2015 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.mcq.persistence;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonTypeName;
import com.fasterxml.jackson.annotation.JsonView;
import com.wegas.core.Helper;
import com.wegas.core.ejb.VariableInstanceFacade;
import com.wegas.core.exception.client.WegasIncompatibleType;
import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.DatedEntity;
import com.wegas.core.persistence.variable.Beanjection;
import com.wegas.core.rest.util.Views;
import com.wegas.mcq.ejb.QuestionDescriptorFacade;
import java.util.Date;

import javax.persistence.*;

/**
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Entity
//@XmlType(name = "Reply")
@JsonTypeName(value = "Reply")
@Table(name = "MCQReply", indexes = {
    @Index(columnList = "variableinstance_id")
    ,
    @Index(columnList = "replies_id")
})
@NamedQueries({
    @NamedQuery(name = "Reply.countForInstance", query = "SELECT COUNT(r) FROM Reply r WHERE r.questionInstance.id = :instanceId")
})
public class Reply extends AbstractEntity implements DatedEntity {

    private static final long serialVersionUID = 1L;
    /**
     *
     */
    @Id
    @GeneratedValue
    @JsonView(Views.IndexI.class)
    private Long id;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdTime = new Date();
    /**
     * /
     **
     * <p>
     */
    private Long startTime;
    /**
     *
     */
    @Column(columnDefinition = "boolean default false")
    private Boolean unread = false;
    /**
     *
     */
    @Column(columnDefinition = "boolean default false")
    private Boolean ignored = false;
    /**
     *
     */
    @ManyToOne(optional = false)
    private Replies replies;

    @Transient
    private String resultName;

    @Transient
    private String choiceName;

    /**
     *
     */
    @ManyToOne(optional = false)
    @JoinColumn(name = "variableinstance_id", nullable = false)
    @JsonBackReference
    private QuestionInstance questionInstance;

    /**
     * @param a
     */
    @Override
    public void merge(AbstractEntity a) {
        if (a instanceof Reply) {
            Reply other = (Reply) a;
            this.setUnread(other.getUnread());
            this.setResultName(other.getResultName());
            this.setChoiceName(other.getChoiceName());
            this.setStartTime(other.getStartTime());
            this.setIgnored(other.getIgnored());
            this.setCreatedTime(other.getCreatedTime());
        } else {
            throw new WegasIncompatibleType(this.getClass().getSimpleName() + ".merge (" + a.getClass().getSimpleName() + ") is not possible");
        }
    }

    /**
     * @return the ignored status.
     */
    public Boolean getIgnored() {
        return ignored;
    }

    /**
     * @param ignored the ignored status to set.
     */
    public void setIgnored(Boolean ignored) {
        this.ignored = ignored;
    }

    @Override
    public Long getId() {
        return this.id;
    }

    /**
     * @return the createdTime
     */
    @Override
    public Date getCreatedTime() {
        return createdTime != null ? new Date(createdTime.getTime()) : null;
    }

    /**
     * @param createdTime the createdTime to set
     */
    public void setCreatedTime(Date createdTime) {
        this.createdTime = createdTime != null ? new Date(createdTime.getTime()) : null;
    }

    /**
     * @return the MCQDescriptor
     */
    //@XmlTransient
    @JsonIgnore
    @JsonBackReference
    public QuestionInstance getQuestionInstance() {
        return questionInstance;
    }

    /**
     * @param questionInstance
     */
    @JsonBackReference
    public void setQuestionInstance(QuestionInstance questionInstance) {
        this.questionInstance = questionInstance;
    }

    public String getChoiceName() {
        if (!Helper.isNullOrEmpty(choiceName)) {
            return choiceName;
        }
        if (this.getResult() != null && this.getResult().getChoiceDescriptor() != null) {
            return this.getResult().getChoiceDescriptor().getName();
        } else {
            return null;
        }
    }

    public void setChoiceName(String choiceName) {
        this.choiceName = choiceName;
    }

    public String getResultName() {
        if (!Helper.isNullOrEmpty(resultName)) {
            return resultName;
        }
        if (this.getResult() != null) {
            return this.getResult().getName();
        } else {
            return null;
        }
    }

    public void setResultName(String resultName) {
        this.resultName = resultName;
    }

    /**
     * @return true if the reply has not yet been read by a player
     */
    public Boolean getUnread() {
        return unread;
    }

    /**
     * @param unread
     */
    public void setUnread(Boolean unread) {
        this.unread = unread;
    }

    /**
     * @return the startTime
     */
    public Long getStartTime() {
        return startTime;
    }

    /**
     * @param startTime the startTime to set
     */
    public void setStartTime(Long startTime) {
        this.startTime = startTime;
    }

    /**
     * @return the result
     */
    @JsonIgnore
    public Result getResult() {
        return replies.getResult();
    }

    public void setResult(Result r) {
        this.replies = r.getReplies();
        this.setResultName(null);
        this.setChoiceName(null);
    }

    public Replies getReplies() {
        return replies;
    }

    public void setReplies(Replies replies) {
        this.replies = replies;
    }

    @Override
    public void updateCacheOnDelete(Beanjection beans) {
        QuestionDescriptorFacade qF = beans.getQuestionDescriptorFacade();
        VariableInstanceFacade vif = beans.getVariableInstanceFacade();
        QuestionInstance qInst = this.getQuestionInstance();
        if (qInst != null) {
            qInst = (QuestionInstance) vif.find(qInst.getId());
            if (qInst != null) {
                qInst.removeReply(this);
            }
        }

        Result theResult = this.getResult();
        if (theResult != null) {
            theResult = qF.findResult(theResult.getId());
            if (theResult != null) {
                theResult.removeReply(this);
            }
        }

        super.updateCacheOnDelete(beans);
    }
}
