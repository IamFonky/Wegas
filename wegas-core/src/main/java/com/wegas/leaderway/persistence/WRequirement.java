package com.wegas.leaderway.persistence;

import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.variable.VariableInstance;
import java.util.HashMap;
import java.util.Map;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;

/**
 *
 * @author Benjamin
 */
@Entity
public class WRequirement extends VariableInstance {

    private static final long serialVersionUID = 1L;
    /**
     *
     */
    @Column(name = "wlimit")
    private Integer limit;

    /**
     *
     */
    @ElementCollection
    private Map<Integer, Integer> needs = new HashMap<>();

    @Override
    public void merge(AbstractEntity a) {
        WRequirement other = (WRequirement) a;
        this.setLimit(other.getLimit());
        this.setNeeds(other.getNeeds());
    }
    
    public WRequirement () {
    }

    /**
     * @return the limit
     */
    public Integer getLimit() {
        return limit;
    }

    /**
     * @param limit the limit to set
     */
    public void setLimit(Integer limit) {
        this.limit = limit;
    }

    /**
     * @return the needs
     */
    public Map getNeeds() {
        return needs;
    }

    /**
     * @param needs the needs to set
     */
    public void setNeeds(Map needs) {
        this.needs = needs;
    }
    
    /**
     * @return the need
     */
    public Integer getNeed(Integer key) {
        return needs.get(key);
    }

    /**
     * @param need the need to set
     */
    public void setNeed(Integer key, Integer value) {
        this.needs.put(key, value);
    }
}
