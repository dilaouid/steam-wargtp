import { getCookieValue } from "@core/utils/cookies";

import { BASE_URL } from '@core/environment';

export const kickSteamder = (steamderId: string, playerId: string) => {
    const token = getCookieValue('token');
    return fetch(`${BASE_URL}/steamder/${steamderId}/kick/${playerId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
            Authorization: `Bearer ${token}`
        }
    }).then(response => {
        if (!response.ok)
            throw new Error("Impossible d'exclure le joueur de la Steamder");
        return response.json();
    }).catch(err => {
        console.error("Erreur lors de l'exclusion du joueur de la Steamder :", err);
        throw new Error(err as string);
    });
}