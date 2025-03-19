import Store from 'electron-store';
import * as os from 'os';
import React, { ChangeEvent, useContext, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import './styles/Tab4.css';

import { getViewerInfo } from '../../modules/anilist/anilistApi';
import { getOptions, makeRequest } from '../../modules/requests';
import { clearAllHistory } from '../../modules/history';
import { AuthContext, ViewerIdContext } from '../App';
import { BACKGROUND_THEMES, COLOR_THEMES, FONT_FAMILIES, applyFontFamily } from '../../modules/theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDesktop,
  faCode,
  faUserCircle,
  faGear,
  faPalette,
  faSync,
  faEyeSlash,
  faLanguage,
  faList,
  faFont
} from '@fortawesome/free-solid-svg-icons';

const STORE = new Store();

export type Provider =
  | 'HIANIME'
  | 'GOGOANIME'
  | 'YUKI'
  | 'MAZE'
  | 'PAHE'
  | 'ANIMEPARADISE'
  | 'ANIMEHEAVEN'
  | 'ANIMEUNITY';

interface Option {
  value: any;
  label: string;
}

export const LANGUAGE_OPTIONS: Option[] = [
  { value: 'YUKI', label: '🇺🇸 Yuki' },
  { value: 'ANIMEUNITY', label: '🇮🇹 AnimeUnity' },
  { value: 'MAZE', label: '🇺🇸 Maze' },
  { value: 'PAHE', label: '🇺🇸 Pahe' },
  { value: 'ANIMEPARADISE', label: '🇺🇸 AnimeParadise' },
  { value: 'ANIMEHEAVEN', label: '🇺🇸 AnimeHeaven' },
  { value: 'HIANIME', label: '🌍 HiAnime' },
  { value: 'GOGOANIME', label: '🇺🇸 Gogoanime' },
];

const SettingsSection: React.FC<{
  title: string;
  icon: any;
  children: React.ReactNode;
}> = ({ title, icon, children }) => {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <FontAwesomeIcon icon={icon} className="settings-section-icon" />
        <h2>{title}</h2>
      </div>
      <div className="settings-section-content">
        {children}
      </div>
    </div>
  );
};

const SettingItem: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => {
  return (
    <div className="setting-item">
      <div className="setting-item-info">
        <div className="setting-item-title">{title}</div>
        {description && <div className="setting-item-description">{description}</div>}
      </div>
      <div className="setting-item-control">
        {children}
      </div>
    </div>
  );
};

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled = false }) => {
  return (
    <div className="toggle-switch-container">
      <button
        className={`toggle-button ${checked ? 'enabled' : 'disabled'}`}
        onClick={onChange}
        disabled={disabled}
        aria-checked={checked}
        role="switch"
      >
        <div className="toggle-indicator"></div>
      </button>
    </div>
  );
};

const SelectControl: React.FC<{
  value: any;
  options: Option[];
  onChange: (value: any) => void;
}> = ({ value, options, onChange }) => {
  return (
    <div className="select-control">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="settings-select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const RadioControl: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}> = ({ value, options, onChange }) => {
  return (
    <div className="radio-control">
      {options.map((option) => (
        <button
          key={option.value}
          className={`radio-button ${value === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

const Tab4: React.FC = () => {
  const logged = useContext(AuthContext);
  const viewerId = useContext(ViewerIdContext);
  const [userFetched, setUserFetched] = useState<boolean>(false);

  useEffect(() => {
    if (viewerId && !userFetched)
      (async () => {
        const viewerInfo = await getViewerInfo(viewerId);
        const displayAdultContent = viewerInfo.options
          .displayAdultContent as boolean;
        STORE.set('adult_content', displayAdultContent);
        setUserFetched(true);
        setAdultContent(displayAdultContent);
      })();
  }, [viewerId, userFetched]);

  const [activeSection, setActiveSection] = useState<string>('App Behavior');

  const [updateProgress, setUpdateProgress] = useState<boolean>(
    STORE.get('update_progress') as boolean,
  );
  const [autoplayNext, setAutoplayNext] = useState<boolean>(
    STORE.get('autoplay_next') as boolean,
  );
  const [watchDubbed, setWatchDubbed] = useState<boolean>(
    STORE.get('dubbed') as boolean,
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    STORE.get('source_flag') as string,
  );
  const [introSkipTime, setIntroSkipTime] = useState<number>(
    STORE.get('intro_skip_time') as number,
  );
  const [showDuration, setShowDuration] = useState<boolean>(
    STORE.get('show_duration') as boolean,
  );
  const [episodesPerPage, setEpisodesPerPage] = useState<number>(
    STORE.get('episodes_per_page') as number,
  );
  const [skipTime, setSkipTime] = useState<number>(
    STORE.get('key_press_skip') as number,
  );
  const [adultContent, setAdultContent] = useState<boolean>(
    STORE.get('adult_content') as boolean,
  );
  const [lightMode, setLightMode] = useState<boolean>(
    STORE.get('light_mode') as boolean,
  );
  const [hideHomeContinue, setHideHomeContinue] = useState<boolean>(
    STORE.get('hide_home_continue') ? true : false,
  );
  const [preferredPage, setPreferredPage] = useState<string>(
    STORE.get('preferred_page') ? STORE.get('preferred_page') as string : 'watch',
  );
  const [primaryColor, setPrimaryColor] = useState<string>(
    STORE.get('primary_color') ? STORE.get('primary_color') as string : 'Minato',
  );
  const [backgroundTheme, setBackgroundTheme] = useState<string>(
    STORE.get('background_theme') ? STORE.get('background_theme') as string : 'Dark',
  );
  const [episodeLayout, setEpisodeLayout] = useState<string>(
    STORE.get('episode_layout') ? STORE.get('episode_layout') as string : 'Auto',
  );
  const [cardLayout, setCardLayout] = useState<string>(
    STORE.get('card_layout') ? STORE.get('card_layout') as string : 'Classic',
  );
  const [cardSize, setCardSize] = useState<string>(
    STORE.get('card_size') ? STORE.get('card_size') as string : 'Medium',
  );
  const [navbarStyle, setNavbarStyle] = useState<string>(
    STORE.get('navbar_style') ? STORE.get('navbar_style') as string : 'Dock',
  );
  const [hideSpoilers, setHideSpoilers] = useState<boolean>(
    STORE.get('hide_spoilers') ? true : false,
  );
  const [autoUpdate, setAutoUpdate] = useState<boolean>(
    STORE.get('auto_update') !== undefined ? STORE.get('auto_update') as boolean : true,
  );
  const [autoLaunch, setAutoLaunch] = useState<boolean>(
    STORE.get('auto_launch') !== undefined ? STORE.get('auto_launch') as boolean : false,
  );
  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(
    STORE.get('minimize_to_tray') !== undefined ? STORE.get('minimize_to_tray') as boolean : true,
  );
  const [notifications, setNotifications] = useState<boolean>(
    STORE.get('notifications') !== undefined ? STORE.get('notifications') as boolean : true,
  );
  const [fontFamily, setFontFamily] = useState<string>(
    STORE.get('font_family') ? STORE.get('font_family') as string : 'Poppins',
  );

  // Apply font family whenever it changes
  useEffect(() => {
    applyFontFamily(fontFamily);
  }, [fontFamily]);

  const [clearHistory, setClearHistory] = useState<boolean>(false);

  const handleEpisodesPerPage = (value: any) => {
    STORE.set('episodes_per_page', parseInt(value));
    setEpisodesPerPage(parseInt(value));
  };

  const handleClearHistory = () => {
    clearAllHistory();
    setClearHistory(!clearHistory);
  };

  const handleLightMode = () => {
    const val = !lightMode;
    STORE.set('light_mode', val);
    setLightMode(val);
  };

  const handleAdultContent = async () => {
    STORE.set('adult_content', !adultContent);
    if (STORE.get('access_token')) {
      const mutation = `mutation($adultContent:Boolean){
        UpdateUser(displayAdultContent:$adultContent) {
          id
          name
        }
      }`;

      var headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + STORE.get('access_token'),
      };

      var variables = {
        adultContent: !adultContent,
      };

      const options = getOptions(mutation, variables);
      await makeRequest('POST', 'https://graphql.anilist.co', headers, options);
    }

    setAdultContent(!adultContent);
  };

  const handleUpdateProgressChange = () => {
    STORE.set('update_progress', !updateProgress);
    setUpdateProgress(!updateProgress);
  };

  const handleWatchDubbedChange = () => {
    STORE.set('dubbed', !watchDubbed);
    setWatchDubbed(!watchDubbed);
  };

  const handleLanguageChange = (value: any) => {
    STORE.set('source_flag', value);
    setSelectedLanguage(value);
  };

  const handleIntroSkipTimeChange = (value: any) => {
    STORE.set('intro_skip_time', parseInt(value));
    setIntroSkipTime(parseInt(value));
  };

  const handleSkipTimeChange = (value: any) => {
    STORE.set('key_press_skip', parseInt(value));
    setSkipTime(parseInt(value));
  };

  const handleShowDurationChange = () => {
    STORE.set('show_duration', !showDuration);
    setShowDuration(!showDuration);
  };

  const handleAutoplayNextChange = () => {
    STORE.set('autoplay_next', !autoplayNext);
    setAutoplayNext(!autoplayNext);
  };

  const handleHideHomeContinueChange = () => {
    STORE.set('hide_home_continue', !hideHomeContinue);
    setHideHomeContinue(!hideHomeContinue);
  };

  const handlePreferredPageChange = (value: string) => {
    STORE.set('preferred_page', value);
    setPreferredPage(value);
  };

  const handlePrimaryColorChange = (value: string) => {
    STORE.set('primary_color', value);
    setPrimaryColor(value);
  };

  const handleBackgroundThemeChange = (value: string) => {
    STORE.set('background_theme', value);
    setBackgroundTheme(value);
  };

  const handleEpisodeLayoutChange = (value: string) => {
    STORE.set('episode_layout', value);
    setEpisodeLayout(value);
  };

  const handleCardLayoutChange = (value: string) => {
    STORE.set('card_layout', value);
    setCardLayout(value);
  };

  const handleCardSizeChange = (value: string) => {
    STORE.set('card_size', value);
    setCardSize(value);
  };

  const handleNavbarStyleChange = (value: string) => {
    STORE.set('navbar_style', value);
    setNavbarStyle(value);
  };

  const handleHideSpoilersChange = () => {
    STORE.set('hide_spoilers', !hideSpoilers);
    setHideSpoilers(!hideSpoilers);
  };

  const handleAutoUpdateChange = () => {
    STORE.set('auto_update', !autoUpdate);
    setAutoUpdate(!autoUpdate);
  };

  const handleAutoLaunchChange = () => {
    STORE.set('auto_launch', !autoLaunch);
    setAutoLaunch(!autoLaunch);
  };

  const handleMinimizeToTrayChange = () => {
    STORE.set('minimize_to_tray', !minimizeToTray);
    setMinimizeToTray(!minimizeToTray);
  };

  const handleNotificationsChange = () => {
    STORE.set('notifications', !notifications);
    setNotifications(!notifications);
  };

  const handleFontFamilyChange = (value: string) => {
    console.log(`Changing font to: ${value}`);
    STORE.set('font_family', value);
    setFontFamily(value);

    // Force a redraw
    document.body.style.display = 'none';
    setTimeout(() => {
      document.body.style.display = '';
    }, 10);
  };

  const getDetailedOSInfo = () => {
    const platform = os.platform();
    const arch = os.arch();
    const release = os.release();
    const osType = os.type();

    return `${osType} ${arch} (${release})`;
  };

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'App Behavior':
        return (
          <SettingsSection title="App Behavior" icon={faGear}>
            <SettingItem
              title="Auto Sync with AniList"
              description="Automatically sync to current episode progress with AniList if the entry status is set to 'watching'. Note: This feature is not supported on embedded players."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{updateProgress ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={updateProgress}
                  onChange={handleUpdateProgressChange}
                  disabled={!logged}
                />
              </div>
            </SettingItem>

            <SettingItem
              title="Hide Spoilers"
              description="Block episode images, titles and descriptions throughout the app to prevent exposure to potential spoilers."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{hideSpoilers ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={hideSpoilers}
                  onChange={handleHideSpoilersChange}
                />
              </div>
            </SettingItem>

            <SettingItem
              title="Watch or Info Page"
              description="Choose whether to go to the info page or watch page when selecting an anime."
            >
              <RadioControl
                value={preferredPage}
                options={[
                  { value: 'watch', label: 'watch' },
                  { value: 'info', label: 'info' }
                ]}
                onChange={handlePreferredPageChange}
              />
            </SettingItem>

            <SettingItem
              title="Auto Update"
              description="Automatically check for updates when the app starts."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{autoUpdate ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={autoUpdate}
                  onChange={handleAutoUpdateChange}
                />
              </div>
            </SettingItem>

            <SettingItem
              title="Auto Launch"
              description="Automatically launch the app when you start your computer."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{autoLaunch ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={autoLaunch}
                  onChange={handleAutoLaunchChange}
                />
              </div>
            </SettingItem>

            <SettingItem
              title="Minimize to Tray"
              description="Minimize the app to the system tray instead of closing it."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{minimizeToTray ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={minimizeToTray}
                  onChange={handleMinimizeToTrayChange}
                />
              </div>
            </SettingItem>

            <SettingItem
              title="Notifications"
              description="Show notifications when new episodes are available."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{notifications ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={notifications}
                  onChange={handleNotificationsChange}
                />
              </div>
            </SettingItem>
          </SettingsSection>
        );

      case 'Appearance':
        return (
          <SettingsSection title="Appearance" icon={faPalette}>
            <SettingItem
              title="Primary Color"
              description="Select the primary accent color for the UI."
            >
              <div className="accent-color-previews">
                {Object.entries(COLOR_THEMES).map(([name, color]) => (
                  <div
                    key={name}
                    className="accent-color-option"
                    onClick={() => handlePrimaryColorChange(name)}
                  >
                    <div
                      className={`accent-color-circle accent-${name.toLowerCase()} ${primaryColor === name ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                    <div className="accent-color-label">{name}</div>
                  </div>
                ))}
              </div>
            </SettingItem>

            <SettingItem
              title="Background Theme"
              description="Select the background darkness level for the UI."
            >
              <div className="background-theme-previews">
                {Object.keys(BACKGROUND_THEMES).map((theme) => {
                  // Create CSS compatible class name
                  const themeClass = theme.toLowerCase().replace(/\s+/g, '');

                  return (
                    <div
                      key={theme}
                      className="theme-preview-container"
                      onClick={() => handleBackgroundThemeChange(theme)}
                    >
                      <div className={`background-theme-preview bg-theme-${themeClass} ${backgroundTheme === theme ? 'active' : ''}`}>
                        <div className="color-stripe"></div>
                        <div className="color-stripe"></div>
                        <div className="color-stripe"></div>
                        <div className="color-stripe"></div>
                        <div className="color-stripe"></div>
                      </div>
                      <div className="theme-label">{theme}</div>
                    </div>
                  );
                })}
              </div>
            </SettingItem>

            <SettingItem
              title="Font Family"
              description="Select the font family to use throughout the app."
            >
              <div className="settings-font-options">
                <div className="font-family-previews">
                  {Object.entries(FONT_FAMILIES).map(([name, family]) => (
                    <div
                      key={name}
                      className={`font-family-option ${fontFamily === name ? 'active' : ''}`}
                      onClick={() => handleFontFamilyChange(name)}
                    >
                      <div
                        className="font-family-sample"
                        style={{ fontFamily: family }}
                      >
                        BODENKAI
                      </div>
                      <div className="font-family-label">{name}</div>
                    </div>
                  ))}
                </div>
                <button
                  className="reset-font-button"
                  onClick={() => handleFontFamilyChange('Poppins')}
                >
                  Reset to Default Font
                </button>
              </div>
            </SettingItem>

            <SettingItem
              title="Episode List Layout"
              description="Set the default layout for episode lists."
            >
              <SelectControl
                value={episodeLayout}
                options={[
                  { value: 'Auto', label: 'Auto' },
                  { value: 'Compact', label: 'Compact' },
                  { value: 'Comfortable', label: 'Comfortable' }
                ]}
                onChange={handleEpisodeLayoutChange}
              />
            </SettingItem>

            <SettingItem
              title="Continue Watching on Home Page"
              description="Show or hide the continue watching section on the home page."
            >
              <RadioControl
                value={hideHomeContinue ? 'Hide' : 'Show'}
                options={[
                  { value: 'Hide', label: 'Hide' },
                  { value: 'Show', label: 'Show' }
                ]}
                onChange={(value) => setHideHomeContinue(value === 'Hide')}
              />
            </SettingItem>

            <SettingItem
              title="Card Layout"
              description="Select the layout for the anime cards. Only affects Homepage & Searchpage"
            >
              <RadioControl
                value={cardLayout}
                options={[
                  { value: 'Classic', label: 'Classic' },
                  { value: 'AniChart', label: 'AniChart' },
                  { value: 'Card List', label: 'Card List' }
                ]}
                onChange={handleCardLayoutChange}
              />
            </SettingItem>

            <SettingItem
              title="Card Size"
              description="Choose between large or medium card sizes in classic layout. Only affects Homepage & Searchpage"
            >
              <RadioControl
                value={cardSize}
                options={[
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Large', label: 'Large' }
                ]}
                onChange={handleCardSizeChange}
              />
            </SettingItem>

            <SettingItem
              title="Navbar Style (Mobile)"
              description="Set the default navbar look."
            >
              <RadioControl
                value={navbarStyle}
                options={[
                  { value: 'Dock', label: 'Dock' },
                  { value: 'Float', label: 'Float' }
                ]}
                onChange={handleNavbarStyleChange}
              />
            </SettingItem>
          </SettingsSection>
        );

      case 'Player':
        return (
          <SettingsSection title="Player" icon={faDesktop}>
            <SettingItem
              title="Source Language"
              description="Select the language in which you want to watch the episodes"
            >
              <SelectControl
                value={selectedLanguage}
                options={LANGUAGE_OPTIONS}
                onChange={handleLanguageChange}
              />
            </SettingItem>

            <SettingItem
              title="Watch Dubbed"
              description="Prefer dubbed versions of anime when available."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{watchDubbed ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={watchDubbed}
                  onChange={handleWatchDubbedChange}
                />
              </div>
            </SettingItem>

            <SettingItem
              title="Autoplay Next Episode"
              description="Automatically play the next episode when the current one ends."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{autoplayNext ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={autoplayNext}
                  onChange={handleAutoplayNextChange}
                />
              </div>
            </SettingItem>

            <SettingItem
              title="Intro Skip Duration"
              description="Select the duration of the default intro skip (in seconds)"
            >
              <SelectControl
                value={introSkipTime}
                options={[
                  { value: 60, label: '60 seconds' },
                  { value: 65, label: '65 seconds' },
                  { value: 70, label: '70 seconds' },
                  { value: 75, label: '75 seconds' },
                  { value: 80, label: '80 seconds' },
                  { value: 85, label: '85 seconds' },
                  { value: 90, label: '90 seconds' },
                  { value: 95, label: '95 seconds' },
                ]}
                onChange={handleIntroSkipTimeChange}
              />
            </SettingItem>

            <SettingItem
              title="Key Skip Duration"
              description="Select the amount you want to skip using the arrows (in seconds)"
            >
              <SelectControl
                value={skipTime}
                options={[
                  { label: '1 second', value: 1 },
                  { label: '2 seconds', value: 2 },
                  { label: '3 seconds', value: 3 },
                  { label: '4 seconds', value: 4 },
                  { label: '5 seconds', value: 5 },
                ]}
                onChange={handleSkipTimeChange}
              />
            </SettingItem>

            <SettingItem
              title="Show Episode Duration"
              description="Show the duration of episodes in the episode list."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{showDuration ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={showDuration}
                  onChange={handleShowDurationChange}
                />
              </div>
            </SettingItem>
          </SettingsSection>
        );

      case 'General':
        return (
          <SettingsSection title="General" icon={faUserCircle}>
            <SettingItem
              title="Show 18+ Content"
              description="Show adult content in search results and recommendations."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{adultContent ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={adultContent}
                  onChange={handleAdultContent}
                  disabled={!logged}
                />
              </div>
            </SettingItem>

            <SettingItem
              title="Episodes Per Page"
              description="Set how many episodes to display per page"
            >
              <SelectControl
                value={episodesPerPage}
                options={[
                  { value: 5, label: '5 episodes' },
                  { value: 10, label: '10 episodes' },
                  { value: 20, label: '20 episodes' },
                  { value: 30, label: '30 episodes' },
                  { value: 40, label: '40 episodes' },
                  { value: 50, label: '50 episodes' },
                ]}
                onChange={handleEpisodesPerPage}
              />
            </SettingItem>

            <SettingItem
              title="Light Mode"
              description="Use light mode instead of dark mode."
            >
              <div className="setting-control-with-status">
                <span className="setting-status-text">{lightMode ? 'Enabled' : 'Disabled'}</span>
                <ToggleSwitch
                  checked={lightMode}
                  onChange={handleLightMode}
                />
              </div>
            </SettingItem>
          </SettingsSection>
        );

      case 'Sync & Storage':
        return (
          <SettingsSection title="Sync & Storage" icon={faSync}>
            <SettingItem
              title="Clear History"
              description="Clear all watch history data from this device."
            >
              <button
                className="action-button danger-button"
                onClick={handleClearHistory}
              >
                Clear History
              </button>
            </SettingItem>
          </SettingsSection>
        );
    }
  };

  return (
    <div className="body-container show-tab">
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <div className="settings-version">
            <div>Bodenkai Version {require('../../../package.json').version}</div>
            <div className="os-info">{getDetailedOSInfo()}</div>
          </div>
        </div>

        <div className="settings-main">
          <div className="settings-sidebar">
            <button
              className={`settings-nav-button ${activeSection === 'App Behavior' ? 'active' : ''}`}
              onClick={() => setActiveSection('App Behavior')}
            >
              <FontAwesomeIcon icon={faGear} className="settings-nav-icon" />
              <span>App Behavior</span>
            </button>

            <button
              className={`settings-nav-button ${activeSection === 'Appearance' ? 'active' : ''}`}
              onClick={() => setActiveSection('Appearance')}
            >
              <FontAwesomeIcon icon={faPalette} className="settings-nav-icon" />
              <span>Appearance</span>
            </button>

            <button
              className={`settings-nav-button ${activeSection === 'Player' ? 'active' : ''}`}
              onClick={() => setActiveSection('Player')}
            >
              <FontAwesomeIcon icon={faDesktop} className="settings-nav-icon" />
              <span>Player</span>
            </button>

            <button
              className={`settings-nav-button ${activeSection === 'General' ? 'active' : ''}`}
              onClick={() => setActiveSection('General')}
            >
              <FontAwesomeIcon icon={faUserCircle} className="settings-nav-icon" />
              <span>General</span>
            </button>

            <button
              className={`settings-nav-button ${activeSection === 'Sync & Storage' ? 'active' : ''}`}
              onClick={() => setActiveSection('Sync & Storage')}
            >
              <FontAwesomeIcon icon={faSync} className="settings-nav-icon" />
              <span>Sync & Storage</span>
            </button>
          </div>

          <div className="settings-content">
            {renderSettingsContent()}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default Tab4;
