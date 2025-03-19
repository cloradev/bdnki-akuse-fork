import { faPlay, faCirclePlay } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { forwardRef, useState } from 'react';

interface Episode {
  id: number;
  number: number;
  title: string;
  description: string;
  thumbnail: string;
  isActive?: boolean;
}

interface OtherEpisodesProps {
  show: boolean;
  episodes: Episode[];
  currentEpisode: number;
  onSelectEpisode: (episodeId: number) => void;
}

const ITEMS_PER_PAGE = 9; // Adjust number of episodes per page

const OtherEpisodes = forwardRef<HTMLDivElement, OtherEpisodesProps>(
  ({ show, episodes, currentEpisode, onSelectEpisode }, ref) => {
    const [currentPage, setCurrentPage] = useState(1);

    if (!show) return null;

    // Calculate pagination values
    const totalPages = Math.ceil(episodes.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, episodes.length);
    const currentItems = episodes.slice(startIndex, endIndex);

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

    return (
      <div className="other-episodes-content">
        <div ref={ref} className="dropdown">
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
            {currentItems.map((episode) => (
              <div
                key={episode.id}
                className={`episode-card ${episode.number === currentEpisode ? 'active' : ''}`}
                onClick={() => onSelectEpisode(episode.id)}
              >
                <div className="episode-image">
                  <img src={episode.thumbnail} alt={`Episode ${episode.number}`} />
                  {episode.number === currentEpisode && (
                    <div className="episode-badge current">
                      Current
                    </div>
                  )}
                </div>
                <div className="episode-info">
                  <div className="episode-title">
                    <span className="episode-number">EP {episode.number}</span>
                    <span className="episode-name">{episode.title || `Episode ${episode.number}`}</span>
                  </div>
                  {episode.description && (
                    <p className="episode-description">{episode.description}</p>
                  )}
                  <button
                    className="episode-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEpisode(episode.id);
                    }}
                  >
                    <FontAwesomeIcon className="icon" icon={faPlay} />
                    {episode.number === currentEpisode ? 'Continue' : 'Watch'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

export default OtherEpisodes;
