import '..//styles/components.css';
import '../styles/animations.css';
import '../styles/style.css';
import 'react-loading-skeleton/dist/skeleton.css';

import { ipcRenderer, IpcRendererEvent } from 'electron';
import Store from 'electron-store';
import { createContext, useEffect, useState } from 'react';
import { SkeletonTheme } from 'react-loading-skeleton';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import {
  getAnimeInfo,
  getMostPopularAnime,
  getTrendingAnime,
  getViewerId,
  getViewerInfo,
  getViewerList,
  getViewerLists,
} from '../modules/anilist/anilistApi';
import {
  getAnimeHistory,
  getHistoryEntries,
  getLastWatchedEpisode,
  setAnimeHistory,
} from '../modules/history';
import { OS } from '../modules/os';
import { setDefaultStoreVariables } from '../modules/storeVariables';
import { animeDataToListAnimeData } from '../modules/utils';
import { applyTheme, applyBackgroundTheme, applyFontFamily } from '../modules/theme';
import { ListAnimeData, UserInfo } from '../types/anilistAPITypes';
import AutoUpdateModal from './components/modals/AutoUpdateModal';
import DonateModal from './components/modals/DonateModal';
import MainNavbar from './MainNavbar';
import Tab1 from './tabs/Tab1';
import Tab2 from './tabs/Tab2';
import Tab3 from './tabs/Tab3';
import Tab4 from './tabs/Tab4';
import Tab5 from './tabs/Tab5';
import WindowControls from './WindowControls';

ipcRenderer.on('console-log', (event, toPrint) => {
  console.log(toPrint);
});

const STORE = new Store();
export const AuthContext = createContext<boolean>(false);
export const ViewerIdContext = createContext<number | null>(null);

export default function App() {
  const [logged] = useState<boolean>(STORE.get('logged') as boolean);
  const [viewerId, setViewerId] = useState<number | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [showDonateModal, setShowDonateModal] = useState<boolean>(false);
  const [hasHistory, setHasHistory] = useState<boolean>(false);
  const [sectionUpdate, setSectionUpdate] = useState<boolean>(true);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // tab1
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [currentListAnime, setCurrentListAnime] = useState<ListAnimeData[]>();
  const [trendingAnime, setTrendingAnime] = useState<ListAnimeData[]>();
  const [mostPopularAnime, setMostPopularAnime] = useState<ListAnimeData[]>();
  // const [nextReleasesAnime, setNextReleasesAnime] = useState<ListAnimeData[]>();
  const [recommendedAnime, setRecommendedAnime] = useState<ListAnimeData[]>();
  // tab2
  const [tab2Click, setTab2Click] = useState<boolean>(false);
  const [planningListAnime, setPlanningListAnimeListAnime] =
    useState<ListAnimeData[]>();

  const style = getComputedStyle(document.body);
  setDefaultStoreVariables();

  const [currentFontFamily, setCurrentFontFamily] = useState<string>(STORE.get('font_family') as string || 'Poppins');

  useEffect(() => {
    // Apply initial theme settings
    const storedTheme = STORE.get('primary_color') as string || 'Minato';
    console.log(`Initial theme: ${storedTheme}`);
    applyTheme(storedTheme);

    const storedBgTheme = STORE.get('background_theme') as string || 'Dark';
    console.log(`Initial bg theme: ${storedBgTheme}`);
    applyBackgroundTheme(storedBgTheme);

    // Get initial font family and apply it
    const initialFontFamily = STORE.get('font_family') as string || 'Poppins';
    console.log(`Initial font family: ${initialFontFamily}`);
    applyFontFamily(initialFontFamily);
    setCurrentFontFamily(initialFontFamily);

    // Check for theme changes periodically
    const checkThemeInterval = setInterval(() => {
      const currentTheme = STORE.get('primary_color') as string;
      const currentBgTheme = STORE.get('background_theme') as string;
      const fontFromStore = STORE.get('font_family') as string;

      if (currentTheme && currentTheme !== storedTheme) {
        applyTheme(currentTheme);
      }

      if (currentBgTheme && currentBgTheme !== storedBgTheme) {
        applyBackgroundTheme(currentBgTheme);
      }

      // Only update if the font has actually changed from what we're currently using
      if (fontFromStore && fontFromStore !== currentFontFamily) {
        console.log(`Font family changed: ${fontFromStore}`);
        applyFontFamily(fontFromStore);
        setCurrentFontFamily(fontFromStore);
      }
    }, 1000); // Check every second

    return () => {
      clearInterval(checkThemeInterval);
    };
  }, [currentFontFamily]);

  useEffect(() => {
    preloadEssentialData();
  }, []);

  useEffect(() => {
    if (Math.floor(Math.random() * 8) + 1 === 1 && !showUpdateModal) {
      setShowDonateModal(true);
    }
  }, []);

  const updateRecommended = async (history: ListAnimeData[]) => {
    // Check if history is empty or has only one item
    if (!history || history.length === 0) {
      console.log('History is empty, cannot update recommended anime');
      setRecommendedAnime([]);
      return;
    }

    // Use max(0, history.length - 1) to ensure we don't get a negative index
    const randomIndex = Math.floor(Math.random() * Math.max(0, history.length - 1));
    const animeData = history[randomIndex];

    if (!animeData || !animeData.media) {
      console.log('Invalid anime data in history');
      setRecommendedAnime([]);
      return;
    }

    if (animeData.media.recommendations === undefined) {
      animeData.media = await getAnimeInfo(animeData.media.id);
      const entry = getAnimeHistory(animeData.media.id as number);
      if (entry) {
        entry.data = animeData;
        setAnimeHistory(entry);
      }
    }

    const recommendedList = animeData.media.recommendations?.nodes?.map(
      (value) => {
        return {
          id: null,
          mediaId: null,
          progress: null,
          media: value.mediaRecommendation,
        } as ListAnimeData;
      },
    ) || [];

    recommendedList.push(animeData);

    setRecommendedAnime(recommendedList);
  };

  const updateHistory = async () => {
    const entries = getHistoryEntries();
    const historyAvailable = Object.values(entries).length > 0;

    let result: ListAnimeData[] = [];

    const sortNewest = (a: ListAnimeData, b: ListAnimeData) =>
      (getLastWatchedEpisode(
        (b.media.id ??
          (b.media.mediaListEntry && b.media.mediaListEntry.id)) as number,
      )?.timestamp ?? 0) -
      (getLastWatchedEpisode(
        (a.media.id ??
          (a.media.mediaListEntry && a.media.mediaListEntry.id)) as number,
      )?.timestamp ?? 0);

    if (logged) {
      const id = (viewerId as number) || (await getViewerId());
      result = await getViewerLists(id, 'CURRENT', 'REPEATING', 'PAUSED');
    } else if (historyAvailable) {
      setHasHistory(true);
      result = Object.values(entries)
        .map((value) => value.data)
        .filter(data => data && data.media)
        .sort(sortNewest);
      setCurrentListAnime(result);
      if (result.length > 0) {
        updateRecommended(result);
      }
      return;
    } else {
      // No history available
      setCurrentListAnime([]);
      setHasHistory(false);
      return;
    }
  };

  useEffect(() => {
    const updateSectionListener = async (
      event: IpcRendererEvent,
      ...sections: string[]
    ) => {
      if (sectionUpdate) {
        setSectionUpdate(false);
        setTimeout(() => setSectionUpdate(true), 3000);
      } else return;

      for (const section of sections) {
        switch (section) {
          case 'history':
            await updateHistory();
            continue;
        }
      }
    };

    const autoUpdateListener = async () => {
      setShowDonateModal(false);
      setShowUpdateModal(true);
    };

    ipcRenderer.on('update-section', updateSectionListener);
    ipcRenderer.on('auto-update', autoUpdateListener);

    return () => {
      ipcRenderer.removeListener('update-section', updateSectionListener);
      ipcRenderer.removeListener('auto-update', autoUpdateListener);
    };
  });

  // Preload only essential data for initial app load
  const preloadEssentialData = async () => {
    try {
      let id = null;
      setLoadingProgress(10);

      if (logged) {
        try {
          id = await getViewerId();
          setViewerId(id);
          setLoadingProgress(30);
        } catch (error) {
          console.log('Failed to get viewer ID:', error);
        }
      } else {
        setLoadingProgress(30);
      }

      // Only load history data initially
      try {
        await updateHistory();
        setLoadingProgress(60);
      } catch (error) {
        console.log('Failed to update history:', error);
      }

      // Mark essential data as loaded
      setDataLoaded(true);
      setLoadingProgress(80);

      // Load non-essential data after a short delay
      setTimeout(() => {
        loadNonEssentialData(id);
      }, 100);
    } catch (error) {
      console.log('Error preloading essential data:', error);
      setDataLoaded(true);
    }
  };

  // Load non-essential data in the background
  const loadNonEssentialData = async (id: number | null) => {
    let completedRequests = 0;
    const totalRequests = logged ? (STORE.get('light_mode') ? 1 : 3) : (STORE.get('light_mode') ? 0 : 2);

    const updateProgress = () => {
      completedRequests++;
      const progress = 80 + (completedRequests / totalRequests) * 20;
      setLoadingProgress(Math.min(100, progress));

      if (completedRequests >= totalRequests) {
        setIsInitialLoading(false);
      }
    };

    const promises = [];

    if (logged && id) {
      promises.push(
        getViewerInfo(id)
          .then(info => {
            setUserInfo(info);
            updateProgress();
          })
          .catch(error => {
            console.log('Failed to get viewer info:', error);
            updateProgress();
          })
      );
    }

    if (!(STORE.get('light_mode') as boolean)) {
      promises.push(
        getTrendingAnime(id)
          .then(trendingData => {
            if (trendingData) {
              setTrendingAnime(animeDataToListAnimeData(trendingData));
            }
            updateProgress();
          })
          .catch(error => {
            console.log('Failed to get trending anime:', error);
            setTrendingAnime([]);
            updateProgress();
          })
      );

      promises.push(
        getMostPopularAnime(id)
          .then(popularData => {
            if (popularData) {
              setMostPopularAnime(animeDataToListAnimeData(popularData));
            }
            updateProgress();
          })
          .catch(error => {
            console.log('Failed to get popular anime:', error);
            setMostPopularAnime([]);
            updateProgress();
          })
      );
    } else {
      setTrendingAnime([]);
      setMostPopularAnime([]);
      setIsInitialLoading(false);
    }

    // Execute all promises in parallel
    Promise.all(promises)
      .catch(error => {
        console.log('Error loading non-essential data:', error);
      })
      .finally(() => {
        // Set loading complete after all requests finish or fail
        setTimeout(() => {
          setIsInitialLoading(false);
          setLoadingProgress(100);
        }, 500);
      });
  };

  const fetchTab1AnimeData = async () => {
    try {
      var id = null;

      // Create a collection of promises to execute in parallel
      const promises = [];

      if (logged) {
        try {
          // Get viewer ID first as it's needed for other calls
          id = await getViewerId();
          setViewerId(id);

          // Add viewer info fetch to promises
          promises.push(
            getViewerInfo(id)
              .then(info => setUserInfo(info))
              .catch(error => console.log('Failed to get viewer info:', error))
          );
        } catch (error) {
          console.log('Failed to get viewer info:', error);
        }
      }

      // Add history update to promises
      promises.push(
        updateHistory()
          .catch(error => console.log('Failed to update history:', error))
      );

      // Only fetch trending and popular anime if not in light mode
      if (!(STORE.get('light_mode') as boolean)) {
        // Add trending anime fetch to promises
        promises.push(
          getTrendingAnime(id)
            .then(trendingData => {
              if (trendingData) {
                setTrendingAnime(animeDataToListAnimeData(trendingData));
              }
            })
            .catch(error => {
              console.log('Failed to get trending anime:', error);
              setTrendingAnime([]);
            })
        );

        // Add popular anime fetch to promises
        promises.push(
          getMostPopularAnime(id)
            .then(popularData => {
              if (popularData) {
                setMostPopularAnime(animeDataToListAnimeData(popularData));
              }
            })
            .catch(error => {
              console.log('Failed to get popular anime:', error);
              setMostPopularAnime([]);
            })
        );
      } else {
        setTrendingAnime([]);
        setMostPopularAnime([]);
      }

      // Execute all promises in parallel
      await Promise.all(promises);

    } catch (error) {
      console.log('Tab1 error: ' + error);
      // Set default values to prevent UI from breaking
      setTrendingAnime([]);
      setMostPopularAnime([]);
      setRecommendedAnime([]);
      setCurrentListAnime([]);
    }
  };

  const fetchTab2AnimeData = async () => {
    try {
      if (viewerId) {
        setPlanningListAnimeListAnime(
          await getViewerList(viewerId, 'PLANNING'),
        );
      }
    } catch (error) {
      console.log('Tab2 error: ' + error);
    }
  };

  return (
    <AuthContext.Provider value={logged || hasHistory}>
      <ViewerIdContext.Provider value={viewerId}>
        <SkeletonTheme baseColor={style.getPropertyValue('--skeleton-base')} highlightColor={style.getPropertyValue('--skeleton-highlight')}>
          {isInitialLoading && (
            <div className="initial-loading-overlay">
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-bar-container">
                  <div
                    className="loading-bar"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <div className="loading-text">Loading your anime...</div>
              </div>
            </div>
          )}
          <AutoUpdateModal
            show={showUpdateModal}
            onClose={() => {
              setShowUpdateModal(false);
            }}
          />
          <DonateModal
            show={showDonateModal}
            onClose={() => {
              setShowDonateModal(false);
            }}
          />
          <MemoryRouter>
            {!OS.isMac && <WindowControls />}
            <MainNavbar avatar={userInfo?.avatar?.medium} />
            <Routes>
              <Route
                path="/"
                element={
                  <Tab1
                    userInfo={userInfo}
                    currentListAnime={currentListAnime}
                    trendingAnime={trendingAnime}
                    mostPopularAnime={mostPopularAnime}
                    // nextReleasesAnime={nextReleasesAnime}
                    recommendedAnime={recommendedAnime}
                  />
                }
              />
              {logged && (
                <Route
                  path="/tab2"
                  element={
                    <Tab2
                      currentListAnime={currentListAnime}
                      planningListAnime={planningListAnime}
                      // completedListAnime={completedListAnime}
                      // droppedListAnime={droppedListAnime}
                      // pausedListAnime={pausedListAnime}
                      // repeatingListAnime={RepeatingListAnime}
                      clicked={() => {
                        if (tab2Click) return;
                        setTab2Click(true);
                        fetchTab2AnimeData();
                      }}
                    />
                  }
                />
              )}
              {!logged && hasHistory && (
                <Route
                  path="/tab2"
                  element={
                    <Tab2
                      currentListAnime={currentListAnime}
                      clicked={() => {
                        if (tab2Click) return;
                        setTab2Click(true);
                        fetchTab2AnimeData();
                      }}
                    />
                  }
                />
              )}
              <Route path="/tab3" element={<Tab3 />} />
              <Route path="/tab4" element={<Tab4 />} />
              <Route path="/tab5" element={<Tab5 />} />
            </Routes>
          </MemoryRouter>
        </SkeletonTheme>
      </ViewerIdContext.Provider>
    </AuthContext.Provider>
  );
}
