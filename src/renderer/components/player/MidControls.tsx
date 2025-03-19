import 'react-activity/dist/Dots.css';

import {
  faPause,
  faPlay,
  faRotateLeft,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import Dots from 'react-activity/dist/Dots';

interface SettingsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  playing: boolean;
  playVideo: () => void;
  pauseVideo: () => void;
  loading: boolean;
  onDblClick?: (event: any) => void;
}

const MidControls: React.FC<SettingsProps> = ({
  videoRef,
  playing,
  playVideo,
  pauseVideo,
  loading,
  onDblClick,
}) => {
  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    if (videoRef.current) {
      playing ? pauseVideo() : playVideo();
    }
  };

  const handleFastRewind = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    try {
      if (videoRef.current) {
        videoRef.current.currentTime -= 5;
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleFastForward = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    try {
      if (videoRef.current) {
        videoRef.current.currentTime += 5;
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="mid-controls" onDoubleClick={onDblClick}>
      {loading ? (
        <Dots />
      ) : (
        <>
          <button className="b-player skip-backward" onClick={handleFastRewind}>
            <FontAwesomeIcon className="i" icon={faRotateLeft} />
          </button>
          <div className="b-player play-pause-center">
            <button className="b-player play-pause" onClick={handlePlayPause}>
              <FontAwesomeIcon
                className="i"
                icon={playing ? faPause : faPlay}
              />
            </button>
          </div>
          <div>
            <button
              className="b-player skip-forward"
              onClick={handleFastForward}
            >
              <FontAwesomeIcon className="i" icon={faRotateRight} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MidControls;
