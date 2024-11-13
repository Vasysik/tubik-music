import { useState, useEffect, useRef } from 'react';
import { 
  PlayArrow, Pause, SkipNext, SkipPrevious, 
  VolumeUp, Favorite, Shuffle, Repeat, 
  AccountCircle, Settings 
} from '@mui/icons-material';

function Player() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showWave, setShowWave] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(savedFavorites);
  }, []);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    fetch('/api/tracks')
      .then(res => res.json())
      .then(data => {
        setTracks(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          setCurrentTrack(data[0]);
          initializeShuffledIndices(data.length);
        }
      })
      .catch(err => console.error('Error fetching tracks:', err));
  }, []);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [currentTrack]);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.load();
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Autoplay prevented:", error);
          });
        }
      }
    }
  }, [currentTrack]);

  const initializeShuffledIndices = (length) => {
    const indices = Array.from({ length }, (_, i) => i);
    setShuffledIndices(shuffleArray([...indices]));
  };

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleTrackClick = (track) => {
    const isSameTrack = currentTrack?.id === track.id;
    if (isSameTrack) {
      handlePlay();
    } else {
      const newIndex = tracks.findIndex(t => t.id === track.id);
      setCurrentTrackIndex(newIndex);
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Playback prevented:", error);
          });
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrevTrack = () => {
    if (tracks.length === 0) return;
    
    let newIndex;
    if (isShuffleOn) {
      const currentShuffleIndex = shuffledIndices.indexOf(currentTrackIndex);
      newIndex = shuffledIndices[currentShuffleIndex === 0 ? shuffledIndices.length - 1 : currentShuffleIndex - 1];
    } else {
      newIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    }
    
    setCurrentTrackIndex(newIndex);
    setCurrentTrack(tracks[newIndex]);
    setIsPlaying(true);
  };

  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    
    let newIndex;
    if (isShuffleOn) {
      const currentShuffleIndex = shuffledIndices.indexOf(currentTrackIndex);
      newIndex = shuffledIndices[currentShuffleIndex === shuffledIndices.length - 1 ? 0 : currentShuffleIndex + 1];
    } else {
      newIndex = currentTrackIndex === tracks.length - 1 ? 0 : currentTrackIndex + 1;
    }
    
    setCurrentTrackIndex(newIndex);
    setCurrentTrack(tracks[newIndex]);
    setIsPlaying(true);
  };

  const handleTrackEnd = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === 'all' || isShuffleOn) {
      handleNextTrack();
    } else {
      setIsPlaying(false);
    }
  };

  const toggleRepeatMode = () => {
    const modes = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const toggleShuffle = () => {
    if (!isShuffleOn) {
      initializeShuffledIndices(tracks.length);
    }
    setIsShuffleOn(!isShuffleOn);
  };

  const toggleFavorite = (trackId) => {
    setFavorites(prev => {
      if (prev.includes(trackId)) {
        return prev.filter(id => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="app-container">
      <div className="player-header">
        {!isAdmin ? (
          <button 
            className="control-btn login-btn" 
            onClick={() => setShowLogin(true)}
          >
            Войти
          </button>
        ) : (
          <button 
            className="control-btn admin-btn" 
            onClick={() => setShowAdminPanel(!showAdminPanel)}
          >
            Добавить трек
          </button>
        )}
      </div>

      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowLogin(false)}>×</button>
            <Login 
              onLogin={() => {
                setIsAdmin(true)
                setShowLogin(false)
              }} 
            />
          </div>
        </div>
      )}

      {showAdminPanel && (
        <div className="modal-overlay" onClick={() => setShowAdminPanel(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowAdminPanel(false)}>×</button>
            <AdminPanel />
          </div>
        </div>
      )}



      {/* Main Content */}
      <main className="main-content">
        {showWave && <div className="wave-animation" />}
        
        <div className="tracks-container">
          {tracks.map(track => (
            <div 
                key={track.id}
                className={`track-card ${currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => handleTrackClick(track)}
              >
              <div className="track-image">
                <img src={track.coverUrl || 'https://wallpapers-clan.com/wp-content/uploads/2023/12/cute-anime-girl-winter-forest-desktop-wallpaper-preview.jpg'} alt={track.title} />
                {currentTrack?.id === track.id && isPlaying && (
                  <div className="playing-animation">
                    <span></span><span></span><span></span><span></span>
                  </div>
                )}
              </div>
              <div className="track-info">
                <h3>{track.title}</h3>
                <p>{track.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Player Bar */}
      <div className="player-bar">
        <audio
          ref={audioRef}
          src={currentTrack ? `/api/tracks/${currentTrack.id}` : ''}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleTrackEnd}
        />

        <div className="player-bar-content">
          <div className="now-playing">
            {currentTrack && (
              <>
                <img 
                  src={currentTrack.coverUrl || 'https://wallpapers-clan.com/wp-content/uploads/2023/12/cute-anime-girl-winter-forest-desktop-wallpaper-preview.jpg'} 
                  alt={currentTrack.title}
                />
                <div className="track-info">
                  <h4>{currentTrack.title}</h4>
                  <p>{currentTrack.artist}</p>
                </div>
                <button 
                  className={`favorite-btn ${favorites.includes(currentTrack.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorite(currentTrack.id)}
                >
                  <Favorite />
                </button>
              </>
            )}
          </div>

          <div className="player-controls">
            <div className="control-buttons">
              <button 
                className={`control-btn ${isShuffleOn ? 'active' : ''}`}
                onClick={toggleShuffle}
              >
                <Shuffle />
              </button>
              <button className="control-btn" onClick={handlePrevTrack}>
                <SkipPrevious />
              </button>
              <button className="play-btn" onClick={handlePlay}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </button>
              <button className="control-btn" onClick={handleNextTrack}>
                <SkipNext />
              </button>
              <button 
                className={`control-btn ${repeatMode !== 'none' ? 'active' : ''}`}
                onClick={toggleRepeatMode}
                data-tooltip={`Repeat: ${repeatMode}`}
              >
                <Repeat />
              </button>
            </div>

            <div className="progress-container">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                className="progress-slider"
                onChange={(e) => {
                  const time = Number(e.target.value);
                  setCurrentTime(time);
                  if (audioRef.current) {
                    audioRef.current.currentTime = time;
                  }
                }}
              />
              <span>{formatTime(duration || 0)}</span>
            </div>
          </div>

          <div className="volume-control">
            <VolumeUp />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              className="volume-slider"
              onChange={(e) => {
                const value = Number(e.target.value);
                setVolume(value);
                if (audioRef.current) {
                  audioRef.current.volume = value;
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;
