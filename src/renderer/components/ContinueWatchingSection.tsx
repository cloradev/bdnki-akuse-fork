import './styles/ContinueWatchingSection.css';
import Store from 'electron-store';

import {
  faArrowLeftLong,
  faArrowRightLong,
  faClock,
  faPlay,
  faXmark,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRef, useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

import { getLastWatchedEpisode, removeAnimeFromHistory } from '../../modules/history';
import { getAvailableEpisodes, getTitle, formatTime } from '../../modules/utils';
import { ListAnimeData } from '../../types/anilistAPITypes';
import { ButtonCircle } from './Buttons';
import AnimeModal from './modals/AnimeModal';
import { EPISODES_INFO_URL } from '../../constants/utils';
import { EpisodeInfo } from '../../types/types';

// Initialize store to access saved settings
const STORE = new Store();

interface ContinueWatchingSectionProps {
  title: string;
  animeData?: ListAnimeData[];
  onRemove?: (animeId: number) => void;
}

const ContinueWatchingSection: React.FC<ContinueWatchingSectionProps> = ({
  title,
  animeData,
  onRemove
}) => {
  const animeListWrapperRef = useRef<HTMLDivElement>(null);
  const animeListRef = useRef<HTMLDivElement>(null);
  const [enableButtons, setEnableButtons] = useState<boolean>(false);
  const [showButtons, setShowButtons] = useState<boolean>(false);
  const [selectedAnime, setSelectedAnime] = useState<ListAnimeData | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [removedAnimeIds, setRemovedAnimeIds] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [lastHistoryUpdate, setLastHistoryUpdate] = useState<number>(Date.now());
  const [newlyCompletedAnimes, setNewlyCompletedAnimes] = useState<Set<number>>(new Set());
  const [episodeListCache, setEpisodeListCache] = useState<Record<number, EpisodeInfo[]>>({});
  const [selectedEpisodesInfo, setSelectedEpisodesInfo] = useState<EpisodeInfo[] | undefined>();
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(false);

  // Listen for history updates
  useEffect(() => {
    const checkForHistoryUpdates = () => {
      const lastUpdated = STORE.get('history_last_updated');
      if (lastUpdated && lastUpdated !== lastHistoryUpdate) {
        // Check for newly completed episodes
        if (animeData) {
          const newlyCompleted = new Set<number>();

          animeData.forEach(anime => {
            const animeId = anime.media.id as number;
            const lastWatched = getLastWatchedEpisode(animeId);

            // If it's now completed and wasn't in our tracked set, mark as newly completed
            if (lastWatched?.completed && !newlyCompletedAnimes.has(animeId)) {
              newlyCompleted.add(animeId);

              // After 10 seconds, remove the newly completed status
              setTimeout(() => {
                setNewlyCompletedAnimes(prev => {
                  const updated = new Set(prev);
                  updated.delete(animeId);
                  return updated;
                });
              }, 10000);
            }
          });

          if (newlyCompleted.size > 0) {
            setNewlyCompletedAnimes(prev => new Set([...prev, ...newlyCompleted]));
          }
        }

        setLastHistoryUpdate(lastUpdated as number);
      }
    };

    // Check for updates every 2 seconds
    const intervalId = setInterval(checkForHistoryUpdates, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [lastHistoryUpdate, animeData, newlyCompletedAnimes]);

  const hideButtons = () => {
    if (animeListWrapperRef.current && animeListRef.current) {
      setEnableButtons(
        !(
          animeListWrapperRef.current.clientWidth >
          animeListRef.current.scrollWidth
        ),
      );
    }
  };

  const handleMouseEnter = () => {
    setShowButtons(true);
    hideButtons();
  };

  const handleMouseLeave = () => {
    setShowButtons(false);
  };

  const scrollLeft = () => {
    if (animeListWrapperRef.current) {
      animeListWrapperRef.current.scrollLeft -= 232 * 4;
    }
  };

  const scrollRight = () => {
    if (animeListWrapperRef.current) {
      animeListWrapperRef.current.scrollLeft += 232 * 4;
    }
  };

  // Function to fetch episode information for an anime
  const fetchEpisodesInfo = async (animeId: number): Promise<EpisodeInfo[] | undefined> => {
    // Check if we already have this anime's episodes cached
    if (episodeListCache[animeId]) {
      return episodeListCache[animeId];
    }

    // If not in light mode, fetch the episodes
    if (!(STORE.get('light_mode') as boolean)) {
      try {
        setIsLoadingEpisodes(true);
        const response = await axios.get(`${EPISODES_INFO_URL}${animeId}`);
        setIsLoadingEpisodes(false);

        if (response.data && response.data.episodes) {
          // Cache the episodes for future use
          setEpisodeListCache(prev => ({
            ...prev,
            [animeId]: response.data.episodes
          }));
          return response.data.episodes;
        }
      } catch (error) {
        console.error(`Error fetching episodes for anime ${animeId}:`, error);
        setIsLoadingEpisodes(false);
      }
    }

    return undefined;
  };

  const handleAnimeClick = async (anime: ListAnimeData) => {
    const animeId = anime.media.id as number;

    // Fetch episodes info before opening the modal
    const episodes = await fetchEpisodesInfo(animeId);
    setSelectedEpisodesInfo(episodes);

    setSelectedAnime(anime);
    setSelectedEpisode(null);
    setSelectedSource(null);
    setShowModal(true);
  };

  const handlePlayClick = async (event: React.MouseEvent, anime: ListAnimeData, episodeNumber: number) => {
    event.stopPropagation(); // Prevent the parent click handler from firing
    const animeId = anime.media.id as number;

    // Fetch episodes info before opening the modal
    const episodes = await fetchEpisodesInfo(animeId);
    setSelectedEpisodesInfo(episodes);

    // Get the user's preferred source from store
    const preferredSource = STORE.get('source_flag') as string;
    const isDubbed = STORE.get('dubbed') as boolean;

    setSelectedAnime(anime);
    setSelectedEpisode(episodeNumber);
    setSelectedSource(preferredSource);
    setShowModal(true);
  };

  const handleRemoveClick = (event: React.MouseEvent, animeId: number) => {
    event.stopPropagation(); // Prevent parent click handlers

    // Remove the anime from history
    const removed = removeAnimeFromHistory(animeId);

    if (removed) {
      // Notify parent component
      if (onRemove) {
        onRemove(animeId);
      }

      toast.success('Removed from Continue Watching', {
        duration: 2000,
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }
  };

  // Filter and sort the anime data based on the selected filter mode
  const getFilteredAndSortedAnimeData = () => {
    if (!animeData) return [];

    // First filter by the selected mode
    let filteredData = [...animeData];

    if (filterMode === 'in-progress') {
      filteredData = filteredData.filter(anime => {
        const animeId = anime.media.id as number;
        const lastWatched = getLastWatchedEpisode(animeId);
        return !lastWatched?.completed;
      });
    } else if (filterMode === 'completed') {
      filteredData = filteredData.filter(anime => {
        const animeId = anime.media.id as number;
        const lastWatched = getLastWatchedEpisode(animeId);
        return lastWatched?.completed;
      });
    }

    // Then sort by completion status and timestamp
    return filteredData.sort((a, b) => {
      const aId = a.media.id as number;
      const bId = b.media.id as number;

      const aLastWatched = getLastWatchedEpisode(aId);
      const bLastWatched = getLastWatchedEpisode(bId);

      // If filter is set to show all, sort incomplete first
      if (filterMode === 'all' && aLastWatched?.completed !== bLastWatched?.completed) {
        return (aLastWatched?.completed ? 1 : 0) - (bLastWatched?.completed ? 1 : 0);
      }

      // Otherwise, sort by timestamp (most recent first)
      return (bLastWatched?.timestamp || 0) - (aLastWatched?.timestamp || 0);
    });
  };

  // Handle filter button clicks
  const handleFilterChange = (mode: 'all' | 'in-progress' | 'completed') => {
    setFilterMode(mode);
  };

  // Don't render anything if there's no data or the array is empty
  if (!animeData || animeData.length === 0) return null;

  // Check if all items are just undefined or empty (for skeleton loading)
  const hasRealContent = animeData.some(item => item !== undefined);
  if (!hasRealContent) return null;

  const filteredAndSortedAnimeData = getFilteredAndSortedAnimeData();

  // Don't render if there are no items after filtering
  if (filteredAndSortedAnimeData.length === 0) {
    // If the filter is not 'all', fallback to showing all
    if (filterMode !== 'all') {
      return (
        <section className="continue-watching-section">
          <div className="section-header">
            <h1>{title}</h1>
            <div className="section-controls">
              <button
                className={filterMode === 'all' ? 'active' : ''}
                onClick={() => handleFilterChange('all')}
              >
                All
              </button>
              <button
                className={filterMode === 'in-progress' ? 'active' : ''}
                onClick={() => handleFilterChange('in-progress')}
              >
                In Progress
              </button>
              <button
                className={filterMode === 'completed' ? 'active' : ''}
                onClick={() => handleFilterChange('completed')}
              >
                Completed
              </button>
            </div>
          </div>
          <div className="empty-state">
            No {filterMode === 'in-progress' ? 'in-progress' : 'completed'} episodes found
          </div>
        </section>
      );
    }
    return null;
  }

  return (
    <section
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      id={`${title.toLowerCase().replace(' ', '-')}-section`}
      className="continue-watching-section"
    >
      {selectedAnime && (
        <AnimeModal
          listAnimeData={selectedAnime}
          show={showModal}
          onClose={() => setShowModal(false)}
          initialEpisode={selectedEpisode}
          initialSource={selectedSource}
          isDubbed={STORE.get('dubbed') as boolean}
          preloadedEpisodesInfo={selectedEpisodesInfo}
        />
      )}

      {/* Loading indicator for episodes */}
      {isLoadingEpisodes && (
        <div className="episodes-loading-indicator">
          Loading episodes...
        </div>
      )}

      <div className="section-header">
        <h1>{title}</h1>
        <div className="section-controls">
          <button
            className={filterMode === 'all' ? 'active' : ''}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button
            className={filterMode === 'in-progress' ? 'active' : ''}
            onClick={() => handleFilterChange('in-progress')}
          >
            In Progress
          </button>
          <button
            className={filterMode === 'completed' ? 'active' : ''}
            onClick={() => handleFilterChange('completed')}
          >
            Completed
          </button>
        </div>
      </div>
      {enableButtons && (
        <div
          className={`scrollers ${
            showButtons ? 'show-opacity' : 'hide-opacity'
          }`}
        >
          <ButtonCircle
            icon={faArrowLeftLong}
            tint="dark"
            small
            onClick={scrollLeft}
          />
          <ButtonCircle
            icon={faArrowRightLong}
            tint="dark"
            small
            onClick={scrollRight}
          />
        </div>
      )}
      <div className="anime-list-wrapper" ref={animeListWrapperRef}>
        <div className="anime-list" ref={animeListRef}>
          {(filteredAndSortedAnimeData ?? Array(20).fill(undefined)).map(
            (listAnimeData, index) => {
              if (!listAnimeData) return <div key={index} className="continue-watching-entry skeleton"></div>;

              const animeId = listAnimeData.media.id as number;
              const lastWatchedEpisode = getLastWatchedEpisode(animeId);
              const episodeNumber = lastWatchedEpisode?.data.episodeNumber || 1;
              const episodeTitle = lastWatchedEpisode?.data.title?.en || `Episode ${episodeNumber}`;
              const currentTime = lastWatchedEpisode?.time || 0;
              const duration = lastWatchedEpisode?.duration || 1;
              const progress = (currentTime / duration) * 100;
              const timeLeft = duration - currentTime;
              const isCompleted = lastWatchedEpisode?.completed || false;
              const isNewlyCompleted = newlyCompletedAnimes.has(animeId);

              // Use episode thumbnail if available, otherwise use anime cover
              const thumbnailImage = lastWatchedEpisode?.data.image ||
                                    listAnimeData.media.bannerImage ||
                                    listAnimeData.media.coverImage?.large;

              const totalEpisodes = getAvailableEpisodes(listAnimeData.media);
              const episodeInfo = `EP ${episodeNumber}${totalEpisodes ? ` / ${totalEpisodes}` : ''}`;

              return (
                <div
                  key={index}
                  className={`continue-watching-entry ${isCompleted ? 'completed' : ''} ${isNewlyCompleted ? 'newly-completed' : ''}`}
                  onClick={() => handleAnimeClick(listAnimeData)}
                >
                  <div className="thumbnail-container">
                    <img
                      src={thumbnailImage}
                      alt={`${getTitle(listAnimeData.media)} thumbnail`}
                      className="episode-thumbnail"
                    />
                    <div
                      className="play-button-overlay"
                      onClick={(e) => handlePlayClick(e, listAnimeData, episodeNumber)}
                    >
                      <div className="play-button">
                        <FontAwesomeIcon icon={faPlay} />
                      </div>
                    </div>
                    <div className="episode-overlay">
                      <div className="episode-number">{episodeInfo}</div>
                      {isCompleted ? (
                        <div className="episode-completed">
                          <FontAwesomeIcon icon={faCheckCircle} />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <div className="time-remaining">
                          <FontAwesomeIcon icon={faClock} />
                          <span>{formatTime(timeLeft)}</span>
                        </div>
                      )}
                    </div>
                    <div
                      className="remove-button"
                      onClick={(e) => handleRemoveClick(e, animeId)}
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </div>
                  </div>
                  <div className="progress-container">
                    <div
                      className={`progress-bar ${isCompleted ? 'completed' : ''}`}
                      style={{ width: isCompleted ? '100%' : `${progress}%` }}
                    ></div>
                  </div>
                  <div className="anime-title">
                    {getTitle(listAnimeData.media)}
                  </div>
                  <div className="episode-title">
                    {episodeTitle}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
      <Toaster />
    </section>
  );
};

export default ContinueWatchingSection;
