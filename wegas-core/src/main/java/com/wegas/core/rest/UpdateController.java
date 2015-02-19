/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013, 2014, 2015 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.rest;

import com.wegas.core.Helper;
import com.wegas.core.ejb.GameModelFacade;
import com.wegas.core.ejb.VariableDescriptorFacade;
import com.wegas.core.persistence.game.GameModel;
import com.wegas.core.persistence.game.Script;
import com.wegas.core.persistence.variable.VariableDescriptor;
import com.wegas.core.persistence.variable.statemachine.State;
import com.wegas.core.persistence.variable.statemachine.StateMachineDescriptor;
import com.wegas.core.persistence.variable.statemachine.Transition;
import com.wegas.mcq.persistence.ChoiceDescriptor;
import com.wegas.mcq.persistence.Result;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import org.apache.shiro.authz.annotation.RequiresRoles;

/**
 *
 *
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */
@Stateless
@Path("Update")
@RequiresRoles("Administrator")
public class UpdateController {

    @EJB
    VariableDescriptorFacade descriptorFacade;
    @EJB
    GameModelFacade gameModelFacade;

    /**
     *
     * @return
     */
    @GET
    public String index() {
        StringBuilder ret = new StringBuilder();
        for (GameModel gm : gameModelFacade.findAll()) {
            ret.append("<a href=\"Encode/").append(gm.getId()).append("\">Update variable names ").append(gm.getId()).append("</a> | ");
            ret.append("<a href=\"UpdateScript/").append(gm.getId()).append("\">Update script ").append(gm.getId()).append("</a><br />");
        }
        return ret.toString();
    }

    /**
     * Retrieve
     *
     * @param gameModelId
     * @return
     */
    @GET
    @Path("Encode/{gameModelId : ([1-9][0-9]*)}")
    public String encode(@PathParam("gameModelId") Long gameModelId) {
        List<VariableDescriptor> findAll = descriptorFacade.findByGameModelId(gameModelId);
        for (VariableDescriptor vd : findAll) {
            List<String> findDistinctNames = descriptorFacade.findDistinctNames(vd.getGameModel());
            List<String> findDistinctLabels = descriptorFacade.findDistinctLabels(vd.getGameModel());
            findDistinctNames.remove(vd.getName());
            findDistinctLabels.remove(vd.getLabel());
            Helper.setUniqueName(vd, findDistinctNames);
            Helper.setUniqueLabel(vd, findDistinctLabels);
            descriptorFacade.flush();
        }
        return "Finished";
    }

    /**
     *
     * @param gameModelId
     * @return
     */
    @GET
    @Path("UpdateScript/{gameModelId : ([1-9][0-9]*)}")
    public String script(@PathParam("gameModelId") Long gameModelId) {
        List<VariableDescriptor> findAll = descriptorFacade.findAll(gameModelId);
        List<String> keys = new ArrayList<>();
        List<String> values = new ArrayList<>();
        for (VariableDescriptor vd : findAll) {
            keys.add("VariableDescriptorFacade\\.find\\(" + vd.getId() + "\\)");
            values.add("VariableDescriptorFacade.find(gameModel, \"" + vd.getName() + "\")");
        }

        for (VariableDescriptor vd : findAll) {
            if (vd instanceof ChoiceDescriptor) {
                ChoiceDescriptor choice = (ChoiceDescriptor) vd;
                for (Result r : choice.getResults()) {
                    replaceAll(r.getImpact(), keys, values);
                }
            } else if (vd instanceof StateMachineDescriptor) {
                StateMachineDescriptor fsm = (StateMachineDescriptor) vd;
                for (Map.Entry<Long, State> s : fsm.getStates().entrySet()) {
                    replaceAll(s.getValue().getOnEnterEvent(), keys, values);
                    for (Transition t : s.getValue().getTransitions()) {
                        replaceAll(t.getPreStateImpact(), keys, values);
                        replaceAll(t.getTriggerCondition(), keys, values);
                    }
                }
            }
        }
        return "Finished";
    }

    private static void replaceAll(Script script, List<String> a, List<String> b) {
        if (script == null) {
            return;
        }
        String s = script.getContent();
        for (int i = 0; i < a.size(); i++) {
            s = s.replaceAll(a.get(i), b.get(i));
        }
        script.setContent(s);
    }
}
