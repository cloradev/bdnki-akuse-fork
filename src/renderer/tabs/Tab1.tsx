import { useContext, useState, useEffect, useCallback, memo } from 'react';
import './styles/Tab1.css';

import { getTitle } from '../../modules/utils';
import { ListAnimeData, UserInfo } from '../../types/anilistAPITypes';
import { PageInfo } from '../../types/anilistGraphQLTypes';
import { AuthContext } from '../App';
import AnimeSection, { GridAnimeSection } from '../components/AnimeSection';
import ContinueWatchingSection from '../components/ContinueWatchingSection';
import Slideshow from '../components/Slideshow';
import Store from 'electron-store'
import Heading from '../components/Heading';
import { getNewReleases, getMostPopularAnime, getTopRated, getAiringSchedule, getUpcomingAnime } from '../../modules/anilist/anilistApi';
import { animeDataToListAnimeData } from '../../modules/utils';
import ListAnimeSection from '../components/ListAnimeSection';
import '../components/styles/SkeletonLoaders.css';

const STORE = new Store()

// Cache configuration
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
const SIDEBAR_CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours for sidebar data

// Memoize certain expensive child components
const MemoizedContinueWatchingSection = memo(ContinueWatchingSection);
const MemoizedSlideshow = memo(Slideshow);
const MemoizedAnimeSection = memo(AnimeSection);
const MemoizedGridAnimeSection = memo(GridAnimeSection);

interface Tab1Props {
  userInfo?: UserInfo
  currentListAnime?: ListAnimeData[];
  trendingAnime?: ListAnimeData[];
  mostPopularAnime?: ListAnimeData[];
  nextReleasesAnime?: ListAnimeData[];
  recommendedAnime?: ListAnimeData[];
  topRatedAnime?: ListAnimeData[];
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const Tab1: React.FC<Tab1Props> = ({
  userInfo,
  currentListAnime,
  trendingAnime,
  mostPopularAnime,
  nextReleasesAnime,
  recommendedAnime,
  topRatedAnime,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'newest'|'popular'|'topRated'>('popular');
  const [categoryData, setCategoryData] = useState<ListAnimeData[] | undefined>();
  const [loading, setLoading] = useState(false);
  const hasHistory = useContext(AuthContext);
  const recommendedFrom = hasHistory &&
                          recommendedAnime &&
                          recommendedAnime.length > 0 &&
                          recommendedAnime[recommendedAnime.length - 1] || undefined;
  let recommendedTitle = recommendedFrom &&
                           getTitle(recommendedFrom.media);
  const viewerId = userInfo?.id || null;
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 28;
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [popularAnimePages, setPopularAnimePages] = useState<{[page: number]: ListAnimeData[]}>({});
  const [categoryCacheTimestamps, setCategoryCacheTimestamps] = useState<{
    [key: string]: { [page: number]: number }
  }>({});

  // New state for Top Airing and Upcoming anime
  const [topAiringAnime, setTopAiringAnime] = useState<ListAnimeData[] | undefined>();
  const [upcomingAnime, setUpcomingAnime] = useState<ListAnimeData[] | undefined>();
  const [sidebarLoading, setSidebarLoading] = useState<boolean>(false);
  const [sidebarCacheTimestamp, setSidebarCacheTimestamp] = useState<{
    topAiring?: number;
    upcoming?: number;
  }>({});

  // Add state to track filtered anime
  const [filteredContinueWatching, setFilteredContinueWatching] = useState<ListAnimeData[] | undefined>(currentListAnime);

  // Update filtered list when currentListAnime changes
  useEffect(() => {
    setFilteredContinueWatching(currentListAnime);
  }, [currentListAnime]);

  // Load category data from cache (when component mounts)
  useEffect(() => {
    // Load cached timestamps
    try {
      const cachedTimestamps = localStorage.getItem('tab1_cache_timestamps');
      if (cachedTimestamps) {
        setCategoryCacheTimestamps(JSON.parse(cachedTimestamps));
      }

      // Load popular anime cache
      const popularCache = localStorage.getItem('tab1_popular_cache');
      if (popularCache) {
        setPopularAnimePages(JSON.parse(popularCache));
      }

      // Load sidebar cache timestamps
      const sidebarTimestamps = localStorage.getItem('tab1_sidebar_timestamps');
      if (sidebarTimestamps) {
        setSidebarCacheTimestamp(JSON.parse(sidebarTimestamps));
      }

      // Load top airing cache
      const topAiringCache = localStorage.getItem('tab1_top_airing_cache');
      if (topAiringCache) {
        const cached = JSON.parse(topAiringCache) as CachedData<ListAnimeData[]>;
        setTopAiringAnime(cached.data);
      }

      // Load upcoming cache
      const upcomingCache = localStorage.getItem('tab1_upcoming_cache');
      if (upcomingCache) {
        const cached = JSON.parse(upcomingCache) as CachedData<ListAnimeData[]>;
        setUpcomingAnime(cached.data);
      }
    } catch (e) {
      console.error('Error loading cache:', e);
    }
  }, []);

  // Function to refresh continue watching list from history
  const refreshContinueWatchingFromHistory = useCallback(() => {
    const historyData = STORE.get('history') as { entries: Record<string, any> } | undefined;
    const entries = historyData?.entries || {};

    if (Object.keys(entries).length > 0) {
      // Convert entries to ListAnimeData[]
      const updatedList = Object.values(entries)
        .map((value: any) => value.data)
        .filter((data: any) => data && data.media)
        .sort((a: any, b: any) => {
          const getLastWatchedTimestamp = (anime: any) => {
            const animeId = anime.media.id as number;
            const history = entries[animeId]?.history || {};
            return Math.max(...Object.values(history).map((ep: any) => ep.timestamp || 0), 0);
          };

          return getLastWatchedTimestamp(b) - getLastWatchedTimestamp(a);
        });

      setFilteredContinueWatching(updatedList);

      // No need to update hasHistory as it comes from context
    } else if (filteredContinueWatching && filteredContinueWatching.length > 0) {
      // Clear the list if history is empty
      setFilteredContinueWatching([]);
    }
  }, []); // Removed the dependency on filteredContinueWatching to avoid infinite loops

  // Refresh continue watching list when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, refreshing continue watching list');
        refreshContinueWatchingFromHistory();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refresh on first mount
    refreshContinueWatchingFromHistory();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshContinueWatchingFromHistory]);

  // Listen for history updates (when progress changes)
  useEffect(() => {
    let lastUpdateTime = STORE.get('history_last_updated', 0) as number;

    // Create an interval to check for history updates
    const intervalId = setInterval(() => {
      const currentUpdateTime = STORE.get('history_last_updated', 0) as number;

      // If the timestamp has changed, refresh the continue watching list
      if (currentUpdateTime > lastUpdateTime) {
        console.log('History updated, refreshing continue watching list');
        lastUpdateTime = currentUpdateTime;
        refreshContinueWatchingFromHistory();
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(intervalId);
  }, [refreshContinueWatchingFromHistory]);

  // Handler to remove anime from continue watching
  const handleRemoveFromContinueWatching = useCallback((animeId: number) => {
    setFilteredContinueWatching(prev =>
      prev?.filter(anime => (anime.media.id as number) !== animeId)
    );
  }, []);

  // Fetch Top Airing and Upcoming anime
  const fetchSidebarData = useCallback(async (forceRefresh = false) => {
    // Check if cached data is still valid
    const now = Date.now();
    const topAiringIsValid = sidebarCacheTimestamp.topAiring &&
                             (now - sidebarCacheTimestamp.topAiring < SIDEBAR_CACHE_EXPIRY);
    const upcomingIsValid = sidebarCacheTimestamp.upcoming &&
                            (now - sidebarCacheTimestamp.upcoming < SIDEBAR_CACHE_EXPIRY);

    // If both caches are valid and we're not forcing a refresh, skip fetching
    if (!forceRefresh && topAiringIsValid && upcomingIsValid && topAiringAnime && upcomingAnime) {
      return;
    }

    setSidebarLoading(true);

    try {
      // Fetch Top Airing anime if needed
      if (forceRefresh || !topAiringIsValid || !topAiringAnime) {
        // Fetch Top Airing anime (currently airing anime)
        const airingSchedule = await getAiringSchedule(viewerId);
        if (airingSchedule && airingSchedule.schedules && airingSchedule.schedules.length > 0) {
          // Convert to ListAnimeData format and sort by popularity
          const topAiring = airingSchedule.schedules
            .filter(schedule => schedule.media !== undefined)
            .map(schedule => ({
              id: null,
              mediaId: null,
              progress: null,
              media: schedule.media!,
            } as ListAnimeData))
            .sort((a, b) => (b.media.popularity || 0) - (a.media.popularity || 0));

          setTopAiringAnime(topAiring);

          // Cache the result
          const cacheData: CachedData<ListAnimeData[]> = {
            data: topAiring,
            timestamp: now
          };
          localStorage.setItem('tab1_top_airing_cache', JSON.stringify(cacheData));

          // Update timestamp
          setSidebarCacheTimestamp(prev => ({
            ...prev,
            topAiring: now
          }));
        }
      }

      // Fetch Upcoming anime if needed
      if (forceRefresh || !upcomingIsValid || !upcomingAnime) {
        // Fetch Upcoming anime using the dedicated function
        const upcomingResponse = await getUpcomingAnime(viewerId);
        if (upcomingResponse && upcomingResponse.media) {
          const upcoming = animeDataToListAnimeData(upcomingResponse);

          // Sort by start date (closest first) if available
          const sortedUpcoming = upcoming.sort((a, b) => {
            // Default dates if not available
            const dateA = a.media.startDate && a.media.startDate.year ?
              new Date(a.media.startDate.year, (a.media.startDate.month || 1) - 1, a.media.startDate.day || 1).getTime() :
              Number.MAX_SAFE_INTEGER;

            const dateB = b.media.startDate && b.media.startDate.year ?
              new Date(b.media.startDate.year, (b.media.startDate.month || 1) - 1, b.media.startDate.day || 1).getTime() :
              Number.MAX_SAFE_INTEGER;

            return dateA - dateB;
          });

          setUpcomingAnime(sortedUpcoming);

          // Cache the result
          const cacheData: CachedData<ListAnimeData[]> = {
            data: sortedUpcoming,
            timestamp: now
          };
          localStorage.setItem('tab1_upcoming_cache', JSON.stringify(cacheData));

          // Update timestamp
          setSidebarCacheTimestamp(prev => ({
            ...prev,
            upcoming: now
          }));
        }
      }

      // Save sidebar cache timestamps
      localStorage.setItem('tab1_sidebar_timestamps', JSON.stringify(sidebarCacheTimestamp));

    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setSidebarLoading(false);
    }
  }, [viewerId, sidebarCacheTimestamp, topAiringAnime, upcomingAnime]);

  // Load sidebar data on mount
  useEffect(() => {
    fetchSidebarData();
  }, [fetchSidebarData]);

  // Fetch category data when selection changes or page changes
  const fetchCategoryData = useCallback(async (category: string, page: number, forceRefresh = false) => {
    // Check if we already have this data cached and it's not expired
    const now = Date.now();
    const cacheKey = `${category}_${page}`;
    const isCacheValid = categoryCacheTimestamps[category]?.[page] &&
                         (now - categoryCacheTimestamps[category][page] < CACHE_EXPIRY);

    if (!forceRefresh && isCacheValid) {
      // For popular category, we use the popularAnimePages state
      if (category === 'popular' && popularAnimePages[page]) {
        setCategoryData(popularAnimePages[page]);
        return;
      }

      // For other categories, check localStorage
      const cacheData = localStorage.getItem(`tab1_${cacheKey}_cache`);
      if (cacheData) {
        try {
          const parsedData = JSON.parse(cacheData) as CachedData<{
            data: ListAnimeData[];
            pageInfo: PageInfo;
          }>;

          setCategoryData(parsedData.data.data);
          setPageInfo(parsedData.data.pageInfo);
          return;
        } catch (e) {
          console.error('Error parsing cache:', e);
        }
      }
    }

    setLoading(true);

    try {
      switch(category) {
        case 'newest': {
          const response = await getNewReleases(viewerId, page);
          const animeData = animeDataToListAnimeData(response);
          setCategoryData(animeData);

          const newPageInfo = {
            total: response.pageInfo?.total || 0,
            currentPage: response.pageInfo?.currentPage || page,
            hasNextPage: response.pageInfo?.hasNextPage || false,
            lastPage: response.pageInfo?.lastPage || page,
            perPage: response.pageInfo?.perPage || 0
          };

          setPageInfo(newPageInfo);

          // Cache the data
          const cacheData: CachedData<{
            data: ListAnimeData[];
            pageInfo: PageInfo;
          }> = {
            data: {
              data: animeData,
              pageInfo: newPageInfo
            },
            timestamp: now
          };

          localStorage.setItem(`tab1_${cacheKey}_cache`, JSON.stringify(cacheData));

          // Update timestamp
          setCategoryCacheTimestamps(prev => ({
            ...prev,
            [category]: {
              ...(prev[category] || {}),
              [page]: now
            }
          }));

          break;
        }
        case 'topRated': {
          const response = await getTopRated(viewerId, page);
          const animeData = animeDataToListAnimeData(response);
          setCategoryData(animeData);

          const newPageInfo = {
            total: response.pageInfo?.total || 0,
            currentPage: response.pageInfo?.currentPage || page,
            hasNextPage: response.pageInfo?.hasNextPage || false,
            lastPage: response.pageInfo?.lastPage || page,
            perPage: response.pageInfo?.perPage || 0
          };

          setPageInfo(newPageInfo);

          // Cache the data
          const cacheData: CachedData<{
            data: ListAnimeData[];
            pageInfo: PageInfo;
          }> = {
            data: {
              data: animeData,
              pageInfo: newPageInfo
            },
            timestamp: now
          };

          localStorage.setItem(`tab1_${cacheKey}_cache`, JSON.stringify(cacheData));

          // Update timestamp
          setCategoryCacheTimestamps(prev => ({
            ...prev,
            [category]: {
              ...(prev[category] || {}),
              [page]: now
            }
          }));

          break;
        }
        case 'popular': {
          // Check if we already have this page cached in state
          if (popularAnimePages[page]) {
            setCategoryData(popularAnimePages[page]);
          } else {
            // Fetch the specific page from the API
            const response = await getMostPopularAnime(viewerId, page);
            const pageData = animeDataToListAnimeData(response);

            // Cache the page data in state and localStorage
            setPopularAnimePages(prev => {
              const newPages = {
                ...prev,
                [page]: pageData
              };

              // Save to localStorage
              localStorage.setItem('tab1_popular_cache', JSON.stringify(newPages));

              return newPages;
            });

            setCategoryData(pageData);

            const newPageInfo = {
              total: response.pageInfo?.total || 0,
              currentPage: response.pageInfo?.currentPage || page,
              hasNextPage: response.pageInfo?.hasNextPage || false,
              lastPage: response.pageInfo?.lastPage || page,
              perPage: response.pageInfo?.perPage || 0
            };

            setPageInfo(newPageInfo);

            // Update timestamp
            setCategoryCacheTimestamps(prev => ({
              ...prev,
              [category]: {
                ...(prev[category] || {}),
                [page]: now
              }
            }));
          }
          break;
        }
      }

      // Save cache timestamps
      localStorage.setItem('tab1_cache_timestamps', JSON.stringify(categoryCacheTimestamps));

    } catch (error) {
      console.error('Error fetching category data:', error);
      setCategoryData([]);
      setPageInfo(null);
    } finally {
      setLoading(false);
    }
  }, [categoryCacheTimestamps, popularAnimePages, viewerId]);

  // Fetch data when category or page changes
  useEffect(() => {
    fetchCategoryData(selectedCategory, currentPage);
  }, [selectedCategory, currentPage, fetchCategoryData]);

  // Reset to page 1 when changing categories
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Refresh function for UI
  const handleRefresh = useCallback(() => {
    // Refresh current category data
    fetchCategoryData(selectedCategory, currentPage, true);

    // Refresh sidebar data
    fetchSidebarData(true);
  }, [selectedCategory, currentPage, fetchCategoryData, fetchSidebarData]);

  return (
    <div className="body-container show-tab">
      <div className="main-container lifted">
        <main>
          <div className="header-container">
            {STORE.get('light_mode') as boolean && <Heading text="Discover" />}
          </div>

          <div className="slideshow-wrapper-container">
            <MemoizedSlideshow listAnimeData={trendingAnime} />
          </div>

          <div className="section-container">
            {hasHistory && filteredContinueWatching && filteredContinueWatching.length > 0 && (
              <MemoizedContinueWatchingSection
                title="Continue Watching"
                animeData={filteredContinueWatching}
                onRemove={handleRemoveFromContinueWatching}
              />
            )}
            <div className="category-container">
              <div className="category-selector">
                <button
                  className={selectedCategory === 'newest' ? 'active' : ''}
                  onClick={() => setSelectedCategory('newest')}
                >
                  NEWEST
                </button>
                <button
                  className={selectedCategory === 'popular' ? 'active' : ''}
                  onClick={() => setSelectedCategory('popular')}
                >
                  POPULAR
                </button>
                <button
                  className={selectedCategory === 'topRated' ? 'active' : ''}
                  onClick={() => setSelectedCategory('topRated')}
                >
                  TOP RATED
                </button>
              </div>
              <div className="pagination-controls">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="pagination-arrow"
                >
                  &lt;
                </button>
                <span className="page-number">{currentPage}</span>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!pageInfo?.hasNextPage}
                  className="pagination-arrow"
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="category-layout">
              <div className="main-grid main-grid-container">
                <div className={`grid-section ${loading ? 'loading' : ''}`}>
                  {loading ? (
                    <div className="skeleton-grid">
                      {Array(16).fill(0).map((_, index) => (
                        <div key={index} className="skeleton-item anime-card-skeleton"></div>
                      ))}
                    </div>
                  ) : (
                    <MemoizedGridAnimeSection
                      title={
                        selectedCategory === 'newest' ? '' :
                        selectedCategory === 'popular' ? '' :
                        ''
                      }
                      animeData={categoryData}
                    />
                  )}
                </div>
              </div>

              <div className="list-sections list-sections-container">
                <ListAnimeSection
                  title="Top Airing"
                  animeData={topAiringAnime}
                />
                <ListAnimeSection
                  title="Upcoming"
                  animeData={upcomingAnime}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Tab1;
