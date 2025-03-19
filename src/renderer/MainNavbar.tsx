import './styles/MainNavbar.css';

import {
  faBookmark,
  faCalendar,
  faCircleUser,
  faCompass,
  IconDefinition,
} from '@fortawesome/free-regular-svg-icons';
import {
  faBookmark as faBookmarkFull,
  faCalendar as faCalendarFull,
  faCompass as faCompassFull,
  faGear,
  faMagnifyingGlass,
  faMagnifyingGlassPlus,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ipcRenderer } from 'electron';
import Store from 'electron-store';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import isAppImage from '../modules/packaging/isAppImage';
import AuthCodeModal from './components/modals/AuthCodeModal';
import UserModal from './components/modals/UserModal';

const Li: React.FC<{
  text: string;
  icon: IconDefinition;
  to: string;
  active: boolean;
  onClick: () => void;
}> = ({ text, icon, to, active, onClick }) => {
  // Shorten long text for certain nav items to prevent overflow
  // Only necessary for certain navigation items
  let displayText = text;
  if (text === 'Discover' || text === 'Settings' || text === 'Calendar') {
    // Keep the original text but make it fit better in the nav
    displayText = text;
  }

  return (
    <Link to={to} onClick={onClick}>
      <li className={active ? 'active' : ''}>
        <div className={`nav-item ${active ? 'active' : ''}`}>
          <div className="i-wrapper">
            <FontAwesomeIcon className="i" icon={icon} />
          </div>
          <span className="nav-label" title={text}>{displayText}</span>
        </div>
      </li>
    </Link>
  );
};

const LiLink: React.FC<{
  text: string;
  icon: IconDefinition;
  onClick: () => void;
}> = ({ text, icon, onClick }) => {
  // Consistent treatment with Li component
  let displayText = text;
  if (text === 'Search' || text === 'Profile' || text === 'Login') {
    displayText = text;
  }

  return (
    <li onClick={onClick}>
      <div className="nav-item">
        <div className="i-wrapper">
          <FontAwesomeIcon className="i" icon={icon} />
        </div>
        <span className="nav-label" title={text}>{displayText}</span>
      </div>
    </li>
  );
};

const store = new Store();

const MainNavbar: React.FC<{ avatar?: string }> = ({ avatar }) => {
  const logged = store.get('logged') as boolean;

  const [activeTab, setActiveTab] = useState(1);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [showAuthCodeModal, setShowAuthCodeModal] = useState<boolean>(false);
  const [isPackaged, setIsPackaged] = useState<boolean>(false);

  useEffect(() => {
    ipcRenderer.invoke('get-is-packaged').then((packaged) => {
      setIsPackaged(packaged);
    });
  }, []);

  return (
    <nav className="main">
      <ul>
        <Li
          text="Home"
          icon={activeTab === 1 ? faCompassFull : faCompass}
          to="/"
          active={activeTab === 1}
          onClick={() => setActiveTab(1)}
        />
        {logged && (
          <Li
            text="History"
            icon={activeTab === 2 ? faBookmarkFull : faBookmark}
            to="/tab2"
            active={activeTab === 2}
            onClick={() => setActiveTab(2)}
          />
        )}
        <Li
          text="Schedule"
          icon={activeTab === 5 ? faCalendarFull : faCalendar}
          to="/tab5"
          active={activeTab === 5}
          onClick={() => setActiveTab(5)}
        />
        <Li
          text="Search"
          icon={activeTab === 3 ? faMagnifyingGlassPlus : faMagnifyingGlass}
          to="/tab3"
          active={activeTab === 3}
          onClick={() => setActiveTab(3)}
        />
        <Li
          text="Settings"
          icon={faGear}
          to="/tab4"
          active={activeTab === 4}
          onClick={() => setActiveTab(4)}
        />
        <div style={{ flexGrow: 1 }} /> {/* Spacer */}
        {logged ? (
          <>
            <UserModal
              show={showUserModal}
              onClose={() => setShowUserModal(false)}
            />
            <li
              onClick={() => setShowUserModal(true)}
              style={{ marginTop: 'auto' }}
            >
              <div className="nav-item">
                <div className="img-wrapper">
                  <img src={avatar} alt="Profile" />
                </div>
                <span className="nav-label">Profile</span>
              </div>
            </li>
          </>
        ) : (
          <li
            onClick={() => {
              setShowAuthCodeModal(true);
              ipcRenderer.send('open-login-url');
            }}
            style={{ marginTop: 'auto' }}
          >
            <div className="nav-item">
              <div className="i-wrapper">
                <FontAwesomeIcon className="i" icon={faCircleUser} />
              </div>
              <span className="nav-label">Log-In</span>
            </div>
          </li>
        )}
        {(isAppImage || !isPackaged) && !logged && (
          <>
            <AuthCodeModal
              show={showAuthCodeModal}
              onClose={() => setShowAuthCodeModal(false)}
            />
            {/* <LiLink
              text="Insert auth code"
              icon={faLaptopCode}
              onClick={() => setShowAuthCodeModal(true)}
            /> */}
          </>
        )}
      </ul>
    </nav>
  );
};

export default MainNavbar;
