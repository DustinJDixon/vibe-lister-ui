import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Music, CheckCircle, X } from "lucide-react";

export default function App() {
  const [mood, setMood] = useState("");
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [toast, setToast] = useState(null);
  const [songCount, setSongCount] = useState(10);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [showGenres, setShowGenres] = useState(false);

  const genres = [
    "Pop", "Rock", "Hip Hop", "R&B", "Country", "Electronic", "Jazz", "Classical",
    "Reggae", "Blues", "Folk", "Punk", "Metal", "Indie", "Alternative", "Funk",
    "Soul", "Gospel", "Latin", "World", "Ambient", "House", "Techno", "Dubstep"
  ];

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleSpotifyCallback(code, urlParams);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generatePlaylist = async () => {
    if (!mood.trim()) return;
    setLoading(true);
    setPlaylist(null);

    try {
      const res = await axios.post("https://vibe-lister-backend.onrender.com/generate-playlist", { 
        mood, 
        songCount, 
        genres: selectedGenres 
      });
      setPlaylist(res.data);
    } catch (error) {
      console.error(error);
      setPlaylist({ error: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleSpotifyCallback = async (code, urlParams) => {
    console.log("Handling Spotify callback with code:", code);
    try {
      const res = await axios.post("https://vibe-lister-backend.onrender.com/auth/callback", { code });
      setSessionId(res.data.sessionId);
      console.log("Session ID set:", res.data.sessionId);
      
      showToast("✅ Connected to Spotify! Generate a new playlist to import to Spotify.");
    } catch (error) {
      console.error("Spotify auth failed:", error);
      showToast("Failed to connect to Spotify. Please try again.", "error");
    }
  };

  const createPlaylist = async (sessionIdToUse) => {
    const currentSessionId = sessionIdToUse || sessionId;
    if (!playlist || playlist.error || !currentSessionId) return;
    
    await createPlaylistWithData(currentSessionId, playlist);
  };

  const createPlaylistWithData = async (sessionIdToUse, playlistData) => {
    if (!playlistData || playlistData.error || !sessionIdToUse) return;
    
    setSpotifyLoading(true);
    try {
      const res = await axios.post("https://vibe-lister-backend.onrender.com/create-spotify-playlist", {
        sessionId: sessionIdToUse,
        playlistName: playlistData.playlistName,
        tracks: playlistData.tracks,
      });

      if (res.data.success) {
        showToast(`🎉 Playlist created! ${res.data.tracksAdded} tracks added to Spotify`);
        window.open(res.data.playlistUrl, '_blank');
      } else {
        showToast(res.data.error || "Unknown error occurred", "error");
      }
    } catch (error) {
      console.error("Import failed:", error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to import playlist";
      showToast(errorMsg, "error");
    } finally {
      setSpotifyLoading(false);
    }
  };

  const importToSpotify = async () => {
    if (!playlist || playlist.error || !sessionId) return;
    await createPlaylist();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 p-4">
      <motion.h1
        className="text-3xl font-bold mb-6 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Vibe Lister - Create Your Playlist Now 🎶
      </motion.h1>

      {/* Connect to Spotify First */}
      {!sessionId && (
        <motion.div
          className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-semibold mb-4">Connect to Spotify</h2>
          <p className="text-gray-600 mb-6">Connect your Spotify account to import playlists directly</p>
          <button
            onClick={async () => {
              try {
                const res = await axios.get("https://vibe-lister-backend.onrender.com/auth/spotify");
                showToast("Redirecting to Spotify for authorization...");
                setTimeout(() => {
                  window.location.href = res.data.authUrl;
                }, 1000);
              } catch (error) {
                showToast("Failed to start Spotify authorization.", "error");
              }
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium"
          >
            Connect to Spotify
          </button>
        </motion.div>
      )}

      {/* Mood Input - Only show when connected */}
      {sessionId && (
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-600 font-medium">Connected to Spotify</span>
          </div>
          <textarea
            className="border rounded-xl p-4 w-full h-32 resize-none"
            placeholder="Describe your vibe..."
            value={mood}
            onChange={(e) => setMood(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Number of songs:</label>
            <select
              value={songCount}
              onChange={(e) => setSongCount(Number(e.target.value))}
              className="border rounded-lg px-3 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Genres:</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowGenres(!showGenres)}
                className="border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 flex items-center gap-2 w-full justify-between"
              >
                <span>{selectedGenres.length === 0 ? 'All genres' : `${selectedGenres.length} selected`}</span>
                <span className={`transform transition-transform ${showGenres ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {showGenres && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-10 w-full max-h-48 overflow-y-auto">
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGenres([])}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  {genres.map(genre => (
                    <label key={genre} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(genre)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGenres([...selectedGenres, genre]);
                          } else {
                            setSelectedGenres(selectedGenres.filter(g => g !== genre));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{genre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={generatePlaylist}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Generate Playlist"}
          </button>
        </div>
      )}



      {/* Playlist Display */}
      {playlist && (
        <motion.div
          className="mt-6 w-full max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-2xl shadow-lg p-4">
            {playlist.error ? (
              <p className="text-red-500">{playlist.error}</p>
            ) : (
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-semibold text-center">{playlist.playlistName}</h2>
                <ul className="space-y-2">
                  {playlist.tracks?.map((track, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 bg-white/70 p-2 rounded-xl shadow-sm hover:bg-white transition"
                    >
                      <Music className="w-4 h-4 text-purple-600" />
                      <a
                        href={track.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {track.title} — {track.artist}
                      </a>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={importToSpotify}
                  disabled={spotifyLoading}
                  className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {spotifyLoading ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    "Import to Spotify"
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-lg flex items-center gap-3 max-w-sm ${
              toast.type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"
            }`}
          >
            {toast.type === "error" ? (
              <X className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-auto hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
