import { EventMessage, FastifyInstance, FastifyReply, FastifyRequest, HTTPMethods } from "fastify";
import { Games, Libraries } from "../../models";
import { eq, inArray } from 'drizzle-orm';
import { isAuthenticated } from "../../auth/mw";
import { Player } from "../../models/Players";

interface IGamesToAdd { game_id: number; is_selectable: boolean; id?: number; }
interface ISteamResponse { response: { games: { appid: number; }[]; } }
interface ILibrary { appid: number; game_id?: number }

export const getSteamLibraryOpts = {
  method: 'GET' as HTTPMethods,
  url: '/library-checker',
  handler: getSteamLibrary,
  preValidation: [isAuthenticated]
};

// Fetch the game details from the steam api (is multiplayer or not, essentially)
async function fetchGameDetails(fastify: FastifyInstance, appId: number): Promise<IGamesToAdd | null> {
  const gameDetailsResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
  const gameDetails = await gameDetailsResponse.json() as any;

  if (!gameDetails || !gameDetails[appId].data) {
    fastify.log.warn(`Game ${appId} is not selectable - Steam API is not responding...`);
    return null;
  }

  const isSelectable = gameDetails[appId].data.categories?.some((category: any) => [1, 49, 36].includes(category.id));
  return { game_id: appId, is_selectable: Boolean(isSelectable) };
}

// Get the steam app ids that are not in the database yet
async function getAppIdsNotInDB(fastify: FastifyInstance, steamAppIds: number[]) {
  const existingGames = await fastify.db.select({
    id: Games.model.id,
  }).from(Games.model).where(inArray(Games.model.id, steamAppIds))
  const existingAppIds = new Set(existingGames.map((game: any) => game.id));
  const missingAppIds = steamAppIds.filter(id => !existingAppIds.has(id));

  return missingAppIds;
}

// Insert the new games to the database
async function insertGames(fastify: FastifyInstance, games: IGamesToAdd[]) {
  if (games.length > 0) {
    fastify.log.info(`Inserting ${games.length} games into the database...`);
    // change the property name from game_id to id
    games.forEach(game => game.id = game.game_id);

    await fastify.db.insert(Games.model).values(games).onConflictDoNothing().execute();
  }
}

// Insert the all the new games to the player's library
async function insertGamesIntoLibrary(fastify: FastifyInstance, player_id: bigint, game_ids: number[]) {
  const insertData: { game_id: number, player_id: bigint }[] = game_ids.map(game_id => ({ game_id, player_id }));
  if (insertData.length > 0) {
    fastify.log.info(`Inserting ${insertData.length} games into the library...`);
    await fastify.db.insert(Libraries.model).values(insertData).onConflictDoNothing().execute();
  }
}

async function getSteamLibrary(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as Player;
  const fastify = request.server as FastifyInstance;

  if (!id) return reply.code(401).send({ error: 'Forbidden' });

  reply.sse((async function* (): EventMessage | AsyncIterable<EventMessage> {
    try {
      yield {
        event: 'test',
        data: {id: 5, da: "fggdf"},
      };
      yield { data: JSON.stringify({ message: 'Chargement de ta bibliothèque Steam ...', type: 'info', complete: false }) }
      const library = await fastify.db.select({ game_id: Libraries.model.game_id }).from(Libraries.model).where(eq(Libraries.model.player_id, id));
      const playerLibraryIds = new Set(library.map((game: ILibrary) => game.game_id));

      fastify.log.info(`Fetching Steam library for player ${id}...`);
      const steamLibraryRequest = await fetch(`${fastify.config.STEAM_GetOwnedGames}/?key=${fastify.config.STEAM_API_KEY}&steamid=${id}&include_appinfo=true&include_played_free_games=true&format=json`);
      fastify.log.info(steamLibraryRequest);
      if (steamLibraryRequest == null || steamLibraryRequest.status !== 200) {
        fastify.log.warn(`Steam API is not responding...`);
        yield { data: JSON.stringify({ message: 'La bibliothèque Steam n\'est pas accessible pour le moment', type: 'error', complete: true }) };
        return;
      }
      const steamLibrary = await steamLibraryRequest.json() as ISteamResponse;
      fastify.log.info('Steam library fetched successfully !');
      if (!steamLibrary.response) {
        fastify.log.warn(`Steam API is not responding...`);
        yield { data: JSON.stringify({ message: 'La bibliothèque Steam n\'est pas accessible pour le moment', type: 'error', complete: true }) };
        return;
      }

      yield { data: JSON.stringify({ message: 'Ajout des jeux à la bibliothèque ...', type: 'info', complete: false }) };
      const steamAppIds = steamLibrary.response.games.map((game: ILibrary) => game.appid);
      const gamesToAddToLibrary = steamAppIds.filter((gameId: number) => !playerLibraryIds.has(gameId));

      // get the app ids that are not in the database yet
      fastify.log.info(`Fetching games details from Steam API...`);
      const appIdsNotInDB = await getAppIdsNotInDB(fastify, steamAppIds);

      // insert the games in the Games table if they are not already in the database
      fastify.log.info(`Inserting games into the database...`);
      const gamesToAdd = await Promise.all(appIdsNotInDB.map(appId => fetchGameDetails(fastify, appId)));
      await insertGames(fastify, gamesToAdd.filter(game => game !== null) as IGamesToAdd[]);

      // insert the games in the Libraries table if they are not already in the database
      fastify.log.info(`Inserting games into the library...`);
      yield { data: JSON.stringify({ message: 'Ajout des jeux à ta collection ...', type: 'info', complete: false }) };
      await insertGamesIntoLibrary(fastify, BigInt(id), gamesToAdd.filter(game => game !== null).map(game => game!.game_id));

      // if added games in db is less than gamesToAddToLibrary, then warn the user
      if (gamesToAddToLibrary.length > 0 && gamesToAddToLibrary.length !== gamesToAdd.length) {
        if (gamesToAdd.length <= 1) yield { message: `${gamesToAdd.length} jeu n'a pas pu être ajouté à la bibliothèque !`, type: 'danger' };
        else yield { data: JSON.stringify({ message: `${gamesToAdd.length} jeux n'ont pas pu être ajoutés à la bibliothèque !`, type: 'danger', complete: false }) };

        fastify.log.warn(`Only ${gamesToAdd.length} out of ${gamesToAddToLibrary.length} games were added to the database`);
      }
      yield { data: JSON.stringify({ message: 'Fin du processus de mise à jour de la bibliothèque, vous allez maintenant être redirigé', type: 'success', complete: true }) }
    } catch (err) {
      fastify.log.error(err);
      yield { data: JSON.stringify({ message: 'Une erreur est survenue lors de la mise à jour de ta bibliothèque', type: 'danger', complete: true }) };
    }
  })());
}