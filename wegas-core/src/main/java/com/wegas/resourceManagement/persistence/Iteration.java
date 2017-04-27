/*
 * Wegas
 * http://www.albasim.ch/wegas/
 *
 * Copyright (c) 2013, 2014, 2015 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.resourceManagement.persistence;

import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.rest.util.Views;
import javax.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonView;
import com.wegas.core.ejb.VariableDescriptorFacade;
import com.wegas.core.exception.client.WegasIncompatibleType;
import com.wegas.core.persistence.DatedEntity;
import com.wegas.core.persistence.ListUtils;
import com.wegas.core.persistence.variable.Beanjection;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import javax.swing.plaf.ListUI;

/**
 * PMG Related !
 *
 *
 * @author Maxence Laurent (maxence.laurent at gmail.com)
 */
@Entity

@Table(indexes = {
    @Index(columnList = "burndowninstance_variableinstance_id")
})
public class Iteration extends AbstractEntity implements DatedEntity {

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
     * Iteration Name
     */
    private String name;

    /**
     * Period number the iteration shall start on
     */
    private Long beginAt;

    /**
     * Total workload as computed at iteration beginning
     */
    private Double totalWorkload;

    /**
     * planned workload from beginAt period
     */
    @ElementCollection
    @JsonIgnore
    private List<IterationPlanning> plannedWorkloads = new ArrayList<>();

    /**
     * maps a period number with workload for current period and future ones:
     * Indicate the planned workload consumption
     */
    @ElementCollection
    @JsonIgnore
    private List<IterationPlanning> replannedWorkloads = new ArrayList<>();

    /**
     * maps a period number with workload for past period and current one:
     * indicates the total remaining workload for the corresponding period.
     */
    @OneToMany(mappedBy = "iteration", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Workload> workloads = new ArrayList<>();

    /**
     * Tasks composing the iteration
     */
    @JsonIgnore
    @ManyToMany
    @JoinTable(name = "iteration_taskdescriptor",
            joinColumns = {
                @JoinColumn(name = "iteration_id", referencedColumnName = "id")
            },
            inverseJoinColumns = {
                @JoinColumn(name = "tasks_variabledescriptor_id", referencedColumnName = "variabledescriptor_id")
            }
    )
    private List<TaskDescriptor> tasks;

    /**
     * parent BurndownInstance
     */
    @ManyToOne(optional = false)
    @JsonBackReference
    private BurndownInstance burndownInstance;

    /**
     *
     */
    public Iteration() {
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BurndownInstance getBurndownInstance() {
        return burndownInstance;
    }

    /**
     * set the parent
     *
     * @param burndownInstance the new parent instance
     */
    public void setBurndownInstance(BurndownInstance burndownInstance) {
        this.burndownInstance = burndownInstance;
    }

    /**
     * @return the period number iteration is planned to start on
     */
    public Long getBeginAt() {
        return beginAt;
    }

    /**
     * set period number the iteration is planned to start on
     *
     * @param beginAt period number iteration is planned to start on
     */
    public void setBeginAt(Long beginAt) {
        this.beginAt = beginAt;
    }

    /**
     * Get the total iteration workloads as it was on the beginning of the
     * iteration
     *
     * @return iteration total workload
     */
    public Double getTotalWorkload() {
        return totalWorkload;
    }

    /**
     * the the initial total workload
     *
     * @param totalWorkload initial workload
     */
    public void setTotalWorkload(Double totalWorkload) {
        this.totalWorkload = totalWorkload;
    }

    /**
     * get the workload for each iteration period period number are relative to
     * beginAt attribute
     *
     * @return planned workload, mapped by relative period number
     */
    @JsonIgnore
    private Map<Long, Double> getModifiablePlannedWorkloads() {
        return ListUtils.mapEntries(this.plannedWorkloads, new IterationPlanning.Extractor());
    }

    @JsonProperty
    public Map<Long, Double> getPlannedWorkloads() {
        return Collections.unmodifiableMap(this.getModifiablePlannedWorkloads());
    }

    /**
     * set the workload planning
     *
     * @param plannedWorkloads the planning
     */
    @JsonProperty
    public void setPlannedWorkloads(Map<Long, Double> plannedWorkloads) {
        this.plannedWorkloads.clear();
        for (Entry<Long, Double> entry : plannedWorkloads.entrySet()) {
            this.plannedWorkloads.add(new IterationPlanning(entry.getKey(), entry.getValue()));
        }
    }

    /**
     * get effective workload (for past and current periods)
     *
     * @return get effective workloads (ie. work done by resources)
     */
    public List<Workload> getWorkloads() {
        return workloads;
    }

    /**
     * set effective workloads
     *
     * @param workloads
     */
    public void setWorkloads(List<Workload> workloads) {
        this.workloads = workloads;
    }

    public void addWorkload(Long periodNumber, Double workload, Double spent) {
        this.addWorkload(periodNumber, workload, spent, 10);
    }

    public void addWorkload(Long periodNumber, Double workload, Double spent, Integer lastWorkedStep) {
        Workload newWorkload = new Workload();
        newWorkload.setPeriodNumber(periodNumber);
        newWorkload.setWorkload(workload);
        newWorkload.setSpentWorkload(spent);
        newWorkload.setLastWorkedStep(lastWorkedStep);
        newWorkload.setIteration(this);
        this.workloads.add(newWorkload);
    }

    /**
     * get replanned workloads consumption
     *
     * @return the planned workloads consumption
     */
    @JsonIgnore
    private Map<Long, Double> getModifiableReplannedWorkloads() {
        return ListUtils.mapEntries(this.plannedWorkloads, new IterationPlanning.Extractor());
    }

    @JsonProperty
    public Map<Long, Double> getReplannedWorkloads() {
        return Collections.unmodifiableMap(this.getModifiableReplannedWorkloads());
    }

    /**
     * set the replanned workloads consumption
     *
     * @param replannedWorkloads
     */
    public void setReplannedWorkloads(Map<Long, Double> replannedWorkloads) {
        this.replannedWorkloads.clear();
        for (Entry<Long, Double> entry : replannedWorkloads.entrySet()) {
            this.replannedWorkloads.add(new IterationPlanning(entry.getKey(), entry.getValue()));
        }
    }

    /**
     * retrieve the list of tasks composing the iteration
     *
     * @return get all tasks
     */
    public List<TaskDescriptor> getTasks() {
        return tasks;
    }

    /**
     * set the list of task composing the iteration
     *
     * @param tasks tasks composing the iteration
     */
    public void setTasks(List<TaskDescriptor> tasks) {
        this.tasks = tasks;
    }

    public void addTask(TaskDescriptor taskD) {
        this.tasks.add(taskD);
    }

    public void removeTask(TaskDescriptor task) {
        this.tasks.remove(task);
    }

    public List<Long> getTaskDescriptorsId() {
        List<Long> ids = new ArrayList<>();
        for (TaskDescriptor td : getTasks()) {
            ids.add(td.getId());
        }
        return ids;
    }

    public void setTaskDescriptorsId(List<Long> taskDescriptorsId) {
        // NOPE 
    }

    private void internalPlan(Long periodNumber, Double workload, Map<Long, Double> planning) {
        if (workload > 0) {
            planning.put(periodNumber, workload);
        } else {
            planning.remove(periodNumber);
        }
    }

    public void plan(Long periodNumber, Double workload) {
        Map<Long, Double> planning = this.getModifiablePlannedWorkloads();
        internalPlan(periodNumber, workload, planning);
        this.setPlannedWorkloads(planning);
    }

    public void replan(Long periodNumber, Double workload) {
        Map<Long, Double> planning = this.getModifiableReplannedWorkloads();
        internalPlan(periodNumber, workload, planning);
        this.setReplannedWorkloads(planning);
    }

    /**
     *
     * @param a
     */
    @Override
    public void merge(AbstractEntity a) {
        if (a instanceof Iteration) {
            Iteration other = (Iteration) a;
            this.setBeginAt(other.getBeginAt());
            this.setName(other.getName());

            //ListUtils.updateList(tasks, other.getTasks());
            //this.setPlannedWorkloads(other.getPlannedWorkloads());
            //this.setReplannedWorkloads(other.getReplannedWorkloads());
            //this.setTotalWorkload(other.getTotalWorkload());
            //this.setWorkloads();
        } else {
            throw new WegasIncompatibleType(this.getClass().getSimpleName() + ".merge (" + a.getClass().getSimpleName() + ") is not possible");
        }
    }

    /**
     * tie lifecycle events with burdownInstnace ones
     */
    /*
    @Override
    public Map<String, List<AbstractEntity>> getEntities() {
        return this.getBurndownInstance().getEntities();
    }*/
    @Override
    public void updateCacheOnDelete(Beanjection beans) {
        VariableDescriptorFacade vdf = beans.getVariableDescriptorFacade();
        BurndownInstance theBdI = this.getBurndownInstance();

        if (theBdI != null) {
            theBdI = (BurndownInstance) beans.getVariableInstanceFacade().find(theBdI.getId());
            if (theBdI != null) {
                theBdI.getIterations().remove(this);
            }
        }
        for (TaskDescriptor task : this.getTasks()) {
            task = (TaskDescriptor) vdf.find(task.getId());
            if (task != null) {
                task.getIterations().remove(this);
            }
        }
        this.setTasks(new ArrayList<>());
    }

}
