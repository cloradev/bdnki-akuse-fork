import 'react-activity/dist/Dots.css';
import './styles/Tab3.css';

import {
  faChevronDown,
  faFilter,
  faMagnifyingGlass,
  faPlus,
  faTimes,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useContext, useEffect, useState } from 'react';
import Dots from 'react-activity/dist/Dots';

import { FORMATS, GENRES, SEASONS, SORTS } from '../../constants/anilist';
import { searchFilteredAnime } from '../../modules/anilist/anilistApi';
import { animeDataToListAnimeData } from '../../modules/utils';
import { ListAnimeData } from '../../types/anilistAPITypes';
import { ViewerIdContext } from '../App';
import AnimeEntry from '../components/AnimeEntry';
import { PageInfo } from '../../types/anilistGraphQLTypes';
import Store from 'electron-store';

const store = new Store();

const Tab3: React.FC = () => {
  const viewerId = useContext(ViewerIdContext);

  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState('');
  const [lastUpdate, setLastUpdate] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // States for filter visibility
  const [showGenreOptions, setShowGenreOptions] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [showYearOptions, setShowYearOptions] = useState(false);
  const [showStatusOptions, setShowStatusOptions] = useState(false);
  const [showFormatOptions, setShowFormatOptions] = useState(false);

  const [searchedAnime, setSearchedAnime] = useState<
    ListAnimeData[] | undefined
  >([]);

  const handleTitleChange = (event: any) => {
    setSelectedTitle(event.target.value);
  };

  const handleAddGenre = (genre: string) => {
    if (genre && !selectedGenres.includes(genre)) {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleRemoveGenre = (genre: string) => {
    setSelectedGenres(selectedGenres.filter(g => g !== genre));
  };

  const handleAddTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const handleAddYear = (year: string) => {
    if (year && !selectedYears.includes(year)) {
      setSelectedYears([...selectedYears, year]);
    }
  };

  const handleRemoveYear = (year: string) => {
    setSelectedYears(selectedYears.filter(y => y !== year));
  };

  const handleAddStatus = (status: string) => {
    if (status && !selectedStatuses.includes(status)) {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const handleRemoveStatus = (status: string) => {
    setSelectedStatuses(selectedStatuses.filter(s => s !== status));
  };

  const handleAddFormat = (format: string) => {
    if (format && !selectedFormats.includes(format)) {
      setSelectedFormats([...selectedFormats, format]);
    }
  };

  const handleRemoveFormat = (format: string) => {
    setSelectedFormats(selectedFormats.filter(f => f !== format));
  };

  const handleSortChange = (event: any) => {
    setSelectedSort(event.target.value);
  };

  const handleClearClick = () => {
    setSelectedTitle('');
    setSelectedGenres([]);
    setSelectedTags([]);
    setSelectedYears([]);
    setSelectedStatuses([]);
    setSelectedFormats([]);
    setSelectedSort('');
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const getArgs = () => {
    let args = [
      selectedTitle !== '' ? `search: "${selectedTitle}"` : '',
      selectedGenres.length > 0 ?
        `genre_in: [${selectedGenres.map(g => `"${g}"`).join(', ')}]` : '',
      selectedTags.length > 0 ?
        `tag_in: [${selectedTags.map(t => `"${t}"`).join(', ')}]` : '',
      selectedYears.length > 0 ?
        `seasonYear_in: [${selectedYears.join(', ')}]` : '',
      selectedFormats.length > 0 ?
        `format_in: [${selectedFormats.join(', ')}]` : '',
      selectedStatuses.length > 0 ?
        `status_in: [${selectedStatuses.join(', ')}]` : '',
      selectedSort !== '' ? `sort: ${selectedSort}` : '',
      store.get('adult_content') ? '' : 'isAdult: false'
    ].filter((item) => !(item == ''));

    return args.concat('type: ANIME').join(', ');
  }

  const getSearchAnime = async (newSearch: boolean = false) => {
    if(!hasNextPage && (page > 1 || !newSearch)) return searchedAnime;

    const result = newSearch ? [] : searchedAnime;

    const anime = await searchFilteredAnime(getArgs(), viewerId, page);
    const pageInfo = anime.pageInfo as PageInfo;

    setHasNextPage(pageInfo.hasNextPage);
    if(pageInfo.hasNextPage)
      setPage(page + 1);

    return result?.concat(animeDataToListAnimeData(anime));
  }

  const handleSearchClick = async () => {
    setSearchedAnime([]);

    setPage(1);
    setHasNextPage(false);

    setSearchedAnime(
      await getSearchAnime(true)
    );
  };

  const handleInputKeydown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.keyCode === 229) return;

    if (event.code === 'Enter') handleSearchClick();
  };

  const handleScroll = async (event: any) => {
    const target: HTMLDivElement = event.target;
    const position = target.scrollTop;
    const height = target.scrollHeight - target.offsetHeight;
    const current = Date.now() / 1000;

    if(Math.floor(height - position) > 1 || current - lastUpdate < 1)
      return;

    setLastUpdate(lastUpdate);

    setSearchedAnime(
      await getSearchAnime(),
    );
  };

  // Define tags for our UI
  const availableTags = [
    { value: 'school', label: 'School' },
    { value: 'magic', label: 'Magic' },
    { value: 'mecha', label: 'Mecha' },
    { value: 'military', label: 'Military' },
    { value: 'psychological', label: 'Psychological' },
    { value: 'parody', label: 'Parody' },
    { value: 'isekai', label: 'Isekai' },
    { value: 'historical', label: 'Historical' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
    { value: 'idol', label: 'Idol' },
    { value: 'samurai', label: 'Samurai' },
    { value: 'martial-arts', label: 'Martial Arts' },
    { value: 'music', label: 'Music' },
    { value: 'food', label: 'Food' },
    { value: 'vampire', label: 'Vampire' },
    { value: 'space', label: 'Space' },
    { value: 'time-travel', label: 'Time Travel' },
    { value: 'superhero', label: 'Superhero' },
    { value: 'post-apocalyptic', label: 'Post-Apocalyptic' },
    { value: 'harem', label: 'Harem' },
    { value: 'reverse-harem', label: 'Reverse Harem' },
    { value: 'yaoi', label: 'Yaoi' },
    { value: 'yuri', label: 'Yuri' },
    { value: 'survival', label: 'Survival' }
  ];

  const availableStatuses = [
    { value: 'FINISHED', label: 'Finished' },
    { value: 'RELEASING', label: 'Releasing' },
    { value: 'NOT_YET_RELEASED', label: 'Not Yet Released' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  // Search on initial load with empty query to show popular results
  useEffect(() => {
    handleSearchClick();
  }, []);

  return (
    <div className="body-container show-tab" onScroll={handleScroll}>
      <div className="main-container">
        <div className="modern-search-container">
          {/* Search Bar */}
          <div className="search-bar-container">
            <div className="search-input-wrapper">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
              <input
                type="text"
                placeholder="Search..."
                value={selectedTitle}
                onChange={handleTitleChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                className="search-input"
              />
              {selectedTitle && (
                <button className="clear-search-btn" onClick={() => setSelectedTitle('')}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </div>
          </div>

          {/* Filters Section */}
          <div className="filters-section">
            <div className="filter-categories">
              {/* Genres Filter */}
              <div className="filter-category">
                <label>Genres</label>
                <div className="multi-select-wrapper">
                  <div className="selected-tags-container">
                    {selectedGenres.map((genre, index) => (
                      <div key={`genre-${index}`} className="selected-tag genre-tag">
                        <span>{genre}</span>
                        <button onClick={() => handleRemoveGenre(genre)}>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="filter-dropdown-container">
                    <div
                      className="filter-dropdown-header"
                      onClick={() => setShowGenreOptions(!showGenreOptions)}
                    >
                      <span>Add genres...</span>
                      <FontAwesomeIcon icon={faChevronDown} className="dropdown-icon" />
                    </div>
                    {showGenreOptions && (
                      <div className="filter-options-list">
                        {GENRES.filter(genre => genre.value && !selectedGenres.includes(genre.value)).map(genre => (
                          <div
                            key={genre.value}
                            className="filter-option genre-option"
                            onClick={() => {
                              if (genre.value) {
                                handleAddGenre(genre.value);
                                setShowGenreOptions(false);
                              }
                            }}
                          >
                            {genre.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags Filter */}
              <div className="filter-category">
                <label>Tags</label>
                <div className="multi-select-wrapper">
                  <div className="selected-tags-container">
                    {selectedTags.map((tag, index) => (
                      <div key={`tag-${index}`} className="selected-tag tag-tag">
                        <span>{tag}</span>
                        <button onClick={() => handleRemoveTag(tag)}>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="filter-dropdown-container">
                    <div
                      className="filter-dropdown-header"
                      onClick={() => setShowTagOptions(!showTagOptions)}
                    >
                      <span>Add tags...</span>
                      <FontAwesomeIcon icon={faChevronDown} className="dropdown-icon" />
                    </div>
                    {showTagOptions && (
                      <div className="filter-options-list">
                        {availableTags.filter(tag => !selectedTags.includes(tag.value)).map(tag => (
                          <div
                            key={tag.value}
                            className="filter-option tag-option"
                            onClick={() => {
                              handleAddTag(tag.value);
                              setShowTagOptions(false);
                            }}
                          >
                            {tag.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Year Filter */}
              <div className="filter-category">
                <label>Year</label>
                <div className="multi-select-wrapper">
                  <div className="selected-tags-container">
                    {selectedYears.map((year, index) => (
                      <div key={`year-${index}`} className="selected-tag year-tag">
                        <span>{year}</span>
                        <button onClick={() => handleRemoveYear(year)}>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="filter-dropdown-container">
                    <div
                      className="filter-dropdown-header"
                      onClick={() => setShowYearOptions(!showYearOptions)}
                    >
                      <span>Add years...</span>
                      <FontAwesomeIcon icon={faChevronDown} className="dropdown-icon" />
                    </div>
                    {showYearOptions && (
                      <div className="filter-options-list years-list">
                        {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i)
                          .filter(year => !selectedYears.includes(year.toString()))
                          .map(year => (
                            <div
                              key={year}
                              className="filter-option year-option"
                              onClick={() => {
                                handleAddYear(year.toString());
                                setShowYearOptions(false);
                              }}
                            >
                              {year}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="filter-category">
                <label>Status</label>
                <div className="multi-select-wrapper">
                  <div className="selected-tags-container">
                    {selectedStatuses.map((status, index) => (
                      <div key={`status-${index}`} className="selected-tag status-tag">
                        <span>{status}</span>
                        <button onClick={() => handleRemoveStatus(status)}>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="filter-dropdown-container">
                    <div
                      className="filter-dropdown-header"
                      onClick={() => setShowStatusOptions(!showStatusOptions)}
                    >
                      <span>Add status...</span>
                      <FontAwesomeIcon icon={faChevronDown} className="dropdown-icon" />
                    </div>
                    {showStatusOptions && (
                      <div className="filter-options-list">
                        {availableStatuses.filter(status => !selectedStatuses.includes(status.value)).map(status => (
                          <div
                            key={status.value}
                            className="filter-option status-option"
                            onClick={() => {
                              handleAddStatus(status.value);
                              setShowStatusOptions(false);
                            }}
                          >
                            {status.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Format Filter */}
              <div className="filter-category">
                <label>Format</label>
                <div className="multi-select-wrapper">
                  <div className="selected-tags-container">
                    {selectedFormats.map((format, index) => (
                      <div key={`format-${index}`} className="selected-tag format-tag">
                        <span>{format}</span>
                        <button onClick={() => handleRemoveFormat(format)}>
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="filter-dropdown-container">
                    <div
                      className="filter-dropdown-header"
                      onClick={() => setShowFormatOptions(!showFormatOptions)}
                    >
                      <span>Add format...</span>
                      <FontAwesomeIcon icon={faChevronDown} className="dropdown-icon" />
                    </div>
                    {showFormatOptions && (
                      <div className="filter-options-list">
                        {FORMATS.filter(format => format.value && !selectedFormats.includes(format.value)).map(format => (
                          <div
                            key={format.value}
                            className="filter-option format-option"
                            onClick={() => {
                              if (format.value) {
                                handleAddFormat(format.value);
                                setShowFormatOptions(false);
                              }
                            }}
                          >
                            {format.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Action Buttons */}
            <div className="filter-actions">
              <button className="apply-btn" onClick={handleSearchClick}>
                Apply
              </button>
              <button className="reset-btn" onClick={handleClearClick}>
                Reset
              </button>
              <button className="expand-btn" onClick={toggleExpand}>
                Expand
              </button>
            </div>
          </div>

          {/* Results Header */}
          <div className="results-header">
            {selectedTitle && (
              <p>Results for: <span>{selectedTitle}</span></p>
            )}
            {(selectedGenres.length > 0 || selectedTags.length > 0 || selectedYears.length > 0 ||
              selectedStatuses.length > 0 || selectedFormats.length > 0) && (
              <div className="active-filters">
                <span>Active filters:</span>
                {selectedGenres.length > 0 && (
                  <span className="filter-count">Genres: {selectedGenres.length}</span>
                )}
                {selectedTags.length > 0 && (
                  <span className="filter-count">Tags: {selectedTags.length}</span>
                )}
                {selectedYears.length > 0 && (
                  <span className="filter-count">Years: {selectedYears.length}</span>
                )}
                {selectedStatuses.length > 0 && (
                  <span className="filter-count">Statuses: {selectedStatuses.length}</span>
                )}
                {selectedFormats.length > 0 && (
                  <span className="filter-count">Formats: {selectedFormats.length}</span>
                )}
              </div>
            )}
          </div>

          {/* Results Grid */}
          <div className="anime-results-grid">
            {!searchedAnime ? (
              <div className="activity-indicator">
                <Dots />
              </div>
            ) : (
              searchedAnime.map((value, index) => (
                <div className="anime-card" key={index}>
                  {value.media.format && (
                    <div className="format-label">
                      {value.media.format === 'TV' ? 'TV' :
                       value.media.format === 'MOVIE' ? 'MOVIE' :
                       value.media.format === 'TV_SHORT' ? 'TV_SHORT' :
                       value.media.format === 'SPECIAL' ? 'SPECIAL' :
                       value.media.format}
                    </div>
                  )}
                  {value.media.seasonYear && (
                    <div className="year-label">{value.media.seasonYear}</div>
                  )}
                  <AnimeEntry listAnimeData={value} variant="grid" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tab3;
