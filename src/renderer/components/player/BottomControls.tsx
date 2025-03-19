import Store from 'electron-store';
import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../../../modules/utils';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { ButtonMain } from '../Buttons';
import { SkipEvent } from '../../../types/aniskipTypes';
const STORE = new Store();

interface BottomControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  currentTime?: number;
  duration?: number;
  buffered?: TimeRanges;
  skipEvents?: SkipEvent[];
  playVideo: () => void;
  pauseVideo: () => void;
  onDblClick?: (event: any) => void;
  currentResolution?: string;
}

const BottomControls: React.FC<BottomControlsProps> = ({
  videoRef,
  containerRef,
  currentTime,
  duration,
  buffered,
  skipEvents,
  playVideo,
  pauseVideo,
  onDblClick,
  currentResolution,
}) => {
  const videoTimelineRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState('0%');
  const [bufferedBarWidth, setBufferedBarWidth] = useState('0%');

  const [videoCurrentTime, setVideoCurrentTime] = useState('00:00');
  const [remainingTime, setRemainingTime] = useState('00:00');
  const [videoDuration, setVideoDuration] = useState('00:00');

  const [hoverTime, setHoverTime] = useState(0);
  const [hoverOffset, setHoverOffset] = useState(0);

  const introSkip = STORE.get('intro_skip_time') as number;
  const [showDuration, setShowDuration] = useState(
    STORE.get('show_duration') as boolean,
  );

  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setVideoCurrentTime(formatTime(currentTime ?? 0));
    setVideoDuration(formatTime(duration ?? 0));
    setRemainingTime(formatTime((duration ?? 0) - (currentTime ?? 0)));
  }, [currentTime, duration]);

  useEffect(() => {
    if (!duration || !currentTime) return;

    const progress = (currentTime / duration) * 100;
    setProgressBarWidth(`${progress}%`);

    if (buffered && buffered.length > 0) {
      const bufferedEnd = buffered.end(buffered.length - 1);
      const bufferedProgress = (bufferedEnd / duration) * 100;
      setBufferedBarWidth(`${bufferedProgress}%`);
    }
  }, [currentTime, duration, buffered]);

  // failed attempt to improve performance, gonna keep it here
  const updateTimeOnDragVisually = (event: MouseEvent) => {
    if (!videoTimelineRef.current || !duration) return;

    const rect = videoTimelineRef.current.getBoundingClientRect();
    const offsetX = Math.max(
      0,
      Math.min(event.clientX - rect.left, rect.width),
    );
    const percentage = offsetX / rect.width;
    const newTime = percentage * duration;

    setHoverOffset(offsetX);
    setHoverTime(newTime);

    setProgressBarWidth(`${(newTime / duration) * 100}%`);
    setVideoCurrentTime(formatTime(newTime));
    setRemainingTime(formatTime((duration ?? 0) - newTime));

    return newTime;
  };

  const updateTimeOnDrag = (event: MouseEvent) => {
    const newTime = updateTimeOnDragVisually(event);

    if (!videoRef.current || !newTime) return;
    videoRef.current.currentTime = newTime;
  };

  useEffect(() => {
    if (!isDragging) playVideo();
  }, [isDragging]);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDragging(true);
    pauseVideo();
    updateTimeOnDrag(event.nativeEvent);

    window.addEventListener('mousemove', updateTimeOnDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  const stopDrag = () => {
    setIsDragging(false);

    window.removeEventListener('mousemove', updateTimeOnDrag);
    window.removeEventListener('mouseup', stopDrag);
  };

  const calculateHoverTime = (event: React.MouseEvent) => {
    if (!videoTimelineRef.current || !duration) return;

    const rect = videoTimelineRef.current.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const percentage = offsetX / rect.width;
    const newHoverTime = percentage * duration;

    setHoverOffset(offsetX);
    setHoverTime(newHoverTime);
  };

  const handleShowDuration = (event: React.MouseEvent) => {
    event.stopPropagation();
    const show = !showDuration;
    STORE.set('show_duration', show);
    setShowDuration(show);
  };

  const handleSkipIntro = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime += introSkip;
    }
  };

  return (
    <div
      className="bottom-controls"
      onDoubleClick={onDblClick}
    >
      <div className="skip-button">
        <ButtonMain
          text={introSkip}
          icon={faPlus}
          tint="light"
          onClick={handleSkipIntro}
        />
      </div>

      <p className="current-time">{videoCurrentTime}</p>

      <div
        className={`video-timeline${isDragging ? ' is-dragging' : ''}`}
        ref={videoTimelineRef}
        onMouseMove={calculateHoverTime}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="progress-area">
          <div
            className="video-buffered-bar"
            style={{ width: bufferedBarWidth }}
          />
          <div
            className="video-progress-bar"
            style={{
              width: progressBarWidth,
            }}
          />

          <span
            className="hover-time-tooltip"
            style={{
              left: `${hoverOffset}px`,
              opacity: isDragging || isHovering ? '1' : '0',
            }}
          >
            {formatTime(hoverTime)}
          </span>
        </div>
      </div>

      <p className="video-duration" onClick={handleShowDuration}>
        {showDuration ? videoDuration : `-${remainingTime}`}
      </p>

      <div className="resolution-display">
        {currentResolution || ''}
      </div>
    </div>
  );
};

export default BottomControls;
