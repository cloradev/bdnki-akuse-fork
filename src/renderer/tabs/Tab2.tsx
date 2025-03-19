import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Store from 'electron-store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter, faXmark, faClock, faPlay, faTrash } from '@fortawesome/free-solid-svg-icons';
import toast, { Toaster } from 'react-hot-toast';

import { ListAnimeData } from '../../types/anilistAPITypes';
import { getHistoryEntries, getLastWatchedEpisode, removeAnimeFromHistory, updateHistoryTimestamp } from '../../modules/history';
import { formatTime, getAvailableEpisodes, getTitle } from '../../modules/utils';
import AnimeModal from '../components/modals/AnimeModal';
import Heading from '../components/Heading';

import './styles/Tab2.css';

const STORE = new Store();
const ITEMS_PER_PAGE = 12;

interface Tab2Props {
  currentListAnime?: ListAnimeData[];
  planningListAnime?: ListAnimeData[];
  clicked: () => void;
}

const Tab2: React.FC<Tab2Props> = ({ clicked }) => {
  // Call clicked on mount to fetch any necessary data
  useEffect(() => {
    clicked();
  }, [clicked]);

  // State for history entries
  const [historyEntries, setHistoryEntries] = useState<ListAnimeData[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<ListAnimeData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState('Last Watched');
  const [loading, setLoading] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Modal state
  const [selectedAnime, setSelectedAnime] = useState<ListAnimeData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Refs for click away handling
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Load history data
  const loadHistoryData = useCallback(() => {
    setLoading(true);

    const entries = getHistoryEntries();
    if (!entries || Object.keys(entries).length === 0) {
      setHistoryEntries([]);
      setFilteredEntries([]);
      setLoading(false);
      return;
    }

    // Convert entries to ListAnimeData array
    const historyList = Object.values(entries)
      .map(entry => entry.data)
      .filter(data => data && data.media);

    setHistoryEntries(historyList);
    setFilteredEntries(historyList);
    setLoading(false);
  }, []);

  // Initial load and refresh on history changes
  useEffect(() => {
    loadHistoryData();

    // Watch for history changes
    const intervalId = setInterval(() => {
      const currentUpdateTime = STORE.get('history_last_updated', 0) as number;
      const lastCheckedTime = STORE.get('history_last_checked_tab2', 0) as number;

      if (currentUpdateTime > lastCheckedTime) {
        STORE.set('history_last_checked_tab2', Date.now());
        loadHistoryData();
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [loadHistoryData]);

  // Handle click outside filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter and search entries
  useEffect(() => {
    let result = [...historyEntries];

    // Apply search filter if query exists
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(anime =>
        getTitle(anime.media).toLowerCase().includes(query) ||
        anime.media.title?.english?.toLowerCase().includes(query) ||
        anime.media.title?.romaji?.toLowerCase().includes(query) ||
        anime.media.genres?.some(genre => genre.toLowerCase().includes(query))
      );
    }

    // Apply sorting based on selected filter
    if (selectedFilter === 'Last Watched') {
      result.sort((a, b) => {
        const aEpisode = getLastWatchedEpisode((a.media.id as number));
        const bEpisode = getLastWatchedEpisode((b.media.id as number));
        return (bEpisode?.timestamp || 0) - (aEpisode?.timestamp || 0);
      });
    } else if (selectedFilter === 'Alphabetical') {
      result.sort((a, b) => getTitle(a.media).localeCompare(getTitle(b.media)));
    } else if (selectedFilter === 'Recently Added') {
      // Sort by when they were first added to history (oldest episode timestamp)
      result.sort((a, b) => {
        const aId = a.media.id as number;
        const bId = b.media.id as number;
        const aEntry = getHistoryEntries()[aId];
        const bEntry = getHistoryEntries()[bId];

        if (!aEntry || !bEntry) return 0;

        const aTimestamps = Object.values(aEntry.history).map(h => h.timestamp);
        const bTimestamps = Object.values(bEntry.history).map(h => h.timestamp);

        const aFirstTimestamp = Math.min(...aTimestamps);
        const bFirstTimestamp = Math.min(...bTimestamps);

        return bFirstTimestamp - aFirstTimestamp;
      });
    } else if (selectedFilter === 'Most Episodes') {
      // Sort by number of episodes watched
      result.sort((a, b) => {
        const aId = a.media.id as number;
        const bId = b.media.id as number;
        const aEntry = getHistoryEntries()[aId];
        const bEntry = getHistoryEntries()[bId];

        if (!aEntry || !bEntry) return 0;

        return Object.keys(bEntry.history).length - Object.keys(aEntry.history).length;
      });
    }

    setFilteredEntries(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [historyEntries, searchQuery, selectedFilter]);

  // Calculate pagination details
  const totalItems = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentItems = filteredEntries.slice(startIndex, endIndex);

  // Handle anime click
  const handleAnimeClick = (anime: ListAnimeData) => {
    setSelectedAnime(anime);
    setSelectedEpisode(null);
    setSelectedSource(null);
    setShowModal(true);
  };

  // Handle play click
  const handlePlayClick = (event: React.MouseEvent, anime: ListAnimeData, episodeNumber: number) => {
    event.stopPropagation(); // Prevent the parent click handler from firing

    // Get the user's preferred source from store
    const preferredSource = STORE.get('source_flag') as string;

    setSelectedAnime(anime);
    setSelectedEpisode(episodeNumber);
    setSelectedSource(preferredSource);
    setShowModal(true);
  };

  // Handle remove click
  const handleRemoveClick = (event: React.MouseEvent, animeId: number) => {
    event.stopPropagation(); // Prevent parent click handlers

    // Remove the anime from history
    const removed = removeAnimeFromHistory(animeId);

    if (removed) {
      // Update the UI by filtering out the removed anime
      setHistoryEntries(prev => prev.filter(anime => (anime.media.id as number) !== animeId));

      toast.success('Removed from history', {
        duration: 2000,
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (confirm('Are you sure you want to clear all watch history? This action cannot be undone.')) {
      STORE.set('history', { entries: {} });
      updateHistoryTimestamp();
      setHistoryEntries([]);
      setFilteredEntries([]);

      toast.success('Watch history cleared', {
        duration: 2000,
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }
  };

  // Toggle filter dropdown
  const toggleFilterDropdown = () => {
    setShowFilterDropdown(prev => !prev);
  };

  // Select filter option
  const selectFilter = (filter: string) => {
    setSelectedFilter(filter);
    setShowFilterDropdown(false);
  };

  return (
    <div className="body-container show-tab">
      <div className="main-container lifted">
        <main>
          <Heading text='History' />

          <div className="history-controls">
            <div className="search-bar">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Search anime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="clear-search"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </div>

            <div className="filter-controls">
              <div className="filter-dropdown" ref={filterDropdownRef}>
                <button
                  className="filter-button"
                  onClick={toggleFilterDropdown}
                  aria-haspopup="true"
                  aria-expanded={showFilterDropdown}
                >
                  <FontAwesomeIcon icon={faFilter} />
                  <span>{selectedFilter}</span>
                </button>
                {showFilterDropdown && (
                  <div className="filter-dropdown-content">
                    <button
                      className={selectedFilter === 'Last Watched' ? 'active' : ''}
                      onClick={() => selectFilter('Last Watched')}
                    >
                      Last Watched
                    </button>
                    <button
                      className={selectedFilter === 'Alphabetical' ? 'active' : ''}
                      onClick={() => selectFilter('Alphabetical')}
                    >
                      Alphabetical
                    </button>
                    <button
                      className={selectedFilter === 'Recently Added' ? 'active' : ''}
                      onClick={() => selectFilter('Recently Added')}
                    >
                      Recently Added
                    </button>
                    <button
                      className={selectedFilter === 'Most Episodes' ? 'active' : ''}
                      onClick={() => selectFilter('Most Episodes')}
                    >
                      Most Episodes
                    </button>
                  </div>
                )}
              </div>

              <button
                className="clear-history-button"
                onClick={handleClearAllHistory}
                aria-label="Clear all history"
              >
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: '6px' }} />
                Clear All
              </button>
            </div>
          </div>

          <div className="history-stats">
            <span>Showing {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}</span>
          </div>

          {selectedAnime && (
            <AnimeModal
              listAnimeData={selectedAnime}
              show={showModal}
              onClose={() => setShowModal(false)}
              initialEpisode={selectedEpisode}
              initialSource={selectedSource}
              isDubbed={STORE.get('dubbed') as boolean}
            />
          )}

          {loading ? (
            <div className="history-grid loading">
              {Array(ITEMS_PER_PAGE).fill(0).map((_, index) => (
                <div key={index} className="history-entry skeleton"></div>
              ))}
            </div>
          ) : filteredEntries.length > 0 ? (
            <>
              <div className="history-grid">
                {currentItems.map((anime, index) => {
                  const animeId = anime.media.id as number;
                  const lastWatchedEpisode = getLastWatchedEpisode(animeId);
                  const episodeNumber = lastWatchedEpisode?.data.episodeNumber || 1;
                  const episodeTitle = lastWatchedEpisode?.data.title?.en || `Episode ${episodeNumber}`;
                  const currentTime = lastWatchedEpisode?.time || 0;
                  const duration = lastWatchedEpisode?.duration || 1;
                  const progress = (currentTime / duration) * 100;
                  const timeLeft = duration - currentTime;

                  // Use episode thumbnail if available, otherwise use anime cover
                  const thumbnailImage = lastWatchedEpisode?.data.image ||
                                        anime.media.bannerImage ||
                                        anime.media.coverImage?.large;

                  const totalEpisodes = getAvailableEpisodes(anime.media);
                  const episodeInfo = `EP ${episodeNumber}${totalEpisodes ? ` / ${totalEpisodes}` : ''}`;

                  return (
                    <div
                      key={index}
                      className="history-entry"
                      onClick={() => handleAnimeClick(anime)}
                    >
                      <div className="thumbnail-container">
                        <img
                          src={thumbnailImage}
                          alt={`${getTitle(anime.media)} thumbnail`}
                          className="episode-thumbnail"
                          loading="lazy"
                        />
                        <div
                          className="play-button-overlay"
                          onClick={(e) => handlePlayClick(e, anime, episodeNumber)}
                        >
                          <div className="play-button">
                            <FontAwesomeIcon icon={faPlay} />
                          </div>
                        </div>
                        <div className="episode-overlay">
                          <div className="episode-number">{episodeInfo}</div>
                          <div className="time-remaining">
                            <FontAwesomeIcon icon={faClock} />
                            <span>{formatTime(timeLeft)}</span>
                          </div>
                        </div>
                        <div
                          className="remove-button"
                          onClick={(e) => handleRemoveClick(e, animeId)}
                          title="Remove from history"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </div>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="anime-title">
                        {getTitle(anime.media)}
                      </div>
                      <div className="episode-title">
                        {episodeTitle}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="pagination-arrow"
                    aria-label="Previous page"
                  >
                    &lt;
                  </button>
                  <div className="pagination-pages">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      )
                      .map((page, idx, array) => {
                        // Add ellipsis
                        if (idx > 0 && array[idx - 1] !== page - 1) {
                          return (
                            <React.Fragment key={`ellipsis-${page}`}>
                              <span className="pagination-ellipsis">...</span>
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={currentPage === page ? 'active' : ''}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page ? 'active' : ''}
                          >
                            {page}
                          </button>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-arrow"
                    aria-label="Next page"
                  >
                    &gt;
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="no-history">
              <h3>No watch history found</h3>
              <p>Anime you watch will appear here</p>
            </div>
          )}
          <Toaster />
        </main>
      </div>
    </div>
  );
};

export default Tab2;
