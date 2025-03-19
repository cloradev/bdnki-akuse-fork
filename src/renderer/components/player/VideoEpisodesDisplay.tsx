import React, { useEffect, useRef, useState } from 'react';
import { faCirclePlay, faPlay, faTimes, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ListAnimeData } from '../../../types/anilistAPITypes';
import { EpisodeInfo } from '../../../types/types';
import { getAvailableEpisodes } from '../../../modules/utils';
import { getAnimeHistory } from '../../../modules/history';

interface Episode {
  id: number;
  number: number;
  title: string;
  description: string;
  thumbnail: string;
}

interface VideoEpisodesDisplayProps {
  listAnimeData: ListAnimeData;
  episodeNumber: number;
  episodesInfo?: EpisodeInfo[];
  onChangeEpisode: (episode: number, reloadAtPreviousTime?: boolean) => Promise<boolean>;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 9;

const VideoEpisodesDisplay: React.FC<VideoEpisodesDisplayProps> = ({
  listAnimeData,
  episodeNumber,
  episodesInfo,
  onChangeEpisode,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [episodeList, setEpisodeList] = useState<Episode[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate which page should be active based on current episode
  useEffect(() => {
    const episodePage = Math.ceil(episodeNumber / ITEMS_PER_PAGE);
    if (episodePage > 0) {
      setCurrentPage(episodePage);
    }
  }, [episodeNumber]);

  // Generate episode list
  useEffect(() => {
    const availableEpisodes = getAvailableEpisodes(listAnimeData.media) ?? 0;

    const episodes: Episode[] = Array.from({ length: availableEpisodes }, (_, index) => {
      const episodeNum = index + 1;
      const episodeInfo = episodesInfo?.[episodeNum];

      return {
        id: episodeNum,
        number: episodeNum,
        title: episodeInfo?.title?.en ?? `Episode ${episodeNum}`,
        description: episodeInfo?.summary ?? 'No description available.',
        thumbnail: episodeInfo?.image ?? listAnimeData.media.bannerImage ?? '',
      };
    });

    setEpisodeList(episodes);
  }, [listAnimeData, episodesInfo]);

  // Calculate pagination values
  const totalPages = Math.ceil(episodeList.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, episodeList.length);
  const currentItems = episodeList.slice(startIndex, endIndex);

  // Handle page navigation
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSelectEpisode = (episodeId: number, shouldContinue = false) => {
    onChangeEpisode(episodeId, shouldContinue);
  };

  // Check if an episode has been partially watched
  const hasProgress = (episodeId: number) => {
    const animeId = listAnimeData.media.id as number;
    const history = getAnimeHistory(animeId);

    if (history && history.history[episodeId]) {
      const episode = history.history[episodeId];
      const duration = episode.duration || 0;

      // Check if episode has progress and is not completed
      if (duration > 0 && episode.time > 0) {
        const progress = episode.time / duration;
        // Only show continue if less than 95% watched and not marked as completed
        return progress > 0.05 && progress < 0.95 && !episode.completed;
      }
    }

    return false;
  };

  return (
    <div className="other-episodes-content">
      <div ref={dropdownRef} className="dropdown">
        <div className="episodes-header">
          <h2 className="episodes-title">Episodes</h2>
          <button className="episodes-close-button" onClick={onClose} aria-label="Close episodes">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {totalPages > 1 && (
          <div className="episodes-pagination-controls">
            <button
              className={`episodes-pagination-button ${currentPage === 1 ? 'disabled' : ''}`}
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <FontAwesomeIcon icon={faCirclePlay} flip="horizontal" />
            </button>
            <span className="episodes-pagination-info">
              Page {currentPage}/{totalPages}
            </span>
            <button
              className={`episodes-pagination-button ${currentPage === totalPages ? 'disabled' : ''}`}
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <FontAwesomeIcon icon={faCirclePlay} />
            </button>
          </div>
        )}

        <div className="episodes-grid">
          {currentItems.map((episode) => {
            const episodeHasProgress = hasProgress(episode.id);

            return (
              <div
                key={episode.id}
                className={`episode-card ${episode.number === episodeNumber ? 'active' : ''}`}
                onClick={() => handleSelectEpisode(episode.id, false)}
              >
                <div className="episode-image">
                  <img src={episode.thumbnail} alt={`Episode ${episode.number}`} />
                  {episode.number === episodeNumber && (
                    <div className="episode-badge current">
                      Current
                    </div>
                  )}
                  {episodeHasProgress && episode.number !== episodeNumber && (
                    <div className="episode-badge progress">
                      In Progress
                    </div>
                  )}
                </div>
                <div className="episode-info">
                  <div className="episode-title">
                    <span className="episode-number">EP {episode.number}</span>
                    <span className="episode-name">{episode.title}</span>
                  </div>
                  {episode.description && (
                    <p className="episode-description">{episode.description}</p>
                  )}
                  <div className="episode-actions">
                    <button
                      className="episode-button primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectEpisode(episode.id, false);
                      }}
                    >
                      <FontAwesomeIcon className="icon" icon={faPlay} />
                      {episode.number === episodeNumber ? 'Restart' : 'Watch'}
                    </button>

                    {episodeHasProgress && (
                      <button
                        className="episode-button secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectEpisode(episode.id, true);
                        }}
                      >
                        <FontAwesomeIcon className="icon" icon={faRotateRight} />
                        Continue
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VideoEpisodesDisplay;
