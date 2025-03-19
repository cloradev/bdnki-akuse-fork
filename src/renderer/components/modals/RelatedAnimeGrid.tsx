import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faStar, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { ListAnimeData } from '../../../types/anilistAPITypes';
import { getTitle, getParsedFormat, getParsedSeasonYear } from '../../../modules/utils';
import { MediaFormat, RelationType } from '../../../types/anilistGraphQLTypes';
import { useState } from 'react';
import './styles/AnimeGrid.css';

interface RelatedAnimeGridProps {
  relatedAnime?: ListAnimeData[];
  onClick: (anime?: ListAnimeData) => void;
}

const ITEMS_PER_PAGE = 6;

// Helper function to get relationship type badge
const getRelationshipBadge = (anime: ListAnimeData) => {
  if (!anime.media || !anime.media.format) {
    return null;
  }

  const format = anime.media.format as string;

  // Check if the format field is actually storing a relation type
  // Skip regular media formats which are not relation types
  if (['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'TV_SHORT', 'MUSIC'].includes(format)) {
    return null;
  }

  // Format the relation type for display
  const relationTypeClass = format.toLowerCase().replace(/_/g, '-');

  return (
    <span className={`relation-badge ${relationTypeClass}`}>
      {getParsedFormat(format as any)}
    </span>
  );
};

const RelatedAnimeGrid: React.FC<RelatedAnimeGridProps> = ({
  relatedAnime,
  onClick
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  if (!relatedAnime || relatedAnime.length === 0) {
    return (
      <div className="empty-state">
        <FontAwesomeIcon icon={faList} className="empty-icon" />
        <p>No related anime found for this title.</p>
        <p className="empty-sub-text">Try checking other tabs for more content.</p>
      </div>
    );
  }

  // Calculate pagination values
  const totalPages = Math.ceil(relatedAnime.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, relatedAnime.length);
  const currentItems = relatedAnime.slice(startIndex, endIndex);

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
              // When clicking on a related anime, pass the anime data to the parent component
              onClick(anime);
            }}
          >
            <div className="anime-custom-image">
              <img
                src={anime.media.coverImage?.large || anime.media.bannerImage || ''}
                alt={getTitle(anime.media)}
              />
              {getRelationshipBadge(anime)}
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
                {/* Display original format if available, otherwise show the relation type */}
                <span className="anime-custom-format">
                  {anime.media.format && ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'TV_SHORT', 'MUSIC'].includes(anime.media.format as string)
                    ? getParsedFormat(anime.media.format)
                    : 'Anime'}
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

export default RelatedAnimeGrid;
