import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

// AuthContext
const AuthContext = React.createContext();

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserInfo();
    }
  }, [token]);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (email, username, password, role) => {
    try {
      await axios.post(`${API}/auth/register`, { email, username, password, role });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentPage('home');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar user={user} currentPage={currentPage} setCurrentPage={setCurrentPage} logout={logout} />
        <main className="container mx-auto px-4 py-8">
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'login' && <LoginPage setCurrentPage={setCurrentPage} />}
          {currentPage === 'register' && <RegisterPage setCurrentPage={setCurrentPage} />}
          {currentPage === 'dashboard' && user && <Dashboard user={user} />}
          {currentPage === 'browse' && <BrowsePage />}
          {currentPage === 'search' && <SearchPage />}
        </main>
      </div>
    </AuthContext.Provider>
  );
}

// Navbar Component
const Navbar = ({ user, currentPage, setCurrentPage, logout }) => {
  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <h1 
              className="text-2xl font-bold text-purple-400 cursor-pointer"
              onClick={() => setCurrentPage('home')}
            >
              🎧 PodcastHub
            </h1>
            <button
              onClick={() => setCurrentPage('browse')}
              className="text-gray-300 hover:text-white px-3 py-2 rounded"
            >
              Browse
            </button>
            <button
              onClick={() => setCurrentPage('search')}
              className="text-gray-300 hover:text-white px-3 py-2 rounded"
            >
              Search
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-300">Welcome, {user.username}</span>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
                >
                  Dashboard
                </button>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCurrentPage('login')}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded"
                >
                  Login
                </button>
                <button
                  onClick={() => setCurrentPage('register')}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Home Page
const HomePage = () => {
  return (
    <div className="text-center">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-6 text-purple-400">
          Welcome to PodcastHub
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Discover amazing podcasts, listen to your favorite episodes, and share your own stories with the world.
        </p>
        
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-2xl font-semibold mb-4 text-purple-300">🎙️ For Podcasters</h3>
            <p className="text-gray-400 mb-4">
              Share your voice with the world. Upload episodes, manage your shows, and build your audience.
            </p>
            <div className="text-sm text-gray-500">
              • Easy episode uploads • Podcast management • Analytics
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-2xl font-semibold mb-4 text-purple-300">🎧 For Listeners</h3>
            <p className="text-gray-400 mb-4">
              Discover new content, stream episodes, and download for offline listening.
            </p>
            <div className="text-sm text-gray-500">
              • Unlimited streaming • Download episodes • Search & discover
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Login Page
const LoginPage = ({ setCurrentPage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    if (result.success) {
      setCurrentPage('dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg">
      <h2 className="text-3xl font-bold mb-6 text-center text-purple-400">Login</h2>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <p className="text-center text-gray-400 mt-4">
        Don't have an account?{' '}
        <button
          onClick={() => setCurrentPage('register')}
          className="text-purple-400 hover:text-purple-300"
        >
          Sign up
        </button>
      </p>
    </div>
  );
};

// Register Page
const RegisterPage = ({ setCurrentPage }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'listener'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(formData.email, formData.username, formData.password, formData.role);
    if (result.success) {
      setCurrentPage('login');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg">
      <h2 className="text-3xl font-bold mb-6 text-center text-purple-400">Sign Up</h2>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">I want to</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
          >
            <option value="listener">Listen to podcasts</option>
            <option value="podcaster">Create and upload podcasts</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      
      <p className="text-center text-gray-400 mt-4">
        Already have an account?{' '}
        <button
          onClick={() => setCurrentPage('login')}
          className="text-purple-400 hover:text-purple-300"
        >
          Login
        </button>
      </p>
    </div>
  );
};

// Dashboard
const Dashboard = ({ user }) => {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role === 'podcaster') {
      fetchMyPodcasts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMyPodcasts = async () => {
    try {
      const response = await axios.get(`${API}/podcasts/my`);
      setPodcasts(response.data);
    } catch (error) {
      console.error('Failed to fetch podcasts:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-purple-400">
        {user.role === 'podcaster' ? 'Podcaster Dashboard' : 'Listener Dashboard'}
      </h2>
      
      {user.role === 'podcaster' ? (
        <PodcasterDashboard podcasts={podcasts} fetchMyPodcasts={fetchMyPodcasts} />
      ) : (
        <ListenerDashboard />
      )}
    </div>
  );
};

// Podcaster Dashboard
const PodcasterDashboard = ({ podcasts, fetchMyPodcasts }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEpisodeForm, setShowEpisodeForm] = useState(null);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-semibold">My Podcasts</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
        >
          Create New Podcast
        </button>
      </div>

      {showCreateForm && (
        <CreatePodcastForm 
          onClose={() => setShowCreateForm(false)}
          onSuccess={fetchMyPodcasts}
        />
      )}

      {showEpisodeForm && (
        <CreateEpisodeForm
          podcastId={showEpisodeForm}
          onClose={() => setShowEpisodeForm(null)}
          onSuccess={() => {
            setShowEpisodeForm(null);
            fetchMyPodcasts();
          }}
        />
      )}

      <div className="grid gap-6">
        {podcasts.map(podcast => (
          <PodcastCard 
            key={podcast.id} 
            podcast={podcast} 
            onAddEpisode={() => setShowEpisodeForm(podcast.id)}
            isOwner={true}
          />
        ))}
      </div>

      {podcasts.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          <p>You haven't created any podcasts yet.</p>
          <p>Click "Create New Podcast" to get started!</p>
        </div>
      )}
    </div>
  );
};

// Listener Dashboard
const ListenerDashboard = () => {
  return (
    <div className="text-center text-gray-400 py-12">
      <h3 className="text-2xl mb-4">Welcome to your listener dashboard!</h3>
      <p className="mb-6">Here you can manage your favorite podcasts and listening history.</p>
      <p className="text-sm text-gray-500">
        Feature coming soon: Favorites, playlists, and listening statistics.
      </p>
    </div>
  );
};

// Browse Page
const BrowsePage = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const [podcastsRes, episodesRes] = await Promise.all([
        axios.get(`${API}/podcasts`),
        axios.get(`${API}/episodes`)
      ]);
      setPodcasts(podcastsRes.data);
      setEpisodes(episodesRes.data);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-purple-400">Browse Podcasts</h2>
      
      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-4">All Podcasts</h3>
        <div className="grid gap-6">
          {podcasts.map(podcast => (
            <PodcastCard key={podcast.id} podcast={podcast} isOwner={false} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-semibold mb-4">Latest Episodes</h3>
        <div className="grid gap-4">
          {episodes.slice(0, 10).map(episode => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Search Page
const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({ podcasts: [], episodes: [] });
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API}/search?q=${encodeURIComponent(searchQuery)}`);
      setResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-purple-400">Search</h2>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for podcasts or episodes..."
            className="flex-1 p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded font-semibold disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {(results.podcasts.length > 0 || results.episodes.length > 0) && (
        <div>
          {results.podcasts.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-4">Podcasts</h3>
              <div className="grid gap-6">
                {results.podcasts.map(podcast => (
                  <PodcastCard key={podcast.id} podcast={podcast} isOwner={false} />
                ))}
              </div>
            </div>
          )}

          {results.episodes.length > 0 && (
            <div>
              <h3 className="text-2xl font-semibold mb-4">Episodes</h3>
              <div className="grid gap-4">
                {results.episodes.map(episode => (
                  <EpisodeCard key={episode.id} episode={episode} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Create Podcast Form
const CreatePodcastForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technology'
  });
  const [loading, setLoading] = useState(false);

  const categories = ['Technology', 'Comedy', 'News', 'Education', 'Business', 'Health', 'Sports', 'Entertainment'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/podcasts`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create podcast:', error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full m-4">
        <h3 className="text-2xl font-bold mb-4 text-purple-400">Create New Podcast</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
              rows="3"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 rounded font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create Episode Form
const CreateEpisodeForm = ({ podcastId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [audioFile, setAudioFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) return;

    setLoading(true);
    
    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('audio_file', audioFile);

    try {
      await axios.post(`${API}/podcasts/${podcastId}/episodes`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create episode:', error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full m-4">
        <h3 className="text-2xl font-bold mb-4 text-purple-400">Add New Episode</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Episode Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
              rows="3"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Audio File (MP3, WAV, OGG)</label>
            <input
              type="file"
              accept=".mp3,.wav,.ogg"
              onChange={(e) => setAudioFile(e.target.files[0])}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500"
              required
            />
          </div>
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !audioFile}
              className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 rounded font-semibold disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload Episode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Podcast Card Component
const PodcastCard = ({ podcast, onAddEpisode, isOwner }) => {
  const [episodes, setEpisodes] = useState([]);
  const [showEpisodes, setShowEpisodes] = useState(false);

  const fetchEpisodes = async () => {
    try {
      const response = await axios.get(`${API}/podcasts/${podcast.id}/episodes`);
      setEpisodes(response.data);
      setShowEpisodes(true);
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="text-xl font-semibold text-purple-300 mb-2">{podcast.title}</h4>
          <p className="text-gray-400 mb-3">{podcast.description}</p>
          <span className="inline-block bg-purple-900 text-purple-200 px-3 py-1 rounded text-sm">
            {podcast.category}
          </span>
        </div>
        
        <div className="flex gap-2 ml-4">
          {isOwner && onAddEpisode && (
            <button
              onClick={onAddEpisode}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
            >
              Add Episode
            </button>
          )}
          <button
            onClick={fetchEpisodes}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm"
          >
            View Episodes
          </button>
        </div>
      </div>
      
      {showEpisodes && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h5 className="text-lg font-semibold mb-3">Episodes ({episodes.length})</h5>
          {episodes.length > 0 ? (
            <div className="space-y-3">
              {episodes.map(episode => (
                <EpisodeCard key={episode.id} episode={episode} compact />
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No episodes yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

// Episode Card Component
const EpisodeCard = ({ episode, compact }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `${BACKEND_URL}/api/uploads/${episode.audio_file}`;
    link.download = `${episode.title}.${episode.audio_file.split('.').pop()}`;
    link.click();
  };

  return (
    <div className={`bg-gray-${compact ? '700' : '800'} p-${compact ? '4' : '6'} rounded-lg`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className={`text-${compact ? 'lg' : 'xl'} font-semibold text-purple-300 mb-2`}>
            {episode.title}
          </h4>
          <p className="text-gray-400 mb-3">{episode.description}</p>
          <div className="text-sm text-gray-500">
            {new Date(episode.created_at).toLocaleDateString()}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={togglePlayPause}
            className="bg-purple-600 hover:bg-purple-700 p-2 rounded-full"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button
            onClick={handleDownload}
            className="bg-green-600 hover:bg-green-700 p-2 rounded-full"
          >
            ⬇️
          </button>
        </div>
      </div>
      
      <audio
        ref={audioRef}
        src={`${BACKEND_URL}/api/uploads/${episode.audio_file}`}
        onEnded={() => setIsPlaying(false)}
        controls
        className="w-full mt-4"
      />
    </div>
  );
};

export default App;