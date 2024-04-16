import { useAuthStore } from "../../../store/authStore";
import { useSteamderStore } from "../../../store/steamderStore";
import { calculateAllGames } from "../../../utils/calculateAllGames";
import { calculateCommonGames } from "../../../utils/calculateCommonGames";

export const leaveSteamder = (): void => {
    const { setSteamder, steamder } = useSteamderStore.getState();
    const { user } = useAuthStore.getState();
    if (!user || !steamder) return;

    // Remove the current user from the steamder room and update the common games
    const common_games = calculateCommonGames({ ...steamder, players: steamder.players.filter((current) => current.player_id !== user.id) }) || [];

    // count every games in the steamder (each game id from all players is counted only once)
    const all_games = calculateAllGames(steamder.players.filter((current) => current.player_id !== user.id));

    setSteamder({ 
        ...steamder, 
        players: steamder.players.filter((current) => current.player_id !== user.id),
        common_games: common_games.length,
        // count every games in the steamder (without duplicates)
        all_games
    });
}