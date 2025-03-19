import { History, AnimeHistoryEntry, EpisodeHistoryEntry, HistoryEntries } from "../types/historyTypes";
import Store from "electron-store";
import { getTitle } from "./utils";

const store = new Store();
var history = (store.get('history') || { entries: {} }) as History;

/**
 * Update the last history update timestamp to trigger UI refreshes
 */
export const updateHistoryTimestamp = () => {
  store.set('history_last_updated', Date.now());
};

/**
 * Get the history entry for the anime's id.
 *
 * @param animeId
 * @returns anime history
 */
export const getAnimeHistory = (
  animeId: number
): AnimeHistoryEntry | undefined => history.entries[animeId];

/**
 * Get all entries from local history.
 *
 * @returns history entries
 */
export const getHistoryEntries = (): HistoryEntries => history.entries;

/**
 * Get local history.
 *
 * @returns local history.
 */
export const getHistory = (): History => history;

/**
 * Get history entry for a specific episode
 *
 * @param animeId
 * @param episodeNumber
 * @returns history entry
 */
export const getEpisodeHistory = (
  animeId: number,
  episodeNumber: number
): EpisodeHistoryEntry | undefined => getAnimeHistory(animeId)?.history[episodeNumber]


/**
 * Set local history.
 *
 * @param newHistory
 */
export const setHistory = (
  newHistory: History
) => {
  history = history;
  store.set('history', newHistory);
}

/**
 * Update the anime's entry
 *
 * @param animeHistory
 */
export const setAnimeHistory = (
  animeHistory: AnimeHistoryEntry
) => {
  const listAnimeData = animeHistory.data;

  // Ensure we have valid media data
  if (!listAnimeData || !listAnimeData.media) {
    console.warn('Invalid anime history data: missing media information');
    return;
  }

  const animeId = (listAnimeData.media.id ||
                  listAnimeData.media.mediaListEntry &&
                  listAnimeData.media.mediaListEntry.id) as number;

  // Ensure we have a valid ID
  if (!animeId) {
    console.warn('Invalid anime ID in history data');
    return;
  }

  // Ensure history entries for episodes have at least basic data
  Object.keys(animeHistory.history).forEach(episodeKey => {
    const numericKey = parseInt(episodeKey);
    const episodeEntry = animeHistory.history[episodeKey as unknown as number];

    // Ensure data property exists
    if (!episodeEntry.data) {
      episodeEntry.data = {
        episodeNumber: numericKey || undefined,
        title: { en: `${getTitle(listAnimeData.media)} Special` }
      };
    }

    // Ensure episodeNumber has a value or undefined for specials
    if (episodeEntry.data.episodeNumber === undefined) {
      episodeEntry.data.episodeNumber = numericKey || undefined;
    }

    // Ensure title has a value
    if (!episodeEntry.data.title) {
      episodeEntry.data.title = {
        en: episodeEntry.data.episodeNumber !== undefined
          ? `Episode ${episodeEntry.data.episodeNumber}`
          : `${getTitle(listAnimeData.media)} Special`
      };
    }
  });

  history.entries[animeId] = animeHistory;

  store.set('history', history);

  // Update timestamp to trigger UI refreshes
  updateHistoryTimestamp();
}

/**
 * Get the last watched episode from an anime.
 *
 * @param animeId
 * @returns last watched episode
 */
export const getLastWatchedEpisode = (
  animeId: number
): EpisodeHistoryEntry | undefined => {
  const animeHistory = getAnimeHistory(animeId) as AnimeHistoryEntry;

  if(animeHistory === undefined)
    return;

  return Object.values(animeHistory?.history).reduce((latest, current) => {
    return current.timestamp > latest.timestamp ? current : latest;
  }, Object.values(animeHistory.history)[0]);
}

/**
 * Remove an anime from the watch history.
 *
 * @param animeId The ID of the anime to remove
 * @returns boolean indicating success
 */
export const removeAnimeFromHistory = (animeId: number): boolean => {
  // Check if anime exists in history
  if (!history.entries[animeId]) {
    return false;
  }

  // Create a copy of the history to modify
  const updatedHistory = { ...history };

  // Delete the anime entry
  delete updatedHistory.entries[animeId];

  // Update store
  store.set('history', updatedHistory);

  // Update local cache
  history = updatedHistory;

  // Update timestamp to trigger UI refreshes
  updateHistoryTimestamp();

  return true;
}

/**
 * Clear the entire watch history
 *
 * @returns boolean indicating success
 */
export const clearAllHistory = (): boolean => {
  try {
    // Create an empty history object
    const emptyHistory = { entries: {} };

    // Update store with empty history
    store.set('history', emptyHistory);

    // Update local cache
    history = emptyHistory;

    // Set a flag that history was cleared (for other components to detect)
    store.set('history_cleared_at', Date.now());

    // Update timestamp to trigger UI refreshes
    updateHistoryTimestamp();

    return true;
  } catch (error) {
    console.error('Failed to clear history:', error);
    return false;
  }
}
