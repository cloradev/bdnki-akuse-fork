import { useState } from 'react';
import './styles/ListAnimeSection.css';
import { ListAnimeData } from '../../types/anilistAPITypes';
import AnimeEntry from './AnimeEntry';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

interface ListAnimeSectionProps {
  title: string;
  animeData?: ListAnimeData[];
}

const ListAnimeSection: React.FC<ListAnimeSectionProps> = ({ title, animeData }) => {
  const [expanded, setExpanded] = useState(false);
  const initialItemCount = 5;

  // If no data or empty array, show 5 skeleton loaders
  const displayData = animeData ?? Array(initialItemCount).fill(undefined);

  // When expanded, we show all items but in a scrollable container
  // When collapsed, we only show the initial items
  const itemsToShow = expanded ? displayData : displayData.slice(0, initialItemCount);

  return (
    <section className="list-section">
      <h2>{title}</h2>
      <div
        className="list-entries"
        style={{
          overflowY: expanded ? 'auto' : 'visible',
          overflowX: 'hidden',
          maxHeight: expanded ? '300px' : 'auto'
        }}
      >
        {itemsToShow.map((listAnimeData, index) => (
          <div className="list-entry" key={index}>
            <AnimeEntry
              listAnimeData={listAnimeData}
              variant="list"
            />
          </div>
        ))}
      </div>

      {displayData.length > initialItemCount && (
        <div className="show-more-container">
          <button
            className="show-more-button"
            onClick={() => setExpanded(!expanded)}
          >
            <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
            <span style={{ marginLeft: '5px' }}>
              {expanded ? '' : ''}
            </span>
          </button>
        </div>
      )}
    </section>
  );
};

export default ListAnimeSection;
