import './styles/AnimeModal.css';

import { ISource } from '@consumet/extensions';
import { faCircleExclamation, faStar, faTv, faVolumeHigh, faVolumeXmark, faXmark, faInfo, faPlay, faList, faUsers, faHeart, faCalendar, faGlobe, faClock, faFlag, faUser, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import Store from 'electron-store';
import React, { useEffect, useRef, useState, forwardRef, ForwardedRef } from 'react';
import ReactDOM from 'react-dom';
import toast, { Toaster } from 'react-hot-toast';

import { EPISODES_INFO_URL } from '../../../constants/utils';
import { getAnimeInfo } from '../../../modules/anilist/anilistApi';
import { getAnimeHistory, setAnimeHistory, updateHistoryTimestamp } from '../../../modules/history';
import { getSourceFromProvider } from '../../../modules/providers/api';
import {
  capitalizeFirstLetter,
  getParsedFormat,
  getParsedMeanScore,
  getParsedSeasonYear,
  getProgress,
  getTitle,
  getUrlByCoverType,
  relationsToListAnimeData,
} from '../../../modules/utils';
import { ListAnimeData } from '../../../types/anilistAPITypes';
import { MediaFormat, MediaTypes, RelationTypes } from '../../../types/anilistGraphQLTypes';
import { EpisodeInfo } from '../../../types/types';
import AnimeSections from '../AnimeSections';
import { ButtonCircle } from '../Buttons';
import VideoPlayer from '../player/VideoPlayer';
import { Provider } from '../../tabs/Tab4';
import {
  AnimeModalDescription,
  AnimeModalEpisodes,
  AnimeModalGenres,
  AnimeModalOtherTitles,
  AnimeModalStatus,
  AnimeModalWatchButtons,
} from './AnimeModalElements';
import AutomaticProviderSearchModal from './AutomaticProviderSearchModal';
import EpisodesSection from './EpisodesSection';
import { ModalPage, ModalPageShadow } from './Modal';
import RelatedAnimeGrid from './RelatedAnimeGrid';
import RecommendedAnimeGrid from './RecommendedAnimeGrid';

const modalsRoot = document.getElementById('modals-root');
const STORE = new Store();
const style = getComputedStyle(document.body);

interface AnimeModalProps {
  listAnimeData: ListAnimeData;
  show: boolean;
  onClose: (clickedAnime?: ListAnimeData) => void;
  initialEpisode?: number | null;
  initialSource?: string | null;
  isDubbed?: boolean;
  preloadedEpisodesInfo?: EpisodeInfo[];
}

const AnimeModal = forwardRef<HTMLDivElement, AnimeModalProps>(
  (
    {
      listAnimeData,
      show,
      onClose,
      initialEpisode = null,
      initialSource = null,
      isDubbed = false,
      preloadedEpisodesInfo
    }: AnimeModalProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const trailerRef = useRef<HTMLVideoElement>(null);

    // Use the forwarded ref as a React.RefObject
    const finalRef = useRef<HTMLDivElement>(null);

    // Set the actual DOM element when ref changes
    useEffect(() => {
      if (typeof ref === 'function') {
        ref(finalRef.current);
      } else if (ref) {
        ref.current = finalRef.current;
      }
    }, [ref]);

    // trailer
    const [trailer, setTrailer] = useState<boolean>(true);
    const [trailerVolumeOn, setTrailerVolumeOn] = useState<boolean>(false);
    const [canRePlayTrailer, setCanRePlayTrailer] = useState<boolean>(false);

    // episodes info
    const [episodesInfo, setEpisodesInfo] = useState<EpisodeInfo[]>([]);
    const [episodesInfoHasFetched, setEpisodesInfoHasFetched] = useState(false);

    // before player: search provider matching
    const [showAutomaticProviderSerchModal, setShowAutomaticProviderSerchModal] =
      useState<boolean>(false);

    // player
    const [showPlayer, setShowPlayer] = useState<boolean>(false);
    const [animeEpisodeNumber, setAnimeEpisodeNumber] = useState<number>(1);
    const [playerISource, setPlayerISource] = useState<ISource | null>(null);

    // Tab navigation
    const [activeTab, setActiveTab] = useState<string>('overview');

    // other state variables
    const [providerAnimeId, setProviderAnimeId] = useState<string>()
    const [localProgress, setLocalProgress] = useState<number>();
    const [alternativeBanner, setAlternativeBanner] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [relatedAnime, setRelatedAnime] = useState<ListAnimeData[]>();
    const [recommendedAnime, setRecommendedAnime] = useState<ListAnimeData[]>();
    const [lastFetchedId, setLastFetchedId] = useState<number>();
    const [onScreen, setOnScreen] = useState<boolean>(true);

    const updateListAnimeData = async () => {
      if (
        !listAnimeData.media?.relations ||
        !listAnimeData.media?.recommendations
      ) {
        if (lastFetchedId === listAnimeData.media.id) return;

        setLastFetchedId(listAnimeData.media.id);

        listAnimeData = {
          id: null,
          mediaId: null,
          progress: null,
          media: await getAnimeInfo(listAnimeData.media.id),
        };

        setLocalProgress(getProgress(listAnimeData.media));
      }
    };

    const getRecommendedAnime = () => {
      const nodes = listAnimeData.media.recommendations?.nodes;
      if (!nodes) return;
      setRecommendedAnime(
        nodes.map((value) => {
          return {
            id: null,
            mediaId: null,
            progress: null,
            media: value.mediaRecommendation,
          };
        }),
      );
    };

    const getRelatedAnime = () => {
      const edges = listAnimeData.media.relations?.edges;
      if (!edges) return;

      const list = edges
        .filter((value) => value.node.type === MediaTypes.Anime)
        .map((value) => {
          value.node.format =
            value.node.format?.substring(0, 2) === 'TV' ||
            value.relationType === RelationTypes.Sequel ||
            value.relationType === RelationTypes.Prequel ||
            value.relationType === RelationTypes.Alternative ||
            // value.relationType === RelationTypes.SideStory ||
            value.relationType === RelationTypes.Parent ||
            value.relationType === RelationTypes.SpinOff
              ? (value.relationType as MediaFormat)
              : value.node.format;

          return value;
        });

      setRelatedAnime(relationsToListAnimeData(list));
    };

    useEffect(() => {
      if (!episodesInfoHasFetched) fetchEpisodesInfo();
    }, []);

    useEffect(() => {
      if (show) {
        setData();
        (async () => {
          await updateListAnimeData();
          getRelatedAnime();
          getRecommendedAnime();

          // If initialEpisode is provided, automatically start playing that episode
          if (initialEpisode !== null) {
            setAnimeEpisodeNumber(initialEpisode);
            setShowAutomaticProviderSerchModal(true);
          }
        })();
      }
    }, [show, initialEpisode]);

    // Add a new effect that runs when the anime ID changes
    useEffect(() => {
      if (show && listAnimeData && listAnimeData.media) {
        // Reset some state
        setEpisodesInfo([]);
        setEpisodesInfoHasFetched(false);
        setRelatedAnime(undefined);
        setRecommendedAnime(undefined);
        setActiveTab('overview'); // Reset to overview tab

        // Fetch new data
        setData();
        (async () => {
          await updateListAnimeData();
          getRelatedAnime();
          getRecommendedAnime();
          fetchEpisodesInfo();
        })();
      }
    }, [listAnimeData.media.id]);

    useEffect(() => {
      if (!showPlayer) {
        setPlayerISource(null);
      }
    }, [showPlayer]);

    useEffect(() => {
      if (!onScreen) return;
      try {
        if (show && trailerRef.current && canRePlayTrailer)
          trailerRef.current.play();
        setTrailerVolumeOn(STORE.get('trailer_volume_on') as boolean);
      } catch (error) {
        console.log(error);
      }
    }, [show]);

    useEffect(() => {
      if (initialEpisode && initialSource && show) {
        // Set the episode number
        setAnimeEpisodeNumber(initialEpisode);

        // Store the selected options for source and dubbed setting
        STORE.set('source_flag', initialSource);
        if (isDubbed !== undefined) {
          STORE.set('dubbed', isDubbed);
        }

        // Instead of showing the search modal, directly search for the anime and play it
        const directlySearchAndPlay = async () => {
          setLoading(true);

          // Import the searchAutomaticMatchInProvider function
          const { searchAutomaticMatchInProvider } = await import('../../../modules/providers/api');
          const { getProviderSearchMatch } = await import('../../../modules/storeVariables');

          // First check if we have a cached result
          const cachedResult = getProviderSearchMatch(
            listAnimeData.media.id!,
            initialSource as Provider,
            isDubbed
          );

          if (cachedResult) {
            // Use the cached provider ID
            await playEpisode(cachedResult.id);
          } else {
            // Search for the anime in the provider
            const providerResult = await searchAutomaticMatchInProvider(
              listAnimeData,
              initialEpisode
            );

            if (providerResult) {
              // Play using the found provider ID
              await playEpisode(providerResult.id);
            } else {
              // If not found automatically, only then show the search modal
              setShowAutomaticProviderSerchModal(true);
            }
          }
        };

        directlySearchAndPlay();
      }
    }, [initialEpisode, initialSource, show, listAnimeData]);

    useEffect(() => {
      if (show) {
        updateListAnimeData();
        document.addEventListener("mousedown", handleClickOutside);
        if (listAnimeData.id) {
          updateHistoryTimestamp();
        }
        setOnScreen(true);
      } else {
        document.removeEventListener("mousedown", handleClickOutside);
        setOnScreen(false);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [show]);

    const closeModal = (updateSection: boolean = true, clickedAnime?: ListAnimeData) => {
      if (trailerRef.current) {
        trailerRef.current.pause();
        setTimeout(() => {
          if (trailerRef.current) trailerRef.current.currentTime = 0;
        }, 400);
      }

      // Reset states for clean tab closing
      setShowPlayer(false);
      setPlayerISource(null);

      // Reset any open subtabs
      setShowAutomaticProviderSerchModal(false);

      // if (updateSection) ipcRenderer.send('update-section', 'history');

      onClose(clickedAnime);
    };

    // close modal by clicking shadow area - fixed to use finalRef.current safely
    const handleClickOutside = (event: any) => {
      if (!onScreen) return;
      // In tab-like mode, we only want to close if clicking directly on the modal wrapper
      // not anywhere inside the anime-page
      if (event.target.classList.contains('modal-page-wrapper')) {
        closeModal();
      }
    };

    const setData = async () => {
      const animeId = listAnimeData.media.id as number;
      setLocalProgress(getProgress(listAnimeData.media));

      if (listAnimeData.media.nextAiringEpisode !== null) {
        const nextAiringEpisode = listAnimeData.media.nextAiringEpisode;
        if (nextAiringEpisode) {
          const currentTime = Date.now() / 1000;
          nextAiringEpisode.timeUntilAiring = nextAiringEpisode.airingAt
            ? nextAiringEpisode.airingAt - currentTime
            : nextAiringEpisode.timeUntilAiring;
          if (
            nextAiringEpisode.timeUntilAiring < 0 ||
            !nextAiringEpisode.airingAt
          ) {
            /* Not updated history entry. */
            const entry = getAnimeHistory(animeId);
            console.log(entry);
            if (entry) {
              listAnimeData.media = await getAnimeInfo(animeId);
              entry.data = listAnimeData;
              setAnimeHistory(entry);
            }
          }
        }
      }
    };

    const fetchEpisodesInfo = async () => {
      // Skip fetching if we already have preloaded data
      if (preloadedEpisodesInfo && preloadedEpisodesInfo.length > 0) {
        return;
      }

      // Skip if already fetched
      if (episodesInfoHasFetched) return;

      // If in light mode, skip
      if (STORE.get('light_mode') as boolean) return;

      try {
        const response = await axios.get(`${EPISODES_INFO_URL}${listAnimeData.media.id}`);

        if (response.data && response.data.episodes) {
          setEpisodesInfo(response.data.episodes || []);
          setEpisodesInfoHasFetched(true);
        }

        // Preserve this functionality from the original code
        if (response.data.images) {
          const fanartUrl = getUrlByCoverType(response.data.images, 'fanart');
          setAlternativeBanner(fanartUrl || null);
        }
      } catch (error) {
        console.error('Error:', error);
        setEpisodesInfoHasFetched(true);
      }
    };

    const handleTrailerPlay = () => {
      if (trailerRef.current) {
        trailerRef.current.volume = trailerVolumeOn ? 1 : 0;
      }
    };

    const handleTrailerLoad = () => {
      try {
        if (trailerRef.current) trailerRef.current.play();
        setCanRePlayTrailer(true);
      } catch (error) {
        console.log(error);
      }
    };

    const handleTrailerError = () => {
      setTrailer(false);
    };

    const toggleTrailerVolume = () => {
      const volumeOn = !trailerVolumeOn;

      if (trailerRef.current) {
        trailerRef.current.volume = volumeOn ? 1 : 0;
        setTrailerVolumeOn(volumeOn);
        STORE.set('trailer_volume_on', volumeOn);
      }
    };

    // automatic anilist-provider matching search
    const searchMatch = async (episode: number) => {
      setAnimeEpisodeNumber(episode);
      setShowAutomaticProviderSerchModal(true);
    };

    const playEpisode = async (provAnimeId: string) => {
      if (trailerRef.current) trailerRef.current.pause();

      setShowPlayer(true);
      setLoading(true);

      try {
        const video = await getSourceFromProvider(provAnimeId, animeEpisodeNumber);

        if (!video) {
          toast.error('Could not load video source. Please try again or select a different source.', {
            duration: 3000,
          });
          setLoading(false);
          return;
        }

        setPlayerISource(video);
        setProviderAnimeId(provAnimeId);
      } catch (error) {
        console.error('Error loading episode:', error);
        toast.error('An error occurred while loading the video. Please try again.', {
          duration: 3000,
        });
        setLoading(false);
      }
    };

    const handleLocalProgressChange = (localProgress: number) => {
      setLocalProgress(localProgress);
    };

    const handleChangeLoading = (value: boolean) => {
      setLoading(value);
    };

    const handlePlayerClose = () => {
      try {
        // Update history timestamp to refresh continue watching list
        updateHistoryTimestamp();

        // Close the player
        setShowPlayer(false);
      } catch (error) {
        console.log(error);
      }
    };

    // Set active tab based on content availability
    useEffect(() => {
      if (show && relatedAnime !== undefined && recommendedAnime !== undefined) {
        if (initialEpisode) {
          setActiveTab('episodes');
        } else if (!listAnimeData.media.trailer?.id &&
                  ((relatedAnime && relatedAnime.length > 0) ||
                  (recommendedAnime && recommendedAnime.length > 0))) {
          // If there's no trailer but there are related or recommended anime, show those tabs
          if (relatedAnime && relatedAnime.length > 0) {
            setActiveTab('related');
          } else if (recommendedAnime && recommendedAnime.length > 0) {
            setActiveTab('recommended');
          }
        }
      }
    }, [show, initialEpisode, relatedAnime, recommendedAnime, listAnimeData.media.trailer]);

    // Function to determine if episodes have dub/sub availability
    const enhanceEpisodesWithLanguage = (): void => {
      // Find all episode elements
      const episodeCards = document.querySelectorAll('.anime-page .episodes-section .episode-entry .image');

      // Loop through each card and add language indicators if they don't exist
      episodeCards.forEach((container) => {
        // Check if this episode already has a language indicator
        if (!container.querySelector('.language-indicator')) {
          // Create language indicator container
          const languageIndicator = document.createElement('div');
          languageIndicator.className = 'language-indicator';

          // Add sub tag - always available
          const subTag = document.createElement('span');
          subTag.className = 'language-tag sub';
          subTag.textContent = 'Sub';
          languageIndicator.appendChild(subTag);

          // Add dub tag if dubbed
          if (isDubbed) {
            const dubTag = document.createElement('span');
            dubTag.className = 'language-tag dub';
            dubTag.textContent = 'Dub';
            languageIndicator.appendChild(dubTag);
          }

          // Add the indicator to the container
          container.appendChild(languageIndicator);
        }
      });
    };

    // Effect to enhance episodes with language indicators when the episodes tab is shown
    useEffect(() => {
      if (activeTab === 'episodes' && episodesInfo) {
        // Wait for DOM to update
        setTimeout(enhanceEpisodesWithLanguage, 100);
      }
    }, [activeTab, episodesInfo, isDubbed]);

    // Use preloaded episodes info if available
    useEffect(() => {
      if (preloadedEpisodesInfo && preloadedEpisodesInfo.length > 0) {
        setEpisodesInfo(preloadedEpisodesInfo);
        setEpisodesInfoHasFetched(true);
      }
    }, [preloadedEpisodesInfo]);

    return ReactDOM.createPortal(
      <>
        <AutomaticProviderSearchModal
          show={showAutomaticProviderSerchModal}
          onClose={() => {
            setShowAutomaticProviderSerchModal(false);
          }}
          listAnimeData={listAnimeData}
          episode={animeEpisodeNumber}
          onPlay={playEpisode}
        />

        {showPlayer && (
          <VideoPlayer
            source={playerISource}
            listAnimeData={listAnimeData}
            providerAnimeId={providerAnimeId}
            episodesInfo={episodesInfo}
            animeEpisodeNumber={animeEpisodeNumber}
            show={showPlayer}
            loading={loading}
            onLocalProgressChange={handleLocalProgressChange}
            onChangeLoading={handleChangeLoading}
            onClose={handlePlayerClose}
          />
        )}

        <ModalPageShadow show={show} className="tab-like" />
        <ModalPage modalRef={finalRef} show={show} closeModal={closeModal} className="tab-like">
          <div className="anime-page" onClick={handleClickOutside}>
            <div className="content-wrapper" ref={finalRef}>
              <button className="exit" onClick={() => closeModal()}>
                <FontAwesomeIcon className="i" icon={faArrowLeft} />
              </button>

              <div className="anime-layout">
                <div className="anime-sidebar">
                  <div className="anime-poster">
                    <img
                      src={listAnimeData.media.coverImage?.large || listAnimeData.media.coverImage?.medium}
                      alt={getTitle(listAnimeData.media)}
                    />
                  </div>

                  <div className="sidebar-info">
                    <button className="watch-now-button" onClick={() => searchMatch(1)}>
                      <FontAwesomeIcon icon={faPlay} className="play-icon" />
                      WATCH NOW
                    </button>

                    {listAnimeData.progress !== null && (
                      <div className="watching-status">
                        <div className="watching">
                          <FontAwesomeIcon icon={faList} />
                          <span>Watching</span>
                        </div>
                      </div>
                    )}

                    <div className="anime-metadata">
                      <div className="metadata-section">
                        <h4>Official Site</h4>
                        <p>{listAnimeData.media.siteUrl ? (
                          <a href="#" onClick={(e) => { e.preventDefault(); /* handle external link */ }}>
                            Link
                          </a>
                        ) : 'N/A'}</p>
                      </div>

                      <div className="metadata-section">
                        <h4>Episodes</h4>
                        <p>{listAnimeData.media.episodes || '?'} / {listAnimeData.media.nextAiringEpisode?.episode ? (listAnimeData.media.nextAiringEpisode.episode - 1) : (listAnimeData.media.episodes || '?')}</p>
                      </div>

                      <div className="metadata-section">
                        <h4>Duration</h4>
                        <p>{listAnimeData.media.duration ? `${listAnimeData.media.duration} min` : 'Unknown'}</p>
                      </div>

                      <div className="metadata-section">
                        <h4>Season</h4>
                        <p>{listAnimeData.media.season ? capitalizeFirstLetter(listAnimeData.media.season) : 'Unknown'}</p>
                      </div>

                      <div className="metadata-section">
                        <h4>Country</h4>
                        <p>JP</p>
                      </div>

                      <div className="metadata-section">
                        <h4>Adult</h4>
                        <p>{listAnimeData.media.isAdult ? 'Yes' : 'No'}</p>
                      </div>

                      {listAnimeData.media.title?.romaji && (
                        <div className="metadata-section">
                          <h4>Romaji</h4>
                          <p>{listAnimeData.media.title.romaji}</p>
                        </div>
                      )}

                      {listAnimeData.media.title?.native && (
                        <div className="metadata-section">
                          <h4>Native</h4>
                          <p>{listAnimeData.media.title.native}</p>
                        </div>
                      )}

                      {/* Genres */}
                      {listAnimeData.media.genres && listAnimeData.media.genres.length > 0 && (
                        <div className="metadata-section">
                          <h4>Genres</h4>
                          <div className="sidebar-genres">
                            {listAnimeData.media.genres.map((genre, index) => (
                              <span key={index} className="sidebar-tag">{genre}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Language Information */}
                      <div className="metadata-section">
                        <h4>Language</h4>
                        <div className="sidebar-languages">
                          <span className="sidebar-tag sub">Subtitled</span>
                          {isDubbed && <span className="sidebar-tag dub">Dubbed</span>}
                        </div>
                      </div>

                      {/* Additional Information */}
                      {listAnimeData.media.tags && listAnimeData.media.tags.length > 0 && (
                        <div className="metadata-section">
                          <h4>Tags</h4>
                          <div className="sidebar-tags-list">
                            {listAnimeData.media.tags.slice(0, 6).map((tag, index) => (
                              <span key={index} className="sidebar-tag tag">
                                {tag.name}
                                {tag.rank && <span className="tag-rank">{tag.rank}%</span>}
                              </span>
                            ))}
                            {listAnimeData.media.tags.length > 6 && (
                              <span className="sidebar-tag more">+{listAnimeData.media.tags.length - 6} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="anime-main">
                  <div className="anime-header">
                    <h1 className="title">{getTitle(listAnimeData.media)}</h1>

                    <div className="anime-categories">
                      <div className="category tv">
                        <span>{getParsedFormat(listAnimeData.media.format) || 'TV'}</span>
                      </div>
                      <div className="category year">
                        <span>{getParsedSeasonYear(listAnimeData.media)}</span>
                      </div>
                      {listAnimeData.media.season && (
                        <div className="category season">
                          <span>{capitalizeFirstLetter(listAnimeData.media.season)}</span>
                        </div>
                      )}
                      <div className="category score">
                        <FontAwesomeIcon icon={faStar} />
                        <span>{getParsedMeanScore(listAnimeData.media)}%</span>
                      </div>
                      {listAnimeData.media.isAdult && (
                        <div className="category adult">
                          <span>18+</span>
                        </div>
                      )}
                    </div>

                    <p className="anime-synopsis">
                      {listAnimeData.media.description?.replace(/<[^>]*>/g, '') || 'No description available.'}
                    </p>
                  </div>

                  <div className="tab-navigation">
                    <button
                      className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                      onClick={() => setActiveTab('overview')}
                    >
                      Overview
                    </button>
                    <button
                      className={`tab-button ${activeTab === 'related' ? 'active' : ''}`}
                      onClick={() => setActiveTab('related')}
                    >
                      Related
                    </button>
                    <button
                      className={`tab-button ${activeTab === 'recommended' ? 'active' : ''}`}
                      onClick={() => setActiveTab('recommended')}
                    >
                      Recommended
                    </button>
                    <button
                      className={`tab-button ${activeTab === 'episodes' ? 'active' : ''}`}
                      onClick={() => setActiveTab('episodes')}
                    >
                      Episodes
                    </button>
                  </div>

                  <div className="tab-content">
                    {activeTab === 'overview' && (
                      <div className="overview-tab">
                        {trailer && listAnimeData.media.trailer?.id && (
                          <div className="trailer-container">
                            <iframe
                              width="100%"
                              height="400"
                              src={`https://www.youtube.com/embed/${listAnimeData.media.trailer.id}`}
                              title="YouTube video player"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                        )}

                        <div className="overview-details">
                          <h3>Synopsis</h3>
                          <p className="full-synopsis">
                            {listAnimeData.media.description?.replace(/<[^>]*>/g, '') || 'No description available.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'related' && (
                      <div className="related-tab">
                        <RelatedAnimeGrid
                          relatedAnime={relatedAnime}
                          onClick={(clickedAnime) => {
                            if (clickedAnime) {
                              // Load the clicked anime instead of just closing
                              setOnScreen(false);
                              // First close current modal
                              closeModal(false, clickedAnime);
                            } else {
                              // If no anime provided (shouldn't happen), just close
                              setOnScreen(false);
                              closeModal(false);
                            }
                          }}
                        />
                      </div>
                    )}

                    {activeTab === 'recommended' && (
                      <div className="recommended-tab">
                        <RecommendedAnimeGrid
                          recommendedAnime={recommendedAnime}
                          onClick={(clickedAnime) => {
                            if (clickedAnime) {
                              // Load the clicked anime instead of just closing
                              setOnScreen(false);
                              // First close current modal
                              closeModal(false, clickedAnime);
                            } else {
                              // If no anime provided (shouldn't happen), just close
                              setOnScreen(false);
                              closeModal(false);
                            }
                          }}
                        />
                      </div>
                    )}

                    {activeTab === 'episodes' && (
                      <div className="episodes-tab">
                        {listAnimeData.media.nextAiringEpisode && (
                          <div className="next-episode-info standalone">
                            <span>Next: Episode {listAnimeData.media.nextAiringEpisode.episode}</span>
                          </div>
                        )}
                        <EpisodesSection
                          episodesInfo={episodesInfo}
                          episodesInfoHasFetched={episodesInfoHasFetched}
                          listAnimeData={listAnimeData}
                          loading={loading}
                          onPlay={searchMatch}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPage>
        <Toaster />
      </>,
      modalsRoot!,
    );
  }
);

export default AnimeModal;
