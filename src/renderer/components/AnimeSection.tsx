import './styles/AnimeSection.css';

import {
  faArrowLeftLong,
  faArrowRightLong,
} from '@fortawesome/free-solid-svg-icons';
import { useRef, useState } from 'react';

import { ListAnimeData } from '../../types/anilistAPITypes';
import AnimeEntry from './AnimeEntry';
import { ButtonCircle } from './Buttons';

interface AnimeSectionProps {
  title: string;
  animeData?: ListAnimeData[];
}

const AnimeSection: React.FC<AnimeSectionProps> = ({ title, animeData }) => {
  const animeListWrapperRef = useRef<HTMLDivElement>(null);
  const animeListRef = useRef<HTMLDivElement>(null);
  const [enableButtons, setEnableButtons] = useState<boolean>(false);
  const [showButtons, setShowButtons] = useState<boolean>(false);

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

  if (animeData?.length === 0) return null;

  return (
    <section
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      id={`${title.toLowerCase().replace(' ', '-')}-section`}
    >
      <h1>{title}</h1>
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
          {(animeData ?? Array(20).fill(undefined)).map(
            (listAnimeData, index) => (
              <AnimeEntry key={index} listAnimeData={listAnimeData} variant="grid" />
            ),
          )}
        </div>
      </div>
    </section>
  );
};

export const GridAnimeSection: React.FC<AnimeSectionProps> = ({ title, animeData }) => {
  if (animeData?.length === 0) return null;

  return (
    <section id={`${title.toLowerCase().replace(' ', '-')}-section`}>
      <h1>{title}</h1>
      <div className="grid-anime-list">
        {(animeData ?? Array(20).fill(undefined)).map(
          (listAnimeData, index) => (
            <AnimeEntry key={index} listAnimeData={listAnimeData} variant="grid" />
          ),
        )}
      </div>
    </section>
  );
};

export default AnimeSection;
