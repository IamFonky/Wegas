/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2018 School of Business and Engineering Vaud, Comem, MEI
 * Licensed under the MIT License
 */
package com.wegas.core.ejb.statemachine;

import com.wegas.core.api.StateMachineFacadeI;
import com.wegas.core.ejb.*;
import com.wegas.core.exception.client.WegasErrorMessage;
import com.wegas.core.exception.client.WegasRuntimeException;
import com.wegas.core.exception.client.WegasScriptException;
import com.wegas.core.persistence.AbstractEntity;
import com.wegas.core.persistence.InstanceOwner;
import com.wegas.core.persistence.game.GameModel;
import com.wegas.core.persistence.game.Player;
import com.wegas.core.persistence.game.Script;
import com.wegas.core.persistence.variable.VariableDescriptor;
import com.wegas.core.persistence.variable.VariableInstance;
import com.wegas.core.persistence.variable.statemachine.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import javax.script.ScriptException;
import java.util.Set;
import javax.ejb.EJB;
import javax.ejb.EJBException;
import javax.ejb.LocalBean;
import javax.ejb.Stateless;
import javax.inject.Inject;
import org.slf4j.LoggerFactory;

/**
 * Run state machines.
 *
 * @author Cyril Junod (cyril.junod at gmail.com)
 */
@Stateless
@LocalBean
public class StateMachineFacade extends WegasAbstractFacade implements StateMachineFacadeI {
//public class StateMachineFacade extends BaseFacade<StateMachineDescriptor> implements  StateMachineFacadeI {

    static final private org.slf4j.Logger logger = LoggerFactory.getLogger(StateMachineFacade.class);

    /**
     * Event parameter will be passed in a function with named parameter
     * {@value #EVENT_PARAMETER_NAME}
     */
    static final private String EVENT_PARAMETER_NAME = "param";

    @EJB
    private VariableDescriptorFacade variableDescriptorFacade;

    @EJB
    private GameModelFacade gameModelFacade;

    @EJB
    private GameFacade gameFacade;

    @EJB
    private TeamFacade teamFacade;

    @EJB
    private PlayerFacade playerFacade;

    @EJB
    private ScriptFacade scriptManager;

    @Inject
    private RequestManager requestManager;

    @Inject
    ScriptCheck scriptCheck;

    @Inject
    ScriptFacade scriptFacade;

    @Inject
    private ScriptEventFacade scriptEvent;

    public Transition findTransition(Long transitionId) {
        return getEntityManager().find(Transition.class, transitionId);
    }

    /**
     * Run stateMachine for all players within the given context
     *
     * @param context a gameModel, a game, a team or a player
     */
    public void runStateMachines(InstanceOwner context) throws WegasScriptException {

        List<Player> players;
        if (context == null || context.getPlayers() == null) {
            logger.error("No Player Provided...");
            Player player = null;
            for (Entry<String, List<AbstractEntity>> entry : requestManager.getUpdatedEntities().entrySet()) {
                for (AbstractEntity entity : entry.getValue()) {
                    if (entity instanceof VariableInstance) {
                        VariableInstance vi = (VariableInstance) entity;
                        InstanceOwner owner = vi.getOwner();
                        if (owner != null) {
                            player = owner.getAnyLivePlayer();
                        }
                        break;
                    }
                }
                if (player != null) {
                    break;
                }
            }
            if (player == null) {
                throw WegasErrorMessage.error("StateMachine Facade: NO PLAYER");
            }
            players = new ArrayList<>();
            players.add(player);
        } else {
            players = context.getPlayers();
        }

        this.runForPlayers(players);
        /*
        Force resources release
        //getEntityManager().flush();
        if (playerAction.getClear()) {
            requestManager.clear();
        }
         */
    }

    private List<Player> getPlayerFromAudiences(List<String> audiences) {
        List<Player> players = new ArrayList<>();

        for (String audience : audiences) {
            String[] token = audience.split("-");
            Long id = Long.parseLong(token[2]);
            switch (token[0]) {
                case "GameModel":
                    for (Player p : gameModelFacade.find(id).getPlayers()) {
                        if (!players.contains(p)) {
                            players.add(p);
                        }
                    }
                    break;

                case "Game":
                    for (Player p : gameFacade.find(id).getPlayers()) {
                        if (!players.contains(p)) {
                            players.add(p);
                        }
                    }
                    break;
                case "Team":
                    for (Player p : teamFacade.find(id).getPlayers()) {
                        if (!players.contains(p)) {
                            players.add(p);
                        }
                    }
                    break;
                case "Player":
                    Player p = playerFacade.find(id);
                    if (!players.contains(p)) {
                        players.add(p);
                    }
                    break;
            }
        }
        return players;
    }

    private void populateWithPlayerInstance(Player p, List<StateMachineDescriptor> descriptors, Map<StateMachineInstance, Player> instances) {
        for (StateMachineDescriptor smd : descriptors) {
            StateMachineInstance instance = (StateMachineInstance) variableDescriptorFacade.getInstance(smd, p);
            if (instance.getEnabled() && instance.getCurrentState() != null) {
                instances.putIfAbsent(instance, p);
            }
        }
    }

    private List<String> getAudiences() {
        List<String> audiences = new ArrayList<>();

        for (Entry<String, List<AbstractEntity>> entry : requestManager.getJustUpdatedEntities().entrySet()) {
            for (AbstractEntity ae : entry.getValue()) {
                if (ae instanceof VariableInstance) {
                    audiences.add(entry.getKey());
                    break;
                }
            }
        }

        return audiences;
    }

    private Map<StateMachineInstance, Player> getStateMachineInstances(List<StateMachineDescriptor> descriptors, List<Player> players) {
        /**
         * Using a linked hash map give a predictable iteration order, to be
         * sure preferred player instances will be processed first.
         * <p>
         * This behaviour is required to ensure correct event handling (events
         * are store within player context, therby they're loosed when switching
         * to a new player)
         * <p>
         */
        Map<StateMachineInstance, Player> instances = new LinkedHashMap<>();

        List<Player> playerFromAudiences = getPlayerFromAudiences(getAudiences());

        if (players != null) {
            for (Player player : players) {
                populateWithPlayerInstance(player, descriptors, instances);
            }
        }

        for (Player player : playerFromAudiences) {
            if (players == null || !players.contains(player)){
                populateWithPlayerInstance(player, descriptors, instances);
            }
        }

        requestManager.migrateUpdateEntities();
        return instances;
    }

    /**
     * Get all stateMachine defined within the gameModel
     *
     * @param gameModel the gameModel we search state machine in
     *
     * @return all stateMachines which exists in gameModel
     */
    private List<StateMachineDescriptor> getAllStateMachines(final GameModel gameModel) {
        final Set<VariableDescriptor> variableDescriptors = gameModel.getVariableDescriptors();
        final List<StateMachineDescriptor> stateMachineDescriptors = new ArrayList<>();
        for (VariableDescriptor vd : variableDescriptors) {
            if (vd instanceof StateMachineDescriptor) {
                stateMachineDescriptors.add((StateMachineDescriptor) vd);
            }
        }
        return stateMachineDescriptors;
    }

    private void runForPlayers(List<Player> preferredPlayers) throws WegasScriptException {
        if (preferredPlayers != null && !preferredPlayers.isEmpty()) {
            GameModel gameModel = preferredPlayers.get(0).getGameModel();
            List<StateMachineDescriptor> statemachines = this.getAllStateMachines(gameModel);

            Map<StateMachineInstance, Player> instances;

            int step = 0;

            do {
                instances = getStateMachineInstances(statemachines, preferredPlayers);
                this.run(instances);
                this.flush();
                step++;
                logger.info("#steps[" + step + "] - Player triggered transition(s):{}");
            } while (!requestManager.getJustUpdatedEntities().isEmpty());
        }
    }

    private static final class SelectedTransition {

        Player player;
        StateMachineInstance stateMachineInstance;
        Transition transition;

        public SelectedTransition(Player player, StateMachineInstance stateMachineInstance, Transition transition) {
            this.player = player;
            this.stateMachineInstance = stateMachineInstance;
            this.transition = transition;
        }

        @Override
        public String toString() {
            return "SelectedTransition{player: " + player + "; fsmi: " + stateMachineInstance + " ; transition: " + transition + "}";
        }
    };

    private void run(Map<StateMachineInstance, Player> instances) throws WegasScriptException {

        List<SelectedTransition> selectedTransitions = new ArrayList<>();
        StateMachineCounter stateMachineCounter = requestManager.getEventCounter();

        StateMachineInstance smi;
        Boolean validTransition;
        StateMachineDescriptor sm;
        Player player;

        for (Entry<StateMachineInstance, Player> entry : instances.entrySet()) {
            smi = entry.getKey();
            sm = (StateMachineDescriptor) smi.getDescriptor();

            player = entry.getValue();
            validTransition = false;
            //smi = sm.getInstance(player);
            /*if (!smi.getEnabled() || smi.getCurrentState() == null) { // a state may not be defined : remove statemachine's state when a player is inside that state
                continue;
            }*/
            for (Transition transition : smi.getCurrentState().getSortedTransitions()) {
                String transitionUID = smi.getId() + "-" + transition.getId();

                if (stateMachineCounter.hasAlreadyBeenWalked(transitionUID)) {
                    logger.debug("Loop detected, {} already walked", transition);
                } else {
                    stateMachineCounter.clearCurrents();

                    if (transition instanceof DialogueTransition
                            && ((DialogueTransition) transition).getActionText() != null
                            && !((DialogueTransition) transition).getActionText().translateOrEmpty(player).isEmpty()) {
                        /**
                         * a DialogueTransition with a text means that
                         * transition can only be triggered by hand by a player
                         */
                        continue;
                    } else if (this.isNotDefined(transition.getTriggerCondition())) {
                        // Empty condition is always valid :no need to eval
                        validTransition = true;
                    } else {
                        Object result = null;
                        try {
                            result = scriptManager.eval(player, transition.getTriggerCondition(), sm);

                        } catch (EJBException ex) {
                            logger.error("Transition eval exception: FSM " + sm.getName() + ":" + sm.getId() + ":" + transition.getTriggerCondition().getContent());
                            throw ex;
                        } catch (WegasScriptException ex) {
                            ex.setScript("Variable " + sm.getLabel());
                            requestManager.addException(ex);
                        }

                        if (result instanceof Boolean) {
                            validTransition = (Boolean) result;
                        } else {
                            throw WegasErrorMessage.error("Please review condition "
                                    + "from a transition to state #" + transition.getNextStateId()
                                    + "[" + sm.getLabel() + " / " + sm.getName() + "]:" + transition.getTriggerCondition().getContent());
                        }
                    }

                    if (validTransition) {
                        stateMachineCounter.walk(smi, transitionUID);

                        smi.setCurrentStateId(transition.getNextStateId());

                        selectedTransitions.add(new SelectedTransition(player, smi, transition));

                        smi.transitionHistoryAdd(transition.getId());
                        if (sm instanceof TriggerDescriptor) {
                            TriggerDescriptor td = (TriggerDescriptor) sm;
                            if (td.isDisableSelf()) {
                                smi.setEnabled(false);
                            }
                        }
                        // We have a transition for this state machine, let's process the next FSM
                        break;
                    }
                }
            }
        }

        /* WHAT ? */
 /*@DIRTY, @TODO : find something else : Running scripts overrides previous state change Only for first Player (resetEvent). */
 /* Fixed by lib, currently commenting it  @removeme */
//            this.getAllStateMachines(player.getGameModel());
        for (SelectedTransition selectedTransition : selectedTransitions) {
            //for (Map.Entry<StateMachineInstance, Transition> entry : selectedTransitions.entrySet()) {

            StateMachineInstance fsmi = selectedTransition.stateMachineInstance;
            Transition transition = selectedTransition.transition;
            player = selectedTransition.player;

            List<Script> scripts = new ArrayList<>();

            scripts.add(transition.getPreStateImpact());
            scripts.add(fsmi.getCurrentState().getOnEnterEvent());

            try {
                scriptManager.eval(player, scripts, fsmi.getDescriptor());
            } catch (WegasScriptException ex) {
                ex.setScript("StateMachines impacts");
                requestManager.addException(ex);
                logger.warn("Script failed ", ex);
            }
        }
    }

    /**
     * Test if a script is not defined, ie empty or null
     *
     * @param script to test
     *
     * @return true if the script is undefined
     */
    private Boolean isNotDefined(Script script) {
        return script == null || script.getContent() == null
                || script.getContent().equals("");
    }

    public StateMachineInstance doTransition(Long gameModelId, Long playerId, Long stateMachineDescriptorId, Long transitionId) {
        final Player player = playerFacade.find(playerId);
        StateMachineDescriptor stateMachineDescriptor
                = (StateMachineDescriptor) variableDescriptorFacade.find(stateMachineDescriptorId);
        StateMachineInstance stateMachineInstance = stateMachineDescriptor.getInstance(player);
        State currentState = stateMachineInstance.getCurrentState();
        List<Script> impacts = new ArrayList<>();

        Transition transition = findTransition(transitionId);

        if (transition instanceof DialogueTransition && currentState.equals(transition.getState())) {
            if (isTransitionValid((DialogueTransition) transition, playerId, stateMachineDescriptor)) {
                if (transition.getPreStateImpact() != null) {
                    impacts.add(transition.getPreStateImpact());
                }
                stateMachineInstance.setCurrentStateId(transition.getNextStateId());
                stateMachineInstance.transitionHistoryAdd(transitionId);
                State nextState = stateMachineInstance.getCurrentState();

                requestManager.addEntity(stateMachineInstance.getAudience(), stateMachineInstance, requestManager.getUpdatedEntities());
                /* Force in case next state == current state */

                if (stateMachineInstance.getCurrentState().getOnEnterEvent() != null) {
                    impacts.add(stateMachineInstance.getCurrentState().getOnEnterEvent());
                }
                scriptManager.eval(player, impacts, stateMachineDescriptor);

                try {
                    scriptEvent.fire(player, "dialogueResponse", new TransitionTraveled(stateMachineDescriptor, stateMachineInstance, transition, currentState, nextState));
                } catch (WegasRuntimeException e) {
                    logger.error("EventListener error (\"dialogueResponse\")", e);
                    // GOTCHA no eventManager is instantiated
                }
            }
        }
        return stateMachineInstance;
    }

    /**
     * Access from nashhorn event callback
     */
    public static class TransitionTraveled {

        final public StateMachineDescriptor descriptor;
        final public StateMachineInstance instance;
        final public Transition transition;
        final public State from;
        final public State to;

        private TransitionTraveled(StateMachineDescriptor descriptor, StateMachineInstance instance, Transition transition, State from, State to) {
            this.descriptor = descriptor;
            this.instance = instance;
            this.transition = transition;
            this.from = from;
            this.to = to;
        }
    }

    @Override
    public long countValidTransition(DialogueDescriptor dialogueDescriptor, Player currentPlayer) {
        long count = 0;
        DialogueState currentState = (DialogueState) dialogueDescriptor.getInstance(currentPlayer).getCurrentState();
        for (Transition transition : currentState.getTransitions()) {
            if (isTransitionValid((DialogueTransition) transition, currentPlayer.getId(), dialogueDescriptor)) {
                count++;
            }
        }
        return count;
    }

    private boolean isTransitionValid(DialogueTransition transition, Long playerId, StateMachineDescriptor context) {
        boolean valid = true;

        if (transition.getTriggerCondition() != null && !transition.getTriggerCondition().getContent().equals("")) {
            valid = (Boolean) scriptManager.eval(playerId, transition.getTriggerCondition(), context);
        }
        return valid;
    }

    /**
     *
     * @param event
     *
     * @throws com.wegas.core.exception.internal.WegasNoResultException
     *                                                                  public void descriptorRevivedEvent(@Observes DescriptorRevivedEvent event) throws ScriptException {
     *                                                                  logger.error("Received DescriptorRevivedEvent event");
     *                                                                  if (event.getEntity() instanceof StateMachineDescriptor) {
     *                                                                  StateMachineDescriptor fsmD = (StateMachineDescriptor) event.getEntity();
     *
     * Player player = fsmD.getGameModel().getGames().get(0).getTeams().get(0).getPlayers().get(0);
     *
     * for (State state : fsmD.getStates().values()) {
     * for (Transition transition : state.getTransitions()) {
     * Script triggerCondition = transition.getTriggerCondition();
     * scriptCheck.validate(triggerCondition, player, fsmD);
     * }
     * }
     * }
     * }
     */
}
