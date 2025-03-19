import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faStar, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { ListAnimeData } from '../../../types/anilistAPITypes';
import { getTitle, getParsedFormat, getParsedSeasonYear } from '../../../modules/utils';
import { useState } from 'react';
import './styles/AnimeGrid.css';

interface RecommendedAnimeGridProps {
  recommendedAnime?: ListAnimeData[];
  onClick: (anime?: ListAnimeData) => void;
}

const ITEMS_PER_PAGE = 6;

const RecommendedAnimeGrid: React.FC<RecommendedAnimeGridProps> = ({
  recommendedAnime,
  onClick
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  if (!recommendedAnime || recommendedAnime.length === 0) {
    return (
      <div className="empty-state">
        <FontAwesomeIcon icon={faHeart} className="empty-icon" />
        <p>No recommendations available yet.</p>
        <p className="empty-sub-text">Try checking other tabs for more content.</p>
      </div>
    );
  }

  // Calculate pagination values
  const totalPages = Math.ceil(recommendedAnime.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, recommendedAnime.length);
  const currentItems = recommendedAnime.slice(startIndex, endIndex);

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
    <div className="anime-custom-grid-container">
      {totalPages > 1 && (
        <div className="modal-pagination-controls">
          <button
            className={`modal-pagination-button ${currentPage === 1 ? 'disabled' : ''}`}
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span className="modal-pagination-info">
            Page {currentPage}/{totalPages}
          </span>
          <button
            className={`modal-pagination-button ${currentPage === totalPages ? 'disabled' : ''}`}
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      )}

      <div className="anime-custom-grid">
        {currentItems.map((anime, index) => (
          <div
            key={index}
            className="anime-custom-card"
            onClick={() => {
              // When clicking on a recommended anime, pass the anime data to the parent component
              onClick(anime);
            }}
          >
            <div className="anime-custom-image">
              <img
                src={anime.media.coverImage?.large || anime.media.bannerImage || ''}
                alt={getTitle(anime.media)}
              />
              {anime.media.averageScore && (
                <div className="anime-custom-score">
                  <FontAwesomeIcon icon={faStar} className="score-star" />
                  <span>{(anime.media.averageScore / 10).toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="anime-custom-info">
              <div className="anime-custom-title">{getTitle(anime.media)}</div>
              <div className="anime-custom-details">
                <span className="anime-custom-format">
                  {getParsedFormat(anime.media.format) || 'Unknown'}
                </span>
                <span className="anime-custom-year">
                  {getParsedSeasonYear(anime.media)}
                </span>
                {anime.media.episodes && (
                  <span className="anime-custom-episodes">
                    {anime.media.episodes} EP
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedAnimeGrid;
