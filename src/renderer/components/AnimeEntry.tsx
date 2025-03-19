import './styles/AnimeEntry.css';

import { faCalendar, faCircleDot } from '@fortawesome/free-regular-svg-icons';
import { faStar, faTv, faTag } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRef, useState, useEffect } from 'react';
import Skeleton from 'react-loading-skeleton';

import {
  getAnimeTags,
  getAvailableEpisodes,
  getParsedFormat,
  getParsedSeasonYear,
  getTitle,
} from '../../modules/utils';
import { ListAnimeData } from '../../types/anilistAPITypes';
import AnimeModal from './modals/AnimeModal';

const StatusDot: React.FC<{
  listAnimeData?: ListAnimeData | undefined;
}> = ({ listAnimeData }) => {
  return (
    <>
      {(listAnimeData?.media.mediaListEntry?.status == 'CURRENT' ||
        listAnimeData?.media.mediaListEntry?.status == 'REPEATING') &&
      listAnimeData.media.mediaListEntry.progress !==
        getAvailableEpisodes(listAnimeData.media) ? (
        <span className="up-to-date">
          <FontAwesomeIcon
            className="i"
            icon={faCircleDot}
            style={{ marginRight: 5 }}
          />
        </span>
      ) : (
        listAnimeData?.media.status === 'RELEASING' && (
          <span className="releasing">
            <FontAwesomeIcon
              className="i"
              icon={faCircleDot}
              style={{ marginRight: 5 }}
            />
          </span>
        )
      )}
      {listAnimeData?.media.status === 'NOT_YET_RELEASED' && (
        <span className="not-yet-released">
          <FontAwesomeIcon
            className="i"
            icon={faCircleDot}
            style={{ marginRight: 5 }}
          />
        </span>
      )}
    </>
  );
};

// Rating component to display anime score
const AnimeRating: React.FC<{
  score?: number;
}> = ({ score }) => {
  if (!score) return null;

  // Convert score to a 1-10 scale if needed
  const normalizedScore = score > 10 ? Math.round(score / 10) : score;

  return (
    <div className="anime-rating">
      <FontAwesomeIcon icon={faStar} className="rating-star" />
      <span>{normalizedScore.toFixed(1)}</span>
    </div>
  );
};

const AnimeEntry: React.FC<{
  listAnimeData?: ListAnimeData;
  onClick?: () => any;
  variant?: 'grid' | 'list';
}> = ({ listAnimeData, onClick, variant = 'grid' }) => {
  // wether the modal is shown or not
  const [showModal, setShowModal] = useState<boolean>(false);
  // wether the modal has been opened at least once (used to fetch episodes info only once when opening it)
  const [hasModalBeenShowed, setHasModalBeenShowed] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  // State to hold the current anime data to display in the modal
  const [currentAnimeData, setCurrentAnimeData] = useState<ListAnimeData | undefined>(listAnimeData);
  const modalRef = useRef(null);

  // Update current anime data when props change
  useEffect(() => {
    setCurrentAnimeData(listAnimeData);
  }, [listAnimeData]);

  // Get unique category tags that don't overlap with genres
  const getUniqueTags = (media: any) => {
    if (!media) return [];

    const categoryTags = getAnimeTags(media);
    const genres = media.genres || [];
    const genresLower = new Set(genres.map((g: string) => g.toLowerCase()));

    // Filter out any tags that would duplicate genres
    return categoryTags.filter(tag => !genresLower.has(tag.toLowerCase()));
  };

  // Calculate priority tags to display
  const getPriorityTags = (media: any) => {
    if (!media) return { uniqueTags: [], genreTags: [] };

    const uniqueTags = getUniqueTags(media);
    const genres = media.genres || [];

    // For list view, we want fewer tags to avoid clutter
    if (variant === 'list') {
      const maxUniqueTags = Math.min(1, uniqueTags.length);
      const maxGenreTags = Math.min(2, genres.length);

      return {
        uniqueTags: uniqueTags.slice(0, maxUniqueTags),
        genreTags: genres.slice(0, maxGenreTags)
      };
    }

    // For grid view, we want a consistent layout
    const maxUniqueTags = Math.min(2, uniqueTags.length);
    const maxGenreTags = Math.min(2, genres.length);

    return {
      uniqueTags: uniqueTags.slice(0, maxUniqueTags),
      genreTags: genres.slice(0, maxGenreTags)
    };
  };

  // Get tags to display
  const { uniqueTags, genreTags } = listAnimeData ? getPriorityTags(listAnimeData.media) : { uniqueTags: [], genreTags: [] };

  return (
    <>
      {currentAnimeData && hasModalBeenShowed && (
        <AnimeModal
          listAnimeData={currentAnimeData}
          show={showModal}
          onClose={(clickedAnime) => {
            if (clickedAnime) {
              // If a new anime was clicked, update the current anime data
              setCurrentAnimeData(clickedAnime);
              // Keep the modal open
              setShowModal(true);
            } else {
              // Just close the modal
              setShowModal(false);
            }
          }}
        />
      )}
      <div
        className={`anime-entry ${variant}-view show ${listAnimeData ? '' : 'skeleton'}`}
        onClick={() => {
          setShowModal(true);
          onClick && onClick();
          if (!hasModalBeenShowed) setHasModalBeenShowed(true);
        }}
      >
        {listAnimeData && listAnimeData.media ? (
          <div
            className="anime-cover"
            style={{
              backgroundColor: !imageLoaded
                ? listAnimeData.media.coverImage?.color
                : 'transparent',
            }}
          >
            <img
              src={listAnimeData.media.coverImage?.large}
              alt="anime cover"
              onLoad={() => {
                setImageLoaded(true);
              }}
            />
            <div className="anime-cover-shadow"></div>

            {/* Rating display over the image */}
            {listAnimeData.media.averageScore && (
              <AnimeRating score={listAnimeData.media.averageScore} />
            )}
          </div>
        ) : (
          <Skeleton className="anime-cover" />
        )}

        <div className="anime-content">
          <div className="anime-title">
            {listAnimeData && listAnimeData.media ? (
              <>
                <StatusDot listAnimeData={listAnimeData} />
                {getTitle(listAnimeData.media)}
              </>
            ) : (
              <Skeleton count={2} />
            )}
          </div>

          {/* Tags section */}
          <div className="anime-tags">
            {listAnimeData && listAnimeData.media ? (
              <>
                {/* Format tag - always show */}
                <div className="anime-tag format-tag">
                  <FontAwesomeIcon className="tag-icon" icon={faTv} />
                  <span>{getParsedFormat(listAnimeData?.media.format)}</span>
                </div>

                {/* Year tag - always show */}
                <div className="anime-tag year-tag">
                  <FontAwesomeIcon className="tag-icon" icon={faCalendar} />
                  <span>{getParsedSeasonYear(listAnimeData?.media)}</span>
                </div>

                {/* Episodes tag - conditionally show */}
                {listAnimeData.media.episodes > 0 && (
                  <div className="anime-tag episodes-tag">
                    {listAnimeData.media.mediaListEntry?.progress ? (
                      <span>{listAnimeData.media.mediaListEntry?.progress}/{listAnimeData.media.episodes} EP</span>
                    ) : (
                      <span>{listAnimeData.media.episodes} EP</span>
                    )}
                  </div>
                )}

                {/* Display AniList tags - limited to maintian layout */}
                {uniqueTags.map((tag, index) => (
                  <div className="anime-tag category-tag" key={`tag-${index}`}>
                    <FontAwesomeIcon className="tag-icon" icon={faTag} />
                    <span>{tag}</span>
                  </div>
                ))}

                {/* Display genre tags - limited to maintain layout */}
                {genreTags.map((genre: string, index: number) => (
                  <div className="anime-tag genre-tag" key={`genre-${index}`}>
                    <span>{genre}</span>
                  </div>
                ))}
              </>
            ) : (
              <Skeleton count={1} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AnimeEntry;
