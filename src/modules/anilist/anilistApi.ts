import { app } from 'electron';
import Store from 'electron-store';

import {
  AnimeData,
  CurrentListAnime,
  ListAnimeData,
  MostPopularAnime,
  TrendingAnime,
} from '../../types/anilistAPITypes';
import { AiringPage, AiringSchedule, Media, MediaListStatus} from '../../types/anilistGraphQLTypes';
import { ClientData } from '../../types/types';
import { clientData } from '../clientData';
import isAppImage from '../packaging/isAppImage';
import { getOptions, makeRequest } from '../requests';

const STORE: any = new Store();
const CLIENT_DATA: ClientData = clientData;
const PAGES: number = 20;
const METHOD: string = 'POST';
const GRAPH_QL_URL: string = 'https://graphql.anilist.co';
const HEADERS: Object = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};
const RECOMMEND_DATA: string = `
        recommendations(sort:RATING_DESC) {
          nodes {
            id
            rating
            mediaRecommendation {
              id
              idMal
              type
              title {
                  romaji
                  english
                  native
                  userPreferred
              }
              format
              status
              description
              startDate {
                  year
                  month
                  day
              }
              endDate {
                  year
                  month
                  day
              }
              season
              seasonYear
              episodes
              duration
              coverImage {
                  large
                  extraLarge
                  color
              }
              bannerImage
              genres
              synonyms
              averageScore
              meanScore
              popularity
              favourites
              isAdult
              nextAiringEpisode {
                  id
                  timeUntilAiring
                  episode
                  airingAt
              }
              mediaListEntry {
                  id
                  mediaId
                  status
                  score(format:POINT_10)
                  progress
              }
              siteUrl
              trailer {
                  id
                  site
                  thumbnail
              }
            }
          }
        }`
const MEDIA_DATA: string = `
        id
        idMal
        type
        title {
            romaji
            english
            native
            userPreferred
        }
        format
        status
        description
        startDate {
            year
            month
            day
        }
        endDate {
            year
            month
            day
        }
        season
        seasonYear
        episodes
        duration
        coverImage {
            large
            extraLarge
            color
        }
        bannerImage
        genres
        synonyms
        tags {
            id
            name
            category
            rank
            isGeneralSpoiler
            isMediaSpoiler
        }
        averageScore
        meanScore
        popularity
        favourites
        isAdult
        nextAiringEpisode {
            id
            timeUntilAiring
            episode
            airingAt
        }
        airingSchedule {
          edges {
            node {
              episode
            }
          }
        }
        mediaListEntry {
            id
            mediaId
            status
            score(format:POINT_10)
            progress
        }
        siteUrl
        trailer {
            id
            site
            thumbnail
        }
        relations {
          edges {
            id
            relationType(version: 2)
            node {
              id
              idMal
              type
              title {
                  romaji
                  english
                  native
                  userPreferred
              }
              format
              status
              description
              startDate {
                  year
                  month
                  day
              }
              endDate {
                  year
                  month
                  day
              }
              season
              seasonYear
              episodes
              duration
              coverImage {
                  large
                  extraLarge
                  color
              }
              bannerImage
              genres
              synonyms
              averageScore
              meanScore
              popularity
              favourites
              isAdult
              nextAiringEpisode {
                  id
                  timeUntilAiring
                  episode
              }
              airingSchedule {
                edges {
                  node {
                    episode
                  }
                }
              }
              mediaListEntry {
                  id
                  mediaId
                  status
                  score(format:POINT_10)
                  progress
              }
              siteUrl
              trailer {
                  id
                  site
                  thumbnail
              }
            }
          }
        }
        ${RECOMMEND_DATA}
    `;

const filterAdultMedia = (media?: Media) =>
  media && !media.isAdult;

/**
 * Retrieves the access token for the api
 *
 * @param {*} code
 * @returns access token
 */
export const getAccessToken = async (code: string): Promise<string> => {
  const url = 'https://anilist.co/api/v2/oauth/token';

  const data = {
    grant_type: 'authorization_code',
    client_id: CLIENT_DATA.clientId,
    client_secret: CLIENT_DATA.clientSecret,
    redirect_uri: clientData.redirectUri,
    code: code,
  };

  const respData = await makeRequest(METHOD, url, HEADERS, data);
  return respData.access_token;
};

/**
 * Gets the anilist viewer (user) id
 *
 * @returns viewer id
 */
export const getViewerId = async (): Promise<number> => {
  var query = `
          query {
              Viewer {
                  id
              }
          }
      `;

  var headers = {
    Authorization: 'Bearer ' + STORE.get('access_token'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  return respData.data.Viewer.id;
};

/**
 * Gets the viewer (user) info
 *
 * @param {*} viewerId
 * @returns object with viewer info
 */
export const getViewerInfo = async (viewerId: number | null) => {
  var query = `
          query($userId : Int) {
              User(id: $userId, sort: ID) {
                  id
                  name
                  avatar {
                      medium
                  }
                  options {
                    displayAdultContent
                  }
              }
          }
      `;

  var headers = {
    Authorization: 'Bearer ' + STORE.get('access_token'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  var variables = {
    userId: viewerId,
  };

  const options = getOptions(query, variables);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  return respData.data.User;
};

/**
 * Gets viewer lists (current, completed...)
 *
 * @param {*} viewerId
 * @param {*} statuses
 * @returns object with anime entries
 */
export const getViewerLists = async (
  viewerId: number,
  ...statuses: MediaListStatus[]
): Promise<CurrentListAnime> => {
  var query = `
          query($userId : Int, $statuses: [MediaListStatus]) {
              MediaListCollection(userId : $userId, type: ANIME, status_in: $statuses, sort: UPDATED_TIME_DESC) {
                  lists {
                      isCustomList
                      name
                      status
                      entries {
                          id
                          mediaId
                          progress
                          media {
                              ${MEDIA_DATA}
                          }
                      }
                  }
              }
          }
      `;

  var headers = {
    Authorization: 'Bearer ' + STORE.get('access_token'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  var variables = {
    userId: viewerId,
    statuses: statuses
  };

  const options = getOptions(query, variables);

  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  const lists = respData.data.MediaListCollection.lists.length === 0
  ? []
  : (respData.data.MediaListCollection.lists as Array<any>);

  return lists.map(value => value.entries).flat();
};

/**
 * Gets a viewer list (current, completed...)
 *
 * @param {*} viewerId
 * @param {*} status
 * @returns object with anime entries
 */
export const getViewerList = async (
  viewerId: number,
  status: MediaListStatus,
): Promise<CurrentListAnime> => {
  var query = `
          query($userId : Int) {
              MediaListCollection(userId : $userId, type: ANIME, status : ${status}, sort: UPDATED_TIME_DESC) {
                  lists {
                      isCustomList
                      name
                      entries {
                          id
                          mediaId
                          progress
                          media {
                              ${MEDIA_DATA}
                          }
                      }
                  }
              }
          }
      `;

  var headers = {
    Authorization: 'Bearer ' + STORE.get('access_token'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  var variables = {
    userId: viewerId,
  };

  const options = getOptions(query, variables);

  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  return respData.data.MediaListCollection.lists.length === 0
    ? []
    : respData.data.MediaListCollection.lists[0].entries;
};

// NOT WORKING
export const getFollowingUsers = async (viewerId: any) => {
  var query = `
          query($userId : Int) {
              User(id: $userId, sort: ID) {
                  id
                  name
                  avatar {
                      large
                  }
              }
          }
      `;

  var headers = {
    Authorization: 'Bearer ' + STORE.get('access_token'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  var variables = {
    userId: viewerId,
  };

  const options = getOptions(query, variables);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);
};

const sanitizeString = (input: string) => JSON.stringify(input).slice(1, -1).replace(/[{};`\\"'\!]/g, '');

/**
 * Gets a list of anime from a list of titles.
 *
 * @param titles
 * @returns anime list
 */
export const getAnimesFromTitles = async (titles: string[]) => {
  let query_variables: string[] = [];
  let variables: { [key: string]: string } = {};
  let search_text: string[] = [];

  const results: ListAnimeData[] = [];
  const headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
  };

  for (let index = 0; index < titles.length; index++) {
      const value = titles[index];
      const id: string = `anime${query_variables.length}`;

      query_variables.push(`$${id}: String`);
      search_text.push(`    ${id}: Media(search: $${id}, type: ANIME) { ${MEDIA_DATA} }`);
      variables[id] = sanitizeString(value).replaceAll('Part', '');

      if (query_variables.length > 2 || index === titles.length - 1) {
          const query = `
              query(${query_variables.join(", ")}) {
              ${search_text.join("\n")}
              }
          `;
          try {
            const options = getOptions(query, variables);
            const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

            for (let i = 0; i < query_variables.length; i++) {
                const id = `anime${i}`;
                results.push({
                    id: null,
                    mediaId: null,
                    progress: null,
                    media: respData.data[id],
                });
            }
          } catch (error) {
            console.log('Batch search error:', error);
          }

          query_variables = [];
          variables = {};
          search_text = [];
      }
  }

  return results;
};


/**
 * Gets the info from an anime
 *
 * @param {*} animeId
 * @returns object with anime info
 */
export const getAnimeInfo = async (animeId: any): Promise<Media> => {
  var query = `
          query($id: Int) {
              Media(id: $id, type: ANIME) {
                  ${MEDIA_DATA}
              }
          }
      `;

      var headers: {[key: string]: string} = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (STORE.has('access_token'))
        headers.Authorization = 'Bearer ' + STORE.get('access_token');

      var variables = {
        id: animeId,
      };

      const options = getOptions(query, variables);
      const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  return respData.data.Media as Media;
};

/**
 * get aired anime
 *
 * @param viewerId
 * @param airingAt
 * @returns a list of aired anime
 */

export const getAiredAnime = async (
  viewerId: number | null,
  amount: number = PAGES,
  timeOffset: number = 43200,
  airingAt: number = Date.now() / 1000,
  page: number = 1,
) => {
  airingAt = Math.floor(airingAt);
  const airingAfter = Math.floor(airingAt - timeOffset);

  const query = `
  query {
    Page(page: ${page}, perPage: ${amount}) {
      pageInfo {
        hasNextPage
      },
      airingSchedules(airingAt_greater: ${airingAfter}, airingAt_lesser: ${airingAt}) {
        episode,
        timeUntilAiring,
        airingAt,
        media {
          ${MEDIA_DATA}
        }
      }
    }
  }`;

  if (viewerId) {
    var headers: any = {
      Authorization: 'Bearer ' + STORE.get('access_token'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  } else {
    var headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);
  const pageData = respData.data.Page as AiringPage;

  pageData.airingSchedules = pageData.airingSchedules.reverse();

  const adultContent = STORE.get('adult_content') as boolean;
  if (!adultContent)
    pageData.airingSchedules = pageData.airingSchedules.filter((value) => filterAdultMedia(value.media));

  return pageData
};

/**
 * gets airing schedule
 *
 * @param viewerId
 * @returns
 */

export const getAiringSchedule = async (
  viewerId: number | null,
  startTime: number = Math.floor(Date.now() / 1000),
  endTime?: number,
  specificDay?: string // Optional parameter to specify day of week (0-6)
) => {
  // If we have a specific day, calculate start and end time for that day only
  if (specificDay !== undefined) {
    const today = new Date();
    const currentDayOfWeek = today.getDay();

    // Convert specificDay to a number if it's a string day name
    let dayIndex = parseInt(specificDay);
    if (isNaN(dayIndex)) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayIndex = days.indexOf(specificDay);

      if (dayIndex === -1) {
        console.error('Invalid day name provided:', specificDay);
        return { schedules: [], rateLimited: false };
      }
    }

    // Calculate how many days to add to today to get to the target day
    const daysToAdd = (dayIndex - currentDayOfWeek + 7) % 7;

    // Create a date for the specific day at midnight
    const targetDay = new Date(today);
    targetDay.setDate(today.getDate() + daysToAdd);
    targetDay.setHours(0, 0, 0, 0);

    // End time is the end of the target day
    const targetDayEnd = new Date(targetDay);
    targetDayEnd.setHours(23, 59, 59, 999);

    // Update start and end times
    startTime = Math.floor(targetDay.getTime() / 1000);
    endTime = Math.floor(targetDayEnd.getTime() / 1000);
  }

  // If endTime is provided, use it in the query, otherwise just use startTime as lower bound
  const timeConstraint = endTime
    ? `airingAt_greater: ${startTime}, airingAt_lesser: ${endTime}`
    : `airingAt_greater: ${startTime}`;

  // We'll handle pagination more explicitly to ensure we get all results
  let allAiringSchedules: AiringSchedule[] = [];
  let hasNextPage = true;
  let currentPage = 1;
  let rateLimited = false;
  const maxPages = specificDay ? 1 : 2; // Use single page for specific day requests

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  while (hasNextPage && currentPage <= maxPages) {
    try {
      // If we're on page 2+, add a significant delay to avoid rate limiting
      if (currentPage > 1) {
        await delay(2000); // Wait 2 seconds between requests
      }

      const query = `
      query {
        Page(page: ${currentPage}, perPage: 50) {
          pageInfo {
            hasNextPage
            currentPage
            lastPage
          },
          airingSchedules(${timeConstraint}, sort: TIME) {
            id,
            episode,
            timeUntilAiring,
            airingAt,
            media {
              ${MEDIA_DATA}
            }
          }
        }
      }`;

      if (viewerId) {
        var headers: any = {
          Authorization: 'Bearer ' + STORE.get('access_token'),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
      } else {
        var headers: any = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
      }

      const options = getOptions(query);
      const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

      if (!respData || !respData.data || !respData.data.Page) {
        console.warn('Unexpected API response format', respData);
        break;
      }

      const pageData = respData.data.Page as AiringPage;

      if (pageData.airingSchedules && pageData.airingSchedules.length > 0) {
        console.log(`Fetched ${pageData.airingSchedules.length} anime from page ${currentPage}`);
        allAiringSchedules = [...allAiringSchedules, ...pageData.airingSchedules];
      }

      hasNextPage = pageData.pageInfo.hasNextPage;
      currentPage++;
    } catch (error: any) {
      console.error("Error fetching airing schedule:", error);

      // If we hit rate limit (429), set the flag and break the loop
      if (error.response && error.response.status === 429) {
        console.log('Rate limited by API. Returning partial data.');
        rateLimited = true;
        break;
      } else {
        // For other errors, just stop fetching more pages
        hasNextPage = false;
      }
    }
  }

  const adultContent = STORE.get('adult_content') as boolean;
  if (!adultContent)
    allAiringSchedules = allAiringSchedules.filter((value) => filterAdultMedia(value.media));

  // Return the data we have with a flag indicating if we were rate limited
  return {
    schedules: allAiringSchedules,
    rateLimited: rateLimited || (hasNextPage && currentPage <= maxPages)
  };
};

/**
 * Gets the current trending animes on anilist
 * pass viewerId to make an authenticated request
 *
 * @param {*} viewerId
 * @returns object with trending animes
 */
export const getTrendingAnime = async (
  viewerId: number | null,
): Promise<TrendingAnime> => {
  var query = `
      {
          Page(page: 1, perPage: ${PAGES}) {
              pageInfo {
                  total
                  currentPage
                  hasNextPage
              }
              media(sort: TRENDING_DESC, type: ANIME) {
                  ${MEDIA_DATA}
              }
          }
      }
      `;

  if (viewerId) {
    var headers: any = {
      Authorization: 'Bearer ' + STORE.get('access_token'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  } else {
    var headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);
  return respData.data.Page;
};

/**
 * Gets the current most popular animes on anilist
 * pass viewerId to make an authenticated request
 *
 * @param {*} viewerId
 * @param {number} page - The page number to fetch (default: 1)
 * @returns object with most popular animes
 */
export const getMostPopularAnime = async (
  viewerId: number | null,
  page: number = 1,
): Promise<MostPopularAnime> => {
  var query = `
      {
          Page(page: ${page}, perPage: ${PAGES}) {
              pageInfo {
                  total
                  currentPage
                  lastPage
                  hasNextPage
                  perPage
              }
              media(sort: POPULARITY_DESC, type: ANIME) {
                  ${MEDIA_DATA}
              }
          }
      }
      `;

  if (viewerId) {
    var headers: any = {
      Authorization: 'Bearer ' + STORE.get('access_token'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  } else {
    var headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  return respData.data.Page;
};

/**
 * Gets the next anime releases
 *
 * @returns object with next anime releases
 */
export const getNextReleases = async (viewerId: number | null) => {
  var query = `
      {
          Page(page: 1, perPage: ${PAGES}) {
              pageInfo {
                  total
                  currentPage
                  hasNextPage
              }
              media(status: NOT_YET_RELEASED, sort: POPULARITY_DESC, type: ANIME) {
                  ${MEDIA_DATA}
              }
          }
      }
      `;

  if (viewerId) {
    var headers: any = {
      Authorization: 'Bearer ' + STORE.get('access_token'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  } else {
    var headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  return respData.data.Page;
};

/**
 * Gets searched anime with filters
 *
 * @param {*} args
 * @returns object with the searched filtered anime
 */
export const searchFilteredAnime = async (
  args: string,
  viewerId: number | null,
  page: number = 1
): Promise<AnimeData> => {
  var query = `
      {
          Page(page: ${page}, perPage: 50) {
              pageInfo {
                  total
                  currentPage
                  hasNextPage
              }
              media(${args}) {
                  ${MEDIA_DATA}
              }
          }
      }
      `;

  if (viewerId) {
    var headers: any = {
      Authorization: 'Bearer ' + STORE.get('access_token'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  } else {
    var headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  return respData.data.Page;
};

/**
 * Gets the next anime releases
 *
 * @returns object with next anime releases
 */
export const releasingAnimes = async (viewerId: number | null, sort: string, perPage: number) => {
  var query = `
      {
          Page(page: 1, perPage: ${perPage}) {
              pageInfo {
                  total
                  currentPage
                  hasNextPage
              }
              media(status: NOT_YET_RELEASED, sort: ${sort}, type: ANIME) {
                  ${MEDIA_DATA}
              }
          }
      }
      `;

  if (viewerId) {
    var headers: any = {
      Authorization: 'Bearer ' + STORE.get('access_token'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  } else {
    var headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  return respData.data.Page;
};

/**
 * Gets the current trending animes filtered by a genre
 * pass viewerId to make an authenticated request
 *
 * @param {*} genre
 * @param {*} viewerId
 * @returns object with animes entries filtered by genre
 */
export const getAnimesByGenre = async (genre: any, viewerId: number | null) => {
  var query = `
      {
          Page(page: 1, perPage: ${PAGES}) {
              pageInfo {
                  total
                  currentPage
                  hasNextPage
              }
              media(genre: "${genre}", sort: TRENDING_DESC, type: ANIME) {
                  ${MEDIA_DATA}
              }
          }
      }
      `;

  if (viewerId) {
    var headers: any = {
      Authorization: 'Bearer ' + STORE.get('access_token'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  } else {
    var headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  return respData.data.Page;
};

/**
 * Gets anime entries from a search query
 *
 * @param {*} input
 * @returns object with searched animes
 */
export const getSearchedAnimes = async (input: any) => {
  var query = `
      {
          Page(page: 1, perPage: ${PAGES}) {
              pageInfo {
                  total
                  currentPage
                  lastPage
                  hasNextPage
                  perPage
              }
              media(search: "${input}", type: ANIME, sort: SEARCH_MATCH) {
                  ${MEDIA_DATA}
              }
          }
      }
      `;

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, HEADERS, options);

  return respData.data.Page.media;
};

/* MUTATIONS */

/**
 * Updates a media entry list
 *
 * @param mediaId
 * @param status
 * @param scoreRaw
 * @param progress
 * @returns media list entry id
 */
export const updateAnimeFromList = async (
  mediaId: any,
  status?: any,
  scoreRaw?: any,
  progress?: any,
): Promise<number | null> => {
  try {
    var query = `
          mutation($mediaId: Int${progress ? ', $progress: Int' : ''}${scoreRaw ? ', $scoreRaw: Int' : ''}${status ? ', $status: MediaListStatus' : ''}) {
              SaveMediaListEntry(mediaId: $mediaId${progress ? ', progress: $progress' : ''}${scoreRaw ? ', scoreRaw: $scoreRaw' : ''}${status ? ', status: $status' : ''}) {
                  id
              }
          }
      `;

    var headers = {
      Authorization: 'Bearer ' + STORE.get('access_token'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    var variables: any = {
      mediaId: mediaId,
    };

    if (status !== undefined) variables.status = status;
    if (scoreRaw !== undefined) variables.scoreRaw = scoreRaw;
    if (progress !== undefined) variables.progress = progress;

    const options = getOptions(query, variables);
    const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

    console.log(
      `Anime list updated (status: ${status},score: ${scoreRaw},progress: ${progress}) for list ${mediaId}`,
    );

    return respData.data.SaveMediaListEntry.id;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const deleteAnimeFromList = async (id: any): Promise<boolean> => {
  try {
    var query = `
          mutation($id: Int){
              DeleteMediaListEntry(id: $id){
                  deleted
              }
          }
      `;

    console.log('delte: ', id);

    var headers = {
      Authorization: 'Bearer ' + STORE.get('access_token'),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    var variables = {
      id: id,
    };

    const options = getOptions(query, variables);
    const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

    return respData
  } catch (error) {
    console.log(error);
    return false;
  }
};

/**
 * Updates the progress of an anime on list
 *
 * @param {*} mediaId
 * @param {*} progress
 */
export const updateAnimeProgress = async (
  mediaId: number,
  progress: number,
) => {
  var query = `
          mutation($mediaId: Int, $progress: Int) {
              SaveMediaListEntry(mediaId: $mediaId, progress: $progress) {
                  id
                  progress
              }
          }
      `;

  var headers = {
    Authorization: 'Bearer ' + STORE.get('access_token'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  var variables = {
    mediaId: mediaId,
    progress: progress,
  };

  const options = getOptions(query, variables);
  await makeRequest(METHOD, GRAPH_QL_URL, headers, options);

  console.log(`Progress updated (${progress}) for anime ${mediaId}`);
};

// Add these functions using existing API patterns
export const getNewReleases = async (viewerId: number | null, page: number = 1) => {
  // Get current date in YYYYMMDD format
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const formattedDate = `${year}${month}${day}`;

  const query = `
    query {
      Page(page: ${page}, perPage: 50) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(
          type: ANIME
          sort: START_DATE_DESC
          status: RELEASING
          startDate_lesser: ${formattedDate}
          isAdult: ${STORE.get('adult_content') ? 'false' : 'false'}
          episodes_greater: 0
        ) {
          ${MEDIA_DATA}
        }
      }
    }
  `;

  const headers = viewerId ? {
    Authorization: 'Bearer ' + STORE.get('access_token'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  } : HEADERS;

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);
  return respData.data.Page;
};

export const getTopRated = async (viewerId: number | null, page: number = 1) => {
  const query = `
    query {
      Page(page: ${page}, perPage: 50) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(
          type: ANIME
          sort: SCORE_DESC
          status_not: NOT_YET_RELEASED
          isAdult: ${STORE.get('adult_content') ? 'false' : 'false'}
        ) {
          ${MEDIA_DATA}
        }
      }
    }
  `;

  const headers = viewerId ? {
    Authorization: 'Bearer ' + STORE.get('access_token'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  } : HEADERS;

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);
  return respData.data.Page;
};

/**
 * Gets upcoming anime (not yet released)
 *
 * @param viewerId
 * @returns object with upcoming anime releases
 */
export const getUpcomingAnime = async (viewerId: number | null) => {
  const query = `
    {
      Page(page: 1, perPage: 20) {
        pageInfo {
          total
          currentPage
          hasNextPage
        }
        media(
          status: NOT_YET_RELEASED,
          sort: POPULARITY_DESC,
          type: ANIME,
          isAdult: ${STORE.get('adult_content') ? 'true' : 'false'}
        ) {
          ${MEDIA_DATA}
        }
      }
    }
  `;

  const headers = viewerId ? {
    Authorization: 'Bearer ' + STORE.get('access_token'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  } : HEADERS;

  const options = getOptions(query);
  const respData = await makeRequest(METHOD, GRAPH_QL_URL, headers, options);
  return respData.data.Page;
};
