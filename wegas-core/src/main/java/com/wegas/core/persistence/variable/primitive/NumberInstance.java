/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.persistence.variable.primitive;

import com.fasterxml.jackson.annotation.JsonView;
import com.wegas.core.Helper;
import com.wegas.core.exception.client.WegasOutOfBoundException;
import com.wegas.core.merge.annotations.WegasEntityProperty;
import com.wegas.core.persistence.EntityComparators;
import com.wegas.core.persistence.NumberListener;
import com.wegas.core.persistence.variable.VariableDescriptor;
import com.wegas.core.persistence.variable.VariableInstance;
import com.wegas.core.rest.util.Views;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 */
@Entity
@EntityListeners(NumberListener.class)
/*@Table(indexes = {
 @Index(columnList = "history.numberinstance_id")
 })*/
public class NumberInstance extends VariableInstance {

    private static final long serialVersionUID = 1L;

    private static final Logger logger = LoggerFactory.getLogger(NumberInstance.class);

    /**
     *
     */
    @Column(name = "val")
    @WegasEntityProperty
    private double value;

    /**
     *
     */
    @ElementCollection
    @JsonView(Views.ExtendedI.class)
    //@OrderColumn
    @WegasEntityProperty
    private List<NumberHistoryEntry> history = new ArrayList<>();

    /**
     *
     */
    public NumberInstance() {
    }

    /**
     * @param value
     */
    public NumberInstance(double value) {
        this.value = value;
    }

    /**
     * @return the value
     */
    public double getValue() {
        return value;
    }

    /**
     * @param value the value to set
     */
    public void setValue(double value) {
        try {
            VariableDescriptor vd = this.findDescriptor();
            if (vd instanceof NumberDescriptor) { // @fixme (Occurs when numberinstance are used for list descriptors) (IS THAT FUCKIN EXISTING ANY MORE ???)
                NumberDescriptor desc = (NumberDescriptor) vd;

                if (!desc.isValueValid(value)) {
                    throw new WegasOutOfBoundException(desc.getMinValue(), desc.getMaxValue(), value, desc.getName(), desc.getLabel());
                }
            }
        } catch (NullPointerException e) {
            // @fixme (occurs when instance is a defaultInstance)
        }

        this.value = value;
    }

    public void add(double value) {
        this.setValue(this.getValue() + value);
    }

    public void add(int value) {
        this.setValue(this.getValue() + value);
    }

    /**
     *
     */
    public void saveHistory() {
        List<Double> currentHistory = this.getHistory();
        currentHistory.add(this.getValue());
        this.setHistory(currentHistory);
    }

    /**
     * @return history of values
     */
    public List<Double> getHistory() {
        List<NumberHistoryEntry> copy = Helper.copyAndSort(this.history, new EntityComparators.OrderComparator<>());

        List<Double> h = new ArrayList<>();
        for (NumberHistoryEntry entry : copy) {
            h.add(entry.getValue());
        }
        return h;
    }

    /**
     * @param history
     */
    public void setHistory(List<Double> history) {
        this.history.clear();
        if (history != null) {
            VariableDescriptor theDesc = this.findDescriptor();
            Integer maxHSize = null;

            if (theDesc instanceof NumberDescriptor) {
                /*
                select vd.* from variabledescriptor as vd inner join variableinstance as vi on vi.id = vd.defaultinstance_id  where vd.dtype = 'ListDescriptor' and vi.dtype <> 'ListInstance';
                 */
                maxHSize = ((NumberDescriptor) theDesc).getHistorySize();
            }

            int toSave = maxHSize != null && history.size() > maxHSize ? maxHSize : history.size();
            int delta = history.size() - toSave;

            for (int i = 0; i < toSave; i++) {
                this.history.add(new NumberHistoryEntry(history.get(i + delta), i));
            }
        }
    }

}
