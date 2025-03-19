import './styles/AnimeSection.css';

import {
  faArrowLeftLong,
  faArrowRightLong,
} from '@fortawesome/free-solid-svg-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ListAnimeData } from '../../types/anilistAPITypes';
import AnimeEntry from './AnimeEntry';
import { ButtonCircle } from './Buttons';
import Select from './Select';

interface Option {
  label: string;
  value: ListAnimeData[];
}

interface AnimeSectionsProps {
  options: Option[];
  selectedLabel: string;
  id: string;
  onClick?: () => any;
}

const AnimeSections: React.FC<AnimeSectionsProps> = ({
  options,
  id,
  selectedLabel,
  onClick,
}) => {
  const animeListWrapperRef = useRef<HTMLDivElement>(null);
  const animeListRef = useRef<HTMLDivElement>(null);
  const [enableButtons, setEnableButtons] = useState<boolean>(false);
  const [showButtons, setShowButtons] = useState<boolean>(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Use refs to track current values without triggering re-renders
  const optionsRef = useRef(options);
  const selectedLabelRef = useRef(selectedLabel);

  // Compute valid options (ones with non-empty values)
  const validOptions = useMemo(() => {
    return options.filter(option => option.value && option.value.length > 0);
  }, [options]);

  // Find the selected option based on selectedLabel or default to first option
  const selectedOption = useMemo(() => {
    const found = validOptions.find(option => option.label === selectedLabel);
    return found || validOptions[0] || { label: '', value: [] };
  }, [validOptions, selectedLabel]);

  // Keep animeData as a separate state that's initialized only once
  const [animeData, setAnimeData] = useState<ListAnimeData[]>([]);

  // Update animeData only when selectedOption changes
  useEffect(() => {
    // Update refs to current props
    optionsRef.current = options;
    selectedLabelRef.current = selectedLabel;

    // Set animeData to selectedOption.value if it exists and differs from current animeData
    if (selectedOption && selectedOption.value) {
      setAnimeData(selectedOption.value);
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [selectedOption.label]); // Only depend on the label, not the value reference

  const hideButtons = useCallback(() => {
    if (!isMounted.current) return;

    if (animeListWrapperRef.current && animeListRef.current) {
      setEnableButtons(
        !(
          animeListWrapperRef.current.clientWidth >
          animeListRef.current.scrollWidth
        )
      );
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!isMounted.current) return;
    setShowButtons(true);
    hideButtons();
  }, [hideButtons]);

  const handleMouseLeave = useCallback(() => {
    if (!isMounted.current) return;
    setShowButtons(false);
  }, []);

  const scrollLeft = useCallback(() => {
    if (animeListWrapperRef.current) {
      animeListWrapperRef.current.scrollLeft -= 232 * 4;
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (animeListWrapperRef.current) {
      animeListWrapperRef.current.scrollLeft += 232 * 4;
    }
  }, []);

  const handleSectionSelect = useCallback((value: ListAnimeData[]) => {
    if (!isMounted.current) return;
    setAnimeData(value);
  }, []);

  return (
    <section
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      id={`${id.toLowerCase().replace(' ', '-')}-section`}
    >
      <div style={{marginTop: 20}}>
        <Select
          options={validOptions}
          selectedValue={animeData}
          onChange={handleSectionSelect}
          className={`${id}-select`}
        />

        {enableButtons && (
          <div
            className={`scrollers ${
              showButtons ? 'show-opacity' : 'hide-opacity'
            }`}
            style={{ top: 20, right: 25 }}
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
      </div>
      <br />

      <div className="anime-list-wrapper" ref={animeListWrapperRef}>
        <div
          className="anime-list"
          style={{ marginRight: 25 }}
          ref={animeListRef}
        >
          {(animeData && animeData.length > 0 ? animeData : Array(20).fill(undefined)).map(
            (listAnimeData, index) => {
              // Check if listAnimeData is undefined (for skeleton loading)
              if (!listAnimeData) {
                return <div key={index} className="anime-entry skeleton"></div>;
              }

              return (
                <AnimeEntry
                  onClick={onClick}
                  key={index}
                  listAnimeData={{
                    id: null,
                    mediaId: listAnimeData.mediaId,
                    progress: null,
                    media: listAnimeData.media,
                  }}
                  variant="grid"
                />
              );
            }
          )}
        </div>
      </div>
    </section>
  );
};

export default AnimeSections;
