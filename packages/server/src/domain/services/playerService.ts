import { FastifyInstance } from "fastify";
import {
  deletePlayer,
  getPlayer,
  getPlayerAccordingToId,
  getPlayers,
  getPlayerSteamder,
  insertPlayer,
  leaveSteamder,
  TGetPlayersOptions,
  updatePlayer,
} from "@repositories";
import { Player } from "@entities";
import { HttpError } from "domain/HttpError";
import { TGetPlayersQuery } from "@validations/dashboard";

/**
 * Updates the avatar hash for a player.
 *
 * @param fastify - The Fastify instance.
 * @param id - The ID of the player.
 * @param currentHash - The current avatar hash.
 * @param avatarHash - The new avatar hash.
 */
export const updateAvatarHash = async (
  fastify: FastifyInstance,
  id: bigint,
  currentHash: string,
  avatarHash: string
) => {
  if (currentHash !== avatarHash) {
    fastify.log.info(`Updating avatar hash for ${id}`);
    await updatePlayer(fastify, id, { avatar_hash: avatarHash });
  }
};

/**
 * Updates the username for a player.
 *
 * @param fastify - The Fastify instance.
 * @param id - The ID of the player.
 * @param currentUsername - The current username of the player.
 * @param username - The new username to update.
 */
export const updateUsername = async (
  fastify: FastifyInstance,
  id: bigint,
  currentUsername: string,
  username: string
) => {
  if (currentUsername !== username) {
    fastify.log.info(`Updating username for ${id}`);
    await updatePlayer(fastify, id, { username });
  }
};

/**
 * Updates the profile URL for a player.
 *
 * @param fastify - The Fastify instance.
 * @param id - The ID of the player.
 * @param currentProfileUrl - The current profile URL of the player.
 * @param profileUrl - The new profile URL to update.
 * @returns A promise that resolves when the profile URL is updated.
 */
export const updateProfileUrl = async (
  fastify: FastifyInstance,
  id: bigint,
  currentProfileUrl: string,
  profileUrl: string
) => {
  if (currentProfileUrl !== profileUrl) {
    fastify.log.info(`Updating profile URL for ${id}`);
    await updatePlayer(fastify, id, { profileurl: profileUrl });
  }
};

export const updateNewData = async (
  fastify: FastifyInstance,
  id: bigint,
  data: Partial<Player>,
  newData: { personaname: string; avatarhash: string; profileurl: string }
) => {
  fastify.log.warn("User already exists");
  await updateAvatarHash(
    fastify,
    id,
    data.avatar_hash as string,
    newData.avatarhash as string
  );
  await updateUsername(
    fastify,
    id,
    data.username as string,
    newData.personaname as string
  );
  await updateProfileUrl(
    fastify,
    id,
    data.profileurl as string,
    newData.profileurl as string
  );
};

export const retrieveUserById = async (
  fastify: FastifyInstance,
  id: bigint,
  player: { personaname: string; avatarhash: string; profileurl: string }
) => {
  const [user] = await getPlayerAccordingToId(fastify, id);
  if (!user) {
    fastify.log.info("Inserting new user");
    const [newUser] = await insertPlayer(fastify, { id, avatar_hash: player.avatarhash, username: player.personaname, profileurl: player.profileurl }, [
      "id",
      "avatar_hash",
    ]);
    return newUser;
  } else {
    fastify.log.warn("User already exists");
    await updateNewData(fastify, id, user, player);
    return user;
  }
};

export const getUserInfo = async (
  fastify: FastifyInstance,
  id: bigint
) => {
  try {
    const player = await getPlayer(fastify, id);

    return player;
  } catch (err: any) {
    if (err instanceof HttpError)
      throw err;
    throw new HttpError({
      message: "player_not_found",
      statusCode: 404
    });
  }
};

export const getPlayersInfo = async (
  fastify: FastifyInstance,
  query: TGetPlayersQuery
) => {
  try {
    const options: TGetPlayersOptions = {
      page: query.page,
      limit: query.limit,
      sort: query.sort_field && query.sort_order
        ? {
          field: query.sort_field,
          order: query.sort_order
        }
        : undefined,
      filters: {
        search: query.search,
        isAdmin: query.is_admin,
        hasActiveSteamder: query.has_active_steamder,
        minGamesInLibrary: query.min_games
      }
    };

    if (options.filters) {
      Object.keys(options.filters).forEach(key => {
        if (options.filters![key as keyof typeof options.filters] === undefined) {
          delete options.filters![key as keyof typeof options.filters];
        }
      });

      if (Object.keys(options.filters).length === 0) {
        delete options.filters;
      }
    }

    const players = await getPlayers(fastify, options);
    return players;

  } catch (err: any) {
    if (err instanceof HttpError) throw err;

    throw new HttpError({
      message: "failed_to_get_players",
      statusCode: 500
    });
  }
};

export const deleteUser = async (
  fastify: FastifyInstance,
  id: bigint
) => {
  try {
    const [ playerExists ] = await getPlayer(fastify, id);
    if (!playerExists) {
      throw new HttpError({
        message: "player_not_found",
        statusCode: 404
      })
    }

    const [ playerSteamder ] = await getPlayerSteamder(fastify, id);
    if (playerSteamder) {
      await leaveSteamder(fastify, id, playerSteamder.id);
    }

    await deletePlayer(fastify, id);

    // also update steamders live in websockets (todo)
    // const steamders = fastify.steamders.get(id.toString());
  } catch (err: any) {
    if (err instanceof HttpError) throw err;

    throw new HttpError({
      message: "failed_to_delete_player",
      statusCode: 500
    });
  }
};

export const update = async (fastify: FastifyInstance, id: bigint, data: Partial<Player>) => {
  try {
    await updatePlayer(fastify, id, data);
  } catch (err) {
    if (err instanceof HttpError) throw err;

    throw new HttpError({
      message: "failed_to_update_player",
      statusCode: 500
    });
  }
};