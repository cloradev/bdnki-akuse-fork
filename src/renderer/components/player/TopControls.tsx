import 'react-activity/dist/Dots.css';

import { ISubtitle } from '@consumet/extensions';
import {
  faAngleLeft,
  faCompress,
  faExpand,
  faLayerGroup,
  faUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';

import { ListAnimeData } from '../../../types/anilistAPITypes';
import { EpisodeInfo } from '../../../types/types';
import VideoSettings from './VideoSettings';
import VideoEpisodesDisplay from './VideoEpisodesDisplay';

interface TopControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  hls?: Hls;
  listAnimeData: ListAnimeData;
  episodesInfo?: EpisodeInfo[];
  episodeNumber: number;
  episodeTitle: string;
  showPreviousEpisodeButton: boolean;
  showNextEpisodeButton: boolean;
  fullscreen: boolean;
  subtitleTracks?: ISubtitle[];
  onSubtitleTrack: (track: ISubtitle) => void;
  onFullScreentoggle: () => void;
  onPiPToggle: () => void;
  onChangeEpisode: (
    episode: number | null,
    reloadAtPreviousTime?: boolean,
  ) => Promise<boolean>;
  onExit: () => void;
  onDblClick?: (event: any) => void;
  onDropdownToggle: (isDropdownOpen: boolean) => void;
}

const TopControls: React.FC<TopControlsProps> = ({
  videoRef,
  hls,
  listAnimeData,
  episodesInfo,
  episodeNumber,
  episodeTitle,
  showPreviousEpisodeButton,
  showNextEpisodeButton,
  fullscreen,
  onFullScreentoggle,
  onPiPToggle,
  onChangeEpisode,
  onExit,
  onDblClick,
  onDropdownToggle,
  subtitleTracks,
  onSubtitleTrack,
}) => {
  const settingsRef = useRef<HTMLDivElement>(null);

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [episodesDisplayVisible, setEpisodesDisplayVisible] = useState<boolean>(false); // Only show when button is clicked

  useEffect(() => {
    onDropdownToggle(showSettings || episodesDisplayVisible);
  }, [showSettings, episodesDisplayVisible]);

  const closeOthers = () => {
    setShowSettings(false);
    if (videoRef.current) videoRef.current.focus();
  };

  const toggleEpisodesDisplay = () => {
    setEpisodesDisplayVisible(!episodesDisplayVisible);
  };

  const handleExit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    onExit();
  };

  const handlePiP = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    onPiPToggle();
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    onFullScreentoggle();
  };

  return (
    <div className="up-controls" onDoubleClick={onDblClick}>
      <div className="left">
        <div className="info exit-video" onClick={handleExit}>
          <span className="title">{listAnimeData.media.title?.english}</span>
          <span className="back">
            <FontAwesomeIcon className="i" icon={faAngleLeft} />
            <span className="episode">
              {`Ep. ${episodeNumber} - ${episodeTitle}`}
            </span>
          </span>
        </div>
      </div>
      <div className="center">
        {episodesDisplayVisible && (
          <VideoEpisodesDisplay
            listAnimeData={listAnimeData}
            episodeNumber={episodeNumber}
            episodesInfo={episodesInfo}
            onChangeEpisode={onChangeEpisode}
            onClose={() => setEpisodesDisplayVisible(false)}
          />
        )}
      </div>
      <div className="right">
        <VideoSettings
          show={showSettings}
          subtitleTracks={subtitleTracks?.filter(
            (value) =>
              value.lang &&
              value.lang !== 'Thumbnails' &&
              value.lang !== 'thumbnails',
          )}
          videoRef={videoRef}
          ref={settingsRef}
          hls={hls}
          onSubtitleTrack={onSubtitleTrack}
          onShow={(show) => {
            closeOthers();
            setShowSettings(show);
          }}
          onChangeEpisode={onChangeEpisode}
        />
        <button className="b-player" onClick={toggleEpisodesDisplay}>
          <FontAwesomeIcon className="i" icon={episodesDisplayVisible ? faLayerGroup : faLayerGroup} />
          <span className="video-player-tooltip">
            {episodesDisplayVisible ? 'Hide Episodes' : 'Show Episodes'}
          </span>
        </button>
        <button className="b-player" onClick={handlePiP}>
          <FontAwesomeIcon className="i" icon={faUpRightFromSquare} />
          <span className="video-player-tooltip">Picture-in-Picture</span>
        </button>
        <button className="b-player fullscreen" onClick={handleFullscreen}>
          <FontAwesomeIcon
            className="i"
            icon={fullscreen ? faCompress : faExpand}
          />
          <span className="video-player-tooltip">
            {fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default TopControls;
