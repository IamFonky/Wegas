/*
 * Wegas
 * http://wegas.albasim.ch
 *
 * Copyright (c) 2013-2017 School of Business and Engineering Vaud, Comem
 * Licensed under the MIT License
 */
package com.wegas.core.ejb;

import com.wegas.core.Helper;
import com.wegas.core.async.PopulatorFacade;
import com.wegas.core.async.PopulatorScheduler;
import com.wegas.core.event.internal.lifecycle.EntityCreated;
import com.wegas.core.event.internal.lifecycle.PreEntityRemoved;
import com.wegas.core.exception.client.WegasErrorMessage;
import com.wegas.core.exception.internal.WegasNoResultException;
import com.wegas.core.persistence.game.*;
import com.wegas.core.persistence.game.Populatable.Status;
import com.wegas.core.security.ejb.RoleFacade;
import com.wegas.core.security.ejb.UserFacade;
import com.wegas.core.security.guest.GuestJpaAccount;
import com.wegas.core.security.jparealm.GameAccount;
import com.wegas.core.security.persistence.Permission;
import com.wegas.core.security.persistence.Role;
import com.wegas.core.security.persistence.User;
import org.slf4j.LoggerFactory;

import javax.ejb.EJB;
import javax.ejb.LocalBean;
import javax.ejb.Stateless;
import javax.enterprise.event.Event;
import javax.inject.Inject;
import javax.naming.NamingException;
import javax.persistence.NoResultException;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;

/**
 * @author Francois-Xavier Aeberhard (fx at red-agent.com)
 * @author Cyril Junod (cyril.junod at gmail.com)
 */
@Stateless
@LocalBean
public class GameFacade extends BaseFacade<Game> {

    private static final org.slf4j.Logger logger = LoggerFactory.getLogger(GameFacade.class);

    /**
     * Fired once game created
     */
    @Inject
    private Event<EntityCreated<Game>> gameCreatedEvent;

    /**
     * Fired pre Game removed
     */
    @Inject
    private Event<PreEntityRemoved<Game>> gameRemovedEvent;

    @EJB
    private RequestFacade requestFacade;

    /**
     *
     */
    @EJB
    private GameModelFacade gameModelFacade;

    /**
     *
     */
    @EJB
    private RoleFacade roleFacade;

    /**
     *
     */
    @EJB
    private TeamFacade teamFacade;

    @Inject
    private PlayerFacade playerFacade;

    /**
     *
     */
    @EJB
    private UserFacade userFacade;

    @Inject
    private RequestManager requestManager;

    @Inject
    private PopulatorScheduler populatorScheduler;

    @Inject
    private PopulatorFacade populatorFacade;

    /**
     *
     */
    public GameFacade() {
        super(Game.class);
    }

    /**
     * @param gameModelId
     * @param game
     *
     * @throws IOException
     */
    public void publishAndCreate(final Long gameModelId, final Game game) throws IOException {
        GameModel gm = gameModelFacade.duplicate(gameModelId);
        gm.setName(gameModelFacade.find(gameModelId).getName());// @HACK Set name back to the original
        gm.setComments(""); // Clear comments
        gm.setStatus(GameModel.Status.LIVE);
        gm.setType(GameModel.GmType.PLAY);
        this.create(gm, game);

        // Since Permission on gameModel is provided through game induced permission, revice initial permission on gamemodel:
        userFacade.deletePermissions(userFacade.getCurrentUser(), "GameModel:%:gm" + gm.getId());
    }

    @Override
    public void create(final Game game) {
        this.create(game.getGameModel().getId(), game);
    }

    /**
     * @param gameModelId
     * @param game
     */
    public void create(final Long gameModelId, final Game game) {
        this.create(gameModelFacade.find(gameModelId), game);
    }

    /**
     * @param gameModel
     * @param game
     */
    private void create(final GameModel gameModel, final Game game) {
        final User currentUser = userFacade.getCurrentUser();

        if (game.getToken() == null) {
            game.setToken(this.createUniqueToken(game));
        } else if (this.findByToken(game.getToken()) != null) {
            throw WegasErrorMessage.error("This access key is already in use", "COMMONS-SESSIONS-TAKEN-TOKEN-ERROR");
        }
        getEntityManager().persist(game);

        game.setCreatedBy(!(currentUser.getMainAccount() instanceof GuestJpaAccount) ? currentUser : null); // @hack @fixme, guest are not stored in the db so link wont work
        gameModel.addGame(game);

        gameModelFacade.propagateAndReviveDefaultInstances(gameModel, game, true); // at this step the game is empty (no teams; no players), hence, only Game[Model]Scoped are propagated

        this.addDebugTeam(game);
        gameModelFacade.runStateMachines(gameModel);

        //gameModelFacade.reset(gameModel);                                       // Reset the game so the default player will have instances
        userFacade.addTrainerToGame(currentUser.getId(), game.getId());

        /*try {                                                                   // By default games can be join w/ token
            roleFacade.findByName("Public").addPermission("Game:Token:g" + game.getId());
        } catch (WegasNoResultException ex) {
            logger.error("Unable to find Role: Public");
        }*/
        gameCreatedEvent.fire(new EntityCreated<>(game));
    }

    /**
     * Add a debugteam within the game, unless such a team already exists
     *
     * @param game the game
     *
     * @return
     */
    public boolean addDebugTeam(Game game) {
        if (!game.hasDebugTeam()) {
            DebugTeam debugTeam = new DebugTeam();
            debugTeam.setGame(game);
            debugTeam.getPlayers().get(0).setStatus(Status.LIVE);
            teamFacade.create(debugTeam);
            //Player get = debugTeam.getPlayers().get(0);
            //requestFacade.commit(get, false);
            //game.addTeam(new DebugTeam());
            return true;
        } else {
            return false;
        }
    }

    /**
     * @param game
     *
     * @return
     */
    public String createUniqueToken(Game game) {
        //String prefixKey = game.getShortName().toLowerCase().replace(" ", "-");
        String prefixKey = Helper.replaceSpecialCharacters(game.getShortName().toLowerCase().replace(" ", "-"));
        boolean foundUniqueKey = false;
        int counter = 0;
        String key = null;

        int length = 2;
        int maxRequest = 400;
        while (!foundUniqueKey) {
            if (counter > maxRequest) {
                length += 1;
                maxRequest += 400;
            }
            String genLetter = Helper.genRandomLetters(length);
            key = prefixKey + "-" + genLetter;

            Game foundGameByToken = this.findByToken(key);
            if (foundGameByToken == null) {
                foundUniqueKey = true;
            }
            counter += 1;
        }
        return key;
    }

    @Override
    public Game update(final Long entityId, final Game entity) {
        String token = entity.getToken().toLowerCase().replace(" ", "-");
        if (token.length() == 0) {
            throw WegasErrorMessage.error("Access key cannot be empty", "COMMONS-SESSIONS-EMPTY-TOKEN-ERROR");
        }

        Game theGame = this.findByToken(entity.getToken());

        if (theGame != null && !theGame.getId().equals(entity.getId())) {
            throw WegasErrorMessage.error("This access key is already in use", "COMMONS-SESSIONS-TAKEN-TOKEN-ERROR");
        }
        return super.update(entityId, entity);
    }

    @Override
    public void remove(final Game entity) {
        gameRemovedEvent.fire(new PreEntityRemoved<>(entity));

        // This is for retrocompatibility w/ game models that do not habe DebugGame
        if (entity.getGameModel().getGames().size() <= 1
                && !(entity.getGameModel().getGames().get(0) instanceof DebugGame)) {// This is for retrocompatibility w/ game models that do not habe DebugGame
            gameModelFacade.remove(entity.getGameModel());
        } else {
            getEntityManager().remove(entity);
            entity.getGameModel().getGames().remove(entity);
        }

        userFacade.deletePermissions(entity);
    }

    /**
     * Search for a game with token
     *
     * @param token
     *
     * @return first game found or null
     */
    public Game findByToken(final String token) {
        final TypedQuery<Game> tq = getEntityManager().createNamedQuery("Game.findByToken", Game.class).setParameter("token", token).setParameter("status", Game.Status.LIVE);
        try {
            return tq.getSingleResult();
        } catch (NoResultException ex) {
            return null;
        }
    }

    /**
     * @param search
     *
     * @return all game matching the search token
     */
    public List<Game> findByName(final String search) {
        final TypedQuery<Game> query = getEntityManager().createNamedQuery("Game.findByNameLike", Game.class);
        query.setParameter("name", search);
        return query.getResultList();
    }

    /**
     * @param gameModelId
     * @param orderBy     not used...
     *
     * @return all games belonging to the gameModel identified by gameModelId
     *         but DebugGames, ordered by creation time
     */
    public List<Game> findByGameModelId(final Long gameModelId, final String orderBy) {
        return getEntityManager().createQuery("SELECT game FROM Game game "
                + "WHERE TYPE(game) != DebugGame AND game.gameModel.id = :gameModelId ORDER BY game.createdTime DESC", Game.class)
                .setParameter("gameModelId", gameModelId)
                .getResultList();
    }

    /**
     * @param status
     *
     * @return all games which match the given status
     */
    public List<Game> findAll(final Game.Status status) {
        return getEntityManager().createNamedQuery("Game.findByStatus", Game.class).setParameter("status", status).getResultList();
    }

    /**
     * @param userId
     *
     * @return all non deleted games the given user plays in
     */
    public List<Game> findRegisteredGames(final Long userId) {
        final Query getByGameId = getEntityManager().createQuery("SELECT game, p FROM Game game "
                + "LEFT JOIN game.teams t LEFT JOIN  t.players p "
                + "WHERE t.game.id = game.id AND p.team.id = t.id "
                + "AND p.user.id = :userId AND "
                + "(game.status = com.wegas.core.persistence.game.Game.Status.LIVE OR game.status = com.wegas.core.persistence.game.Game.Status.BIN) "
                + "ORDER BY p.joinTime ASC", Game.class)
                .setParameter("userId", userId);

        return this.findRegisterdGames(getByGameId);
    }

    /**
     * @param userId
     * @param gameModelId
     *
     * @return all LIVE games of the given GameModel the given user plays in
     */
    public List<Game> findRegisteredGames(final Long userId, final Long gameModelId) {
        final Query getByGameId = getEntityManager().createQuery("SELECT game, p FROM Game game "
                + "LEFT JOIN game.teams t LEFT JOIN  t.players p "
                + "WHERE t.game.id = game.id AND p.team.id = t.id AND p.user.id = :userId AND game.gameModel.id = :gameModelId "
                + "AND game.status = com.wegas.core.persistence.game.Game.Status.LIVE "
                + "ORDER BY p.joinTime ASC", Game.class)
                .setParameter("userId", userId)
                .setParameter("gameModelId", gameModelId);

        return this.findRegisterdGames(getByGameId);
    }

    /**
     * @param q
     *
     * @return Game query result plus createdTime hack
     */
    private List<Game> findRegisterdGames(final Query q) {
        final List<Game> games = new ArrayList<>();
        for (Object ret : q.getResultList()) {                                // @hack Replace created time by player joined time
            final Object[] r = (Object[]) ret;
            final Game game = (Game) r[0];
            this.getEntityManager().detach(game);
            game.setCreatedTime(((Player) r[1]).getJoinTime());
            games.add(game);
        }
        return games;
    }

    /**
     * @param roleName
     *
     * @return all game the give role has access to
     */
    public Collection<Game> findPublicGamesByRole(String roleName) {
        Collection<Game> games = new ArrayList<>();
        try {
            Role role;
            role = roleFacade.findByName(roleName);
            for (Permission permission : role.getPermissions()) {
                if (permission.getValue().startsWith("Game:View")) {
                    Long gameId = Long.parseLong(permission.getValue().split(":g")[1]);
                    Game game = this.find(gameId);
                    if (game.getStatus() == Game.Status.LIVE) {
                        games.add(game);
                    }
                }
            }
        } catch (WegasNoResultException ex) {
            logger.error("FindPublicGamesByRole: " + roleName + " role not found");
        }
        return games;
    }

    /**
     * Filter out the debug team
     *
     * @param game
     *
     * @return the game without the debug team
     */
    public Game getGameWithoutDebugTeam(Game game) {
        if (game != null) {
            this.detach(game);
            List<Team> withoutDebugTeam = new ArrayList<>();
            for (Team teamToCheck : game.getTeams()) {
                if (!(teamToCheck instanceof DebugTeam)) {
                    withoutDebugTeam.add(teamToCheck);
                }
            }
            game.setTeams(withoutDebugTeam);
        }
        return game;
    }

    public Collection<Game> findByStatusAndUser(Game.Status status) {
        ArrayList<Game> games = new ArrayList<>();
        Map<Long, List<String>> gMatrix = new HashMap<>();
        Map<Long, List<String>> gmMatrix = new HashMap<>();

        String roleQuery = "SELECT p FROM Permission p WHERE "
                + "(p.role.id in "
                + "    (SELECT r.id FROM User u JOIN u.roles r WHERE u.id = :userId)"
                + ")";

        String userQuery = "SELECT p FROM Permission p WHERE p.user.id = :userId";

        gameModelFacade.processQuery(userQuery, gmMatrix, gMatrix, GameModel.GmType.PLAY, GameModel.Status.LIVE, status);
        gameModelFacade.processQuery(roleQuery, gmMatrix, gMatrix, GameModel.GmType.PLAY, GameModel.Status.LIVE, status);

        for (Map.Entry<Long, List<String>> entry : gMatrix.entrySet()) {
            Long id = entry.getKey();
            Game g = this.find(id);
            if (g != null && g.getStatus() == status) {
                List<String> perm = entry.getValue();
                if (perm.contains("Edit") || perm.contains("*")) {
                    Game dg = this.getGameWithoutDebugTeam(g);
                    GameModel dgm = dg.getGameModel();
                    List<String> gmPerm = gmMatrix.get(dgm.getId());
                    if (gmPerm != null) {
                        dgm.setCanView(gmPerm.contains("View") || gmPerm.contains("*"));
                        dgm.setCanEdit(gmPerm.contains("Edit") || gmPerm.contains("*"));
                        dgm.setCanDuplicate(gmPerm.contains("Duplicate") || gmPerm.contains("*"));
                        dgm.setCanInstantiate(gmPerm.contains("Instantiate") || gmPerm.contains("*"));
                    } else {
                        dgm.setCanView(Boolean.FALSE);
                        dgm.setCanEdit(Boolean.FALSE);
                        dgm.setCanDuplicate(Boolean.FALSE);
                        dgm.setCanInstantiate(Boolean.FALSE);
                    }
                    games.add(dg);
                }
            }
        }

        return games;
    }

    /**
     * @param teamId
     * @param userId
     *
     * @return a new player, linked to user, who just joined the team
     */
    public Player joinTeam(Long teamId, Long userId) {
        return this.joinTeam(teamId, userId, null);
    }

    public Player joinTeam(Long teamId, Long userId, String playerName) {
        Player player = playerFacade.joinTeamAndCommit(teamId, userId, playerName);

        player = this.getEntityManager().merge(player);
        populatorScheduler.scheduleCreation();
        int indexOf = populatorFacade.getQueue().indexOf(player);
        player.setQueueSize(indexOf+1);
        return player;
    }

    public Player joinTeam(Long teamId, String playerName) {
        // logger.log(Level.INFO, "Adding user " + userId + " to team: " + teamId + ".");
        return this.joinTeam(teamId, null, playerName);
    }

    /**
     * Player right: View on Game and GameModel Player right: View on Game and
     * GameModel
     *
     * @param user
     * @param game
     */
    public void addRights(User user, Game game) {
        userFacade.addUserPermission(
                user,
                "Game:View:g" + game.getId(), // Add "View" right on game,
                "GameModel:View:gm" + game.getGameModel().getId());             // and also "View" right on its associated game model
    }

    public void recoverRights(Game game) {
        for (Team team : game.getTeams()) {
            for (Player player : team.getPlayers()) {
                User user = player.getUser();
                if (user != null) {
                    this.addRights(user, game);
                }
            }
        }
    }

    /**
     * Bin given game, changing it's status to {@link Status#BIN}
     *
     * @param entity Game
     */
    public void bin(Game entity) {
        entity.setStatus(Game.Status.BIN);
    }

    /**
     * Set game status, changing to {@link Status#LIVE}
     *
     * @param entity Game
     */
    public void live(Game entity) {
        entity.setStatus(Game.Status.LIVE);
    }

    /**
     * Set game status, changing to {@link Status#DELETE}
     *
     * @param entity GameModel
     */
    public void delete(Game entity) {
        entity.setStatus(Game.Status.DELETE);
    }

    /**
     * Reset a game
     *
     * @param game the game to reset
     */
    public void reset(final Game game) {
        gameModelFacade.propagateAndReviveDefaultInstances(game.getGameModel(), game, false);
        gameModelFacade.runStateMachines(game);
    }

    /**
     * Reset a game
     *
     * @param gameId id of the game to reset
     */
    public void reset(Long gameId) {
        this.reset(this.find(gameId));
    }

    public static GameFacade lookup() {
        try {
            return Helper.lookupBy(GameFacade.class);
        } catch (NamingException ex) {
            logger.error("Error retrieving game facade", ex);
            return null;
        }
    }

    /**
     * Since the team create is done in two step, we have to ensure the team is
     * scheduled
     *
     * @param gameId
     * @param t
     *
     * @return
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public Team createAndCommit(Long gameId, Team t) {
        Game g = this.find(gameId);

        // @Hack If user is on a game account, use it as team name
        if (userFacade.getCurrentUser().getMainAccount() instanceof GameAccount) {
            //&& t.getName() == null ) {
            t.setName(((GameAccount) userFacade.getCurrentUser().getMainAccount()).getEmail());
        }
        g.addTeam(t);
        g = this.find(gameId);
        this.addRights(userFacade.getCurrentUser(), g);  // @fixme Should only be done for a player, but is done here since it will be needed in later requests to add a player
        getEntityManager().persist(t);

        return t;
    }
}
