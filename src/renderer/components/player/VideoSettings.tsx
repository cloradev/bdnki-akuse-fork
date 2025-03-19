import { ISubtitle } from '@consumet/extensions';
import {
  faClock,
  faGear,
  faLanguage,
  faRotateRight,
  faVideo,
  faVolumeHigh,
  faVolumeLow,
  faVolumeXmark,
  faClosedCaptioning,
  faForwardStep,
  faPlay,
  faFilm,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Store from 'electron-store';
import Hls from 'hls.js';
import React, {
  ChangeEvent,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import Select from '../Select';

const STORE = new Store();

// Helper function to convert resolution height to standard quality label
const getQualityLabel = (height: number): string => {
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  if (height >= 240) return '240p';
  if (height >= 180) return '180p';
  return `${height}p`;
};

interface SettingsProps {
  show: boolean;
  onShow: (show: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  subtitleTracks?: ISubtitle[];
  onSubtitleTrack: (track: ISubtitle) => void;
  hls?: Hls;
  onChangeEpisode: (
    episode: number | null,
    reloadAtPreviousTime?: boolean,
  ) => Promise<boolean>;
}

const VideoSettings = forwardRef<HTMLDivElement, SettingsProps>(
  (
    {
      show,
      onShow,
      videoRef,
      hls,
      onChangeEpisode,
      onSubtitleTrack,
      subtitleTracks,
    },
    ref,
  ) => {
    const [hlsData, setHlsData] = useState<Hls>();
    const [watchDubbed, setWatchDubbed] = useState<boolean>(
      STORE.get('dubbed') as boolean,
    );
    const [introSkipTime, setIntroSkipTime] = useState<number>(
      STORE.get('intro_skip_time') as number,
    );
    const [skipTime, setSkipTime] = useState<number>(
      STORE.get('key_press_skip') as number,
    );
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState<number>(STORE.get('volume') as number);
    const [speed, setSpeed] = useState('1');
    const [changeEpisodeLoading, setChangeEpisodeLoading] =
      useState<boolean>(false);
    const [subtitleTrack, setSubtitleTrack] = useState<ISubtitle | undefined>();

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.volume = volume;
      }

      const handleVideoVolumeChange = () => {
        if (videoRef.current) {
          setIsMuted(videoRef.current.muted);
          setVolume(videoRef.current.volume);
        }
      };

      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.addEventListener('volumechange', handleVideoVolumeChange);
      }

      return () => {
        if (videoElement) {
          videoElement.removeEventListener(
            'volumechange',
            handleVideoVolumeChange,
          );
        }
      };
    }, []);

    useEffect(() => {
      if (!subtitleTrack) {
        const lastUsed = STORE.get('subtitle_language') as string;
        setSubtitleTrack(
          subtitleTracks && subtitleTracks.length > 0
            ? subtitleTracks.find(
                (value) =>
                  value.lang.substring(0, lastUsed.length) ===
                  (lastUsed as string),
              ) || subtitleTracks[0]
            : undefined,
        );
      }

      setHlsData(hls);
    }, [hls]);

    const toggleShow = useCallback(() => {
      onShow(!show);
    }, [show, onShow]);

    const handleQualityChange = useCallback(
      (quality: number) => {
        if (hlsData) {
          hlsData.currentLevel = quality;
        }
      },
      [hlsData],
    );

    const toggleMute = useCallback(() => {
      if (videoRef.current) {
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
        setVolume(videoRef.current.muted ? 0 : videoRef.current.volume);
      }
    }, [videoRef]);

    const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(event.target.value);
      if (videoRef.current) {
        STORE.set('volume', newVolume);
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
      }
    };

    const handleSpeedChange = (value: string) => {
      const speedValue = value;
      setSpeed(speedValue);
      if (videoRef.current) {
        videoRef.current.playbackRate = parseFloat(speedValue);
      }
    };

    const handleWatchDubbedChange = async () => {
      const previous = STORE.get('dubbed');
      STORE.set('dubbed', !watchDubbed);

      setChangeEpisodeLoading(true);

      if (await onChangeEpisode(null, true)) {
        setWatchDubbed(!watchDubbed);
        setChangeEpisodeLoading(false);
      } else {
        STORE.set('dubbed', previous);
        setChangeEpisodeLoading(false);
      }
    };

    const handleIntroSkipTimeChange = (value: number) => {
      STORE.set('intro_skip_time', value);
      setIntroSkipTime(value);
    };

    const handleSkipTimeChange = (value: number) => {
      STORE.set('key_press_skip', value);
      setSkipTime(value);
    };

    const handleChangeSubtitleTrack = (value: ISubtitle) => {
      STORE.set('subtitle_language', value.lang);
      onSubtitleTrack(value);
      setSubtitleTrack(value);
    };

    return (
      <div className="settings-content">
        <button
          className={`b-player ${show ? 'active' : ''}`}
          onClick={toggleShow}
          title="Settings"
        >
          <FontAwesomeIcon className="i" icon={faGear} />
          <span className="video-player-tooltip">Settings</span>
        </button>
        {show && (
          <div ref={ref} className="dropdown">
            <div className="settings-grid">
              {/* Volume Card */}
              <div className="settings-card large">
                <div className="card-header">
                  <div className="icon">
                    {isMuted ? (
                      <FontAwesomeIcon icon={faVolumeXmark} />
                    ) : volume <= 0.3 ? (
                      <FontAwesomeIcon icon={faVolumeLow} />
                    ) : (
                      <FontAwesomeIcon icon={faVolumeHigh} />
                    )}
                  </div>
                  <div className="title">Volume</div>
                </div>
                <div className="card-content">
                  <div className="volume-slider">
                    <div className="volume-value">
                      <span className="volume-percentage">{Math.round(volume * 100)}%</span>
                      <button className="mute-button" onClick={toggleMute}>
                        {isMuted ? (
                          <FontAwesomeIcon icon={faVolumeXmark} />
                        ) : (
                          <FontAwesomeIcon icon={faVolumeHigh} />
                        )}
                      </button>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                    />
                  </div>
                </div>
              </div>

              {/* Video Quality Card */}
              <div className="settings-card">
                <div className="card-header">
                  <div className="icon">
                    <FontAwesomeIcon icon={faVideo} />
                  </div>
                  <div className="title">Video Quality</div>
                </div>
                <div className="card-content">
                  {hlsData && hlsData.levels.length > 0 && (
                    <div className="option-buttons">
                      {hlsData.levels.map((level, index) => (
                        <button
                          key={`quality-${index}`}
                          className={`option-button ${hlsData.currentLevel === index ? 'active' : ''}`}
                          onClick={() => handleQualityChange(index)}
                        >
                          {level.width && level.height
                            ? getQualityLabel(level.height)
                            : `Level ${index}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Playback Speed Card */}
              <div className="settings-card">
                <div className="card-header">
                  <div className="icon">
                    <FontAwesomeIcon icon={faClock} />
                  </div>
                  <div className="title">Playback Speed</div>
                </div>
                <div className="card-content">
                  <div className="option-buttons">
                    {['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'].map((value) => (
                      <button
                        key={`speed-${value}`}
                        className={`option-button ${speed === value ? 'active' : ''}`}
                        onClick={() => handleSpeedChange(value)}
                      >
                        {value === '1' ? 'Normal' : `${value}×`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skip Time Card */}
              <div className="settings-card">
                <div className="card-header">
                  <div className="icon">
                    <FontAwesomeIcon icon={faForwardStep} />
                  </div>
                  <div className="title">Skip Time</div>
                </div>
                <div className="card-content">
                  <div className="option-buttons">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={`skip-${value}`}
                        className={`option-button ${skipTime === value ? 'active' : ''}`}
                        onClick={() => handleSkipTimeChange(value)}
                      >
                        {value}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Intro Skip Time Card */}
              <div className="settings-card">
                <div className="card-header">
                  <div className="icon">
                    <FontAwesomeIcon icon={faRotateRight} />
                  </div>
                  <div className="title">Intro Skip</div>
                </div>
                <div className="card-content">
                  <div className="option-buttons">
                    {[5, 10, 15, 20].map((value) => (
                      <button
                        key={`intro-${value}`}
                        className={`option-button ${introSkipTime === value ? 'active' : ''}`}
                        onClick={() => handleIntroSkipTimeChange(value)}
                      >
                        {value}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subtitles Card */}
              {subtitleTrack && subtitleTracks && subtitleTracks.length > 0 && (
                <div className="settings-card">
                  <div className="card-header">
                    <div className="icon">
                      <FontAwesomeIcon icon={faClosedCaptioning} />
                    </div>
                    <div className="title">Subtitles</div>
                  </div>
                  <div className="card-content">
                    <div className="option-buttons">
                      {subtitleTracks.map((track, index) => (
                        <button
                          key={`sub-${index}`}
                          className={`option-button ${subtitleTrack.lang === track.lang ? 'active' : ''}`}
                          onClick={() => handleChangeSubtitleTrack(track)}
                        >
                          {track.lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Watch Dubbed Toggle */}
              <div className="settings-card">
                <div className="card-header">
                  <div className="icon">
                    <FontAwesomeIcon icon={faLanguage} />
                  </div>
                  <div className="title">Audio</div>
                </div>
                <div className="card-content">
                  <div className="toggle-switch">
                    <span className="switch-label">Watch Dubbed</span>
                    <label>
                      <input
                        type="checkbox"
                        checked={watchDubbed}
                        onChange={handleWatchDubbedChange}
                        disabled={changeEpisodeLoading}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default VideoSettings;
