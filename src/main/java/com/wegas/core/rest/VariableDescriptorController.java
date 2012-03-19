/*
 * Wegas.
 * http://www.albasim.com/wegas/
 *
 * School of Business and Engineering Vaud, http://www.heig-vd.ch/
 * Media Engineering :: Information Technology Managment :: Comem
 *
 * Copyright (C) 2011
 */
package com.wegas.core.rest;

import com.wegas.core.ejb.GameModelEntityFacade;
import com.wegas.core.ejb.VariableDescriptorEntityFacade;
import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.game.GameModelEntity;
import com.wegas.core.persistence.variabledescriptor.VariableDescriptorEntity;
import com.wegas.core.script.ScriptEntity;
import com.wegas.core.script.ScriptManager;
import java.util.Collection;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;

/**
 *
 * @author Francois-Xavier Aeberhard <fx@red-agent.com>
 */
@Stateless
@Path("GameModel/{gameModelId : [1-9][0-9]*}/VariableDescriptor")
public class VariableDescriptorController extends AbstractRestController<VariableDescriptorEntityFacade> {

    private static final Logger logger = Logger.getLogger("Authoring_GM_VariableDescriptor");
    /**
     *
     */
    @EJB
    private VariableDescriptorEntityFacade variableDescriptorFacade;
    /**
     *
     */
    @EJB
    private GameModelEntityFacade gameModelFacade;
    /**
     *
     */
    @EJB
    private ScriptManager scriptManager;

    /**
     *
     * @return
     */
    @Override
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Collection<AbstractEntity> index() {
        Long gameModelId = this.getGameModelId();
        GameModelEntity gameModel = gameModelFacade.find(gameModelId);
        return (Collection) gameModel.getVariableDescriptors();
    }

    @Override
    public AbstractEntity create(AbstractEntity entity) {
        this.variableDescriptorFacade.create(new Long(this.getPathParam("gameModelId")), (VariableDescriptorEntity) entity);
        return entity;
    }

    /**
     * Resets all the variables of a given game model
     *
     * @param gameModelId game model id
     * @return OK
     */
    @GET
    @Path("reset")
    @Produces(MediaType.APPLICATION_JSON)
    public Collection<VariableDescriptorEntity> reset(@PathParam("gameModelId") Long gameModelId) {
        return gameModelFacade.reset(gameModelId).getVariableDescriptors();
    }

    /**
     *
     * @param gameModelId
     * @param playerId
     * @param script
     * @return
     */
    @PUT
    @Path("Player/{playerId : [1-9][0-9]*}/RunScript")
    @Produces(MediaType.APPLICATION_JSON)
    public Collection<VariableDescriptorEntity> runScript(@PathParam("gameModelId") Long gameModelId,
            @PathParam("playerId") Long playerId, ScriptEntity script) {
        return (Collection) this.scriptManager.runScript(gameModelId, playerId, script);
    }

    private Long getGameModelId() {
        return new Long(this.getPathParam("gameModelId"));
    }

    /**
     *
     * @return
     */
    @Override
    protected VariableDescriptorEntityFacade getFacade() {
        return this.variableDescriptorFacade;
    }
}
