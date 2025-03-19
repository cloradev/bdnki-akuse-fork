import React, { useState, useEffect, useContext, useCallback } from 'react';
import Heading from '../components/Heading';
import './styles/Tab5.css';
import Store from 'electron-store';
import { Dots } from 'react-activity';
import { getAiringSchedule } from '../../modules/anilist/anilistApi';
import { FuzzyDate, AiringSchedule as AiringScheduleType } from '../../types/anilistGraphQLTypes';
import { AuthContext, ViewerIdContext } from '../App';

const STORE = new Store();

// Define the API response type with rate limiting information
interface AiringScheduleResponse {
  schedules: AiringScheduleType[];
  rateLimited: boolean;
}

interface AnimeSchedule {
  id: number;
  title: string;
  image: string;
  episode: number;
  airTime: string;
  dayOfWeek: string;
  airingAt: number;
}

// Calculate dates for the next 7 days
const getDatesForNextWeek = (): { dayOfWeek: string, date: string, timestamp: number }[] => {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);

    const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });

    dates.push({
      dayOfWeek,
      date: formattedDate,
      timestamp: Math.floor(date.getTime() / 1000)
    });
  }

  return dates;
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_ABBREVIATED = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_DATES = getDatesForNextWeek();

// Helper function to format time from a timestamp
const formatAiringTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper function to get day of week from a timestamp
const getDayOfWeek = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return DAYS_OF_WEEK[date.getDay()];
};

const Tab5: React.FC = () => {
  const light_mode = STORE.get('light_mode') as boolean;
  const viewerId = useContext(ViewerIdContext);
  const [selectedDay, setSelectedDay] = useState<string>(getCurrentDayOfWeek());
  const [selectedDate, setSelectedDate] = useState<string>(
    WEEK_DATES.find(d => d.dayOfWeek === getCurrentDayOfWeek())?.date || WEEK_DATES[0].date
  );
  const [scheduleData, setScheduleData] = useState<Record<string, AnimeSchedule[]>>({});
  const [dayLoaded, setDayLoaded] = useState<Record<string, boolean>>({});
  const [dayHasAnime, setDayHasAnime] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetchTimes, setLastFetchTimes] = useState<Record<string, number>>({});

  // Get the current day of week
  function getCurrentDayOfWeek(): string {
    return DAYS_OF_WEEK[new Date().getDay()];
  }

  const today = getCurrentDayOfWeek();

  // Update selected date when day changes and fetch data if needed
  useEffect(() => {
    const dayData = WEEK_DATES.find(d => d.dayOfWeek === selectedDay);
    if (dayData) {
      setSelectedDate(dayData.date);

      // Load data for the selected day if not already loaded
      if (!dayLoaded[selectedDay]) {
        fetchDaySchedule(selectedDay);
      }
    }
  }, [selectedDay, dayLoaded]);

  // Fetch anime schedule data for a specific day
  const fetchDaySchedule = useCallback(async (day: string, forceRefresh = false) => {
    const currentTime = Date.now();

    // Use function references to get the latest state values without dependencies
    setIsLoading(true);
    setFetchError(null);

    // Check if we should use cached data
    if (!forceRefresh) {
      // Get the last fetch time from state directly inside the function
      const lastFetch = lastFetchTimes[day] || 0;

      // Don't refetch if less than 15 minutes have passed and data exists
      const dayScheduleExists = scheduleData[day]?.length >= 0;
      if (currentTime - lastFetch < 15 * 60 * 1000 && dayScheduleExists) {
        console.log(`Using cached data for ${day}`);
        setIsLoading(false);
        return;
      }

      // Try to load from local storage
      const cachedData = localStorage.getItem(`animeSchedule_${day}`);
      const cachedTimestamp = localStorage.getItem(`animeScheduleTimestamp_${day}`);

      // Use cached data if it exists and is less than 1 hour old
      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        if (currentTime - timestamp < 60 * 60 * 1000) { // 1 hour
          try {
            const parsedData = JSON.parse(cachedData) as AnimeSchedule[];
            console.log(`Using locally cached data for ${day}`);

            // Update the state with functional updates to avoid dependencies
            setScheduleData(prev => ({
              ...prev,
              [day]: parsedData
            }));
            setDayLoaded(prev => ({
              ...prev,
              [day]: true
            }));
            setDayHasAnime(prev => ({
              ...prev,
              [day]: parsedData.length > 0
            }));
            setLastFetchTimes(prev => ({
              ...prev,
              [day]: timestamp
            }));

            setFetchError(null);
            setIsLoading(false);
            return;
          } catch (e) {
            console.error('Failed to parse cached data:', e);
          }
        }
      }
    }

    try {
      // Fetch anime for the specific day
      console.log(`Fetching schedule for ${day}`);
      const response = await getAiringSchedule(viewerId, undefined, undefined, day);
      const airingSchedule = response.schedules;
      const wasRateLimited = response.rateLimited;

      // Process the anime schedule data
      const daySchedule: AnimeSchedule[] = [];

      if (airingSchedule && airingSchedule.length > 0) {
        console.log(`Processing ${airingSchedule.length} anime for ${day}`);

        airingSchedule.forEach(schedule => {
          if (schedule.media) {
            const airTime = formatAiringTime(schedule.airingAt);

            const animeSchedule: AnimeSchedule = {
              id: schedule.id,
              title: schedule.media.title?.userPreferred || schedule.media.title?.romaji || schedule.media.title?.english || 'Unknown',
              image: schedule.media.coverImage?.large || schedule.media.coverImage?.medium || '',
              episode: schedule.episode,
              airTime: airTime,
              dayOfWeek: day,
              airingAt: schedule.airingAt
            };

            daySchedule.push(animeSchedule);
          }
        });

        // Sort by air time
        daySchedule.sort((a, b) => a.airingAt - b.airingAt);

        // Set warning if rate limited
        if (wasRateLimited) {
          setFetchError('Showing partial data due to API rate limits');
        }
      }

      // Update state with the fetched data using functional updates
      setScheduleData(prev => ({
        ...prev,
        [day]: daySchedule
      }));
      setDayLoaded(prev => ({
        ...prev,
        [day]: true
      }));
      setDayHasAnime(prev => ({
        ...prev,
        [day]: daySchedule.length > 0
      }));
      setLastFetchTimes(prev => ({
        ...prev,
        [day]: currentTime
      }));

      // Cache the data
      try {
        localStorage.setItem(`animeSchedule_${day}`, JSON.stringify(daySchedule));
        localStorage.setItem(`animeScheduleTimestamp_${day}`, currentTime.toString());
      } catch (err) {
        console.warn('Failed to cache schedule data to localStorage:', err);
      }

    } catch (error) {
      console.error(`Error fetching schedule for ${day}:`, error);
      setFetchError(`Failed to load schedule for ${day}`);
    } finally {
      setIsLoading(false);
    }
  }, [viewerId]);

  // Load today's data on initial mount
  useEffect(() => {
    fetchDaySchedule(today);
  }, [fetchDaySchedule]);

  // Group anime by air time for the selected day
  const groupedByTime = React.useMemo(() => {
    const daySchedule = scheduleData[selectedDay] || [];

    return daySchedule.reduce((acc, anime) => {
      if (!acc[anime.airTime]) {
        acc[anime.airTime] = [];
      }
      acc[anime.airTime].push(anime);
      return acc;
    }, {} as Record<string, AnimeSchedule[]>);
  }, [scheduleData, selectedDay]);

  // Sort time slots chronologically
  const sortedTimeSlots = React.useMemo(() => {
    return Object.keys(groupedByTime).sort((a, b) => {
      // Convert to 24-hour format for proper sorting
      const timeA = a.split(':');
      const timeB = b.split(':');

      // Handle 12-hour format if needed
      const hourA = parseInt(timeA[0]);
      const hourB = parseInt(timeB[0]);

      if (hourA !== hourB) {
        return hourA - hourB;
      }

      const minuteA = parseInt(timeA[1]);
      const minuteB = parseInt(timeB[1]);

      return minuteA - minuteB;
    });
  }, [groupedByTime]);

  // Function to get entry count for a given day
  const getEntryCount = (day: string): number => {
    return scheduleData[day]?.length || 0;
  };

  // Handle day selection
  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    // If the day hasn't been loaded yet, this will trigger the useEffect to load it
  };

  // Function to check if a day has anime (or hasn't been loaded yet)
  const dayMightHaveAnime = (day: string): boolean => {
    return !dayLoaded[day] || dayHasAnime[day];
  };

  return (
    <div className="body-container show-tab">
      <div className="main-container lifted schedule-page">
        <main>
          {light_mode && <Heading text="Anime Schedule" />}
          {!light_mode && <h1 className="schedule-title"> {selectedDate}</h1>}

          <div className="schedule-days">
            {WEEK_DATES.map((dayData) => (
              <button
                key={dayData.dayOfWeek}
                className={`day-button
                  ${selectedDay === dayData.dayOfWeek ? 'active' : ''}
                  ${dayData.dayOfWeek === today ? 'today' : ''}
                  ${dayMightHaveAnime(dayData.dayOfWeek) ? 'has-anime' : ''}
                  ${!dayLoaded[dayData.dayOfWeek] ? 'not-loaded' : ''}`}
                onClick={() => handleDaySelect(dayData.dayOfWeek)}
              >
                <span className="day-full">{dayData.dayOfWeek}</span>
                <span className="day-short">{DAYS_ABBREVIATED[DAYS_OF_WEEK.indexOf(dayData.dayOfWeek)]}</span>
                {getEntryCount(dayData.dayOfWeek) > 0 && (
                  <span className="entry-count">{getEntryCount(dayData.dayOfWeek)}</span>
                )}
              </button>
            ))}
          </div>

          {fetchError && (
            <div className="warning-banner">
              <span>{fetchError}</span>
              <button
                className="retry-button-small"
                onClick={() => fetchDaySchedule(selectedDay, true)}
                disabled={isLoading}
              >
                Retry
              </button>
            </div>
          )}

          <div className="schedule-container">
            {isLoading && !scheduleData[selectedDay]?.length ? (
              <div className="activity-indicator">
                <Dots />
              </div>
            ) : sortedTimeSlots.length === 0 ? (
              <div className="no-schedule">
                <div className="no-schedule-text">No anime scheduled for {selectedDay}, {selectedDate}</div>
                <div className="no-schedule-hint">Try selecting a different day from the tabs above</div>
              </div>
            ) : (
              sortedTimeSlots.map((timeSlot) => (
                <div className="schedule-section" key={timeSlot}>
                  <div className="time-slot-header">
                    <div className="time-slot-icon">
                      <span className="time-dot"></span>
                    </div>
                    <h3 className="time-slot-label">{timeSlot}</h3>
                    <span className="time-slot-count">{groupedByTime[timeSlot].length} anime</span>
                  </div>

                  <div className="schedule-cards">
                    {groupedByTime[timeSlot].map((anime, index) => (
                      <div className={`schedule-card ${selectedDay === today ? 'today-highlight' : ''}`} key={anime.id}>
                        <div className="number-badge">{index + 1}</div>
                        <div className="anime-cover">
                          <img
                            src={anime.image}
                            alt={anime.title}
                            loading="lazy"
                          />
                        </div>
                        <div className="anime-info">
                          <div className="anime-title" title={anime.title}>{anime.title}</div>
                          <div className="episode-info">Episode {anime.episode}</div>
                          <div className="time-info">
                            {anime.dayOfWeek === today ? 'Today' : anime.dayOfWeek} at {anime.airTime}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Tab5;
