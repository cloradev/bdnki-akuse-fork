import './styles/AutoUpdateModal.css';

import ReactDOM from 'react-dom';
import { ModalPage, ModalPageShadow, ModalPageSizeableContent } from './Modal';
import { useRef, useState, useEffect } from 'react';
import { ButtonMain } from '../Buttons';
import {
  faCloudDownload,
} from '@fortawesome/free-solid-svg-icons';
import DOMPurify from 'dompurify';
import { ipcRenderer, IpcRendererEvent } from 'electron';

const modalsRoot = document.getElementById('modals-root');

const AutoUpdateModal: React.FC<{ show: boolean; onClose: () => void }> = ({
  show,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const [version, setVersion] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [progressMB, setProgressMB] = useState<string>('');
  const [totalMB, setTotalMB] = useState<string>('');
  const [downloadedBarWidth, setDownloadedBarWidth] = useState<string>('0%');

  // Use useEffect to set up and clean up event listeners
  useEffect(() => {
    // Define the event handlers
    const handleUpdateAvailableInfo = (event: IpcRendererEvent, info: any) => {
      setVersion(info.version);
      setNotes(info.releaseNotes);
    };

    const handleDownloading = (event: IpcRendererEvent, info: any) => {
      setProgressMB(((info.percent * info.total) / 100 / 1024 / 1024).toFixed(2));
      setTotalMB((info.total / 1024 / 1024).toFixed(2));
      setDownloadedBarWidth(`${info.percent}%`); // Removed extra quotes
    };

    // Register the event listeners
    ipcRenderer.on('update-available-info', handleUpdateAvailableInfo);
    ipcRenderer.on('downloading', handleDownloading);

    // Clean up the event listeners when the component unmounts
    return () => {
      ipcRenderer.removeListener('update-available-info', handleUpdateAvailableInfo);
      ipcRenderer.removeListener('downloading', handleDownloading);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  return ReactDOM.createPortal(
    <>
      <ModalPageShadow show={show} />
      <ModalPage show={show} modalRef={modalRef} closeModal={onClose}>
        <ModalPageSizeableContent
          width={350}
          closeModal={onClose}
          title="New update available"
        >
          <div className="auto-update-modal-content">
            <div className="heading">
              <span className="version">v{version}</span>
              {/* <span className="date">2024-6-20</span> */}
            </div>

            <p>
              A new version of bodenkai is available. Update and wait for it to
              finish to download the latest changes.
            </p>

            <p
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(notes),
              }}
            />

            <div className="mb">
              <span>
                {progressMB} / {totalMB} MB
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="downloaded"
                style={{ width: downloadedBarWidth }}
              />
            </div>

            <div className="download-wrapper">
              <ButtonMain
                text={'Download'}
                tint="primary"
                icon={faCloudDownload}
                onClick={() => {
                  ipcRenderer.send('download-update');
                }}
              />
            </div>
          </div>
        </ModalPageSizeableContent>
      </ModalPage>
    </>,
    modalsRoot!,
  );
};

export default AutoUpdateModal;
