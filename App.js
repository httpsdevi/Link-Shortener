import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// Ensure Inter font is loaded for consistent styling
const InterFontLoader = () => (
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
);

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-white border border-gray-300 rounded-lg shadow-lg text-sm">
        <p className="font-bold text-blue-700 mb-1">{`Link: ${label}`}</p>
        <p className="text-gray-700">{`Clicks: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

// Main App component
const App = () => {
  // State variables for managing the application's data and UI
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortenedLink, setShortenedLink] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [message, setMessage] = useState(null);
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('shorten');

  // State for GitHub Explorer
  const [githubUsername, setGithubUsername] = useState('');
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState(null);

  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState(null);

  // Mock database for storing links and their analytics in memory
  const [mockDatabase, setMockDatabase] = useState(() => {
    const savedLinks = localStorage.getItem('shortenedLinksMockDb');
    return savedLinks ? JSON.parse(savedLinks) : {};
  });

  // Effect to save mockDatabase to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('shortenedLinksMockDb', JSON.stringify(mockDatabase));
    const updatedLinks = Object.keys(mockDatabase).map(key => ({
      shortCode: key,
      ...mockDatabase[key],
    }));
    setLinks(updatedLinks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }, [mockDatabase]);

  // Simulate periodic clicks for demo purposes
  useEffect(() => {
    const interval = setInterval(() => {
      setMockDatabase(prevDb => {
        const newDb = { ...prevDb };
        let changed = false;
        for (const shortCode in newDb) {
          if (Math.random() > 0.7) {
            newDb[shortCode].clicks = (newDb[shortCode].clicks || 0) + 1;
            changed = true;
          }
        }
        return changed ? newDb : prevDb;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Function to generate a random short code
  const generateShortCode = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  // Function to handle URL shortening
  const handleShortenUrl = async () => {
    if (!originalUrl) {
      setMessage({ type: 'error', text: 'Please enter a URL.' });
      return;
    }
    if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
      setMessage({ type: 'error', text: 'Please enter a valid URL starting with http:// or https://' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setShortenedLink('');
    setQrCodeUrl('');

    let shortCode = customKey || generateShortCode();

    if (customKey && mockDatabase[shortCode]) {
      setMessage({ type: 'error', text: 'Custom key already in use. Please choose another or leave it blank for a random one.' });
      setIsLoading(false);
      return;
    }

    setTimeout(async () => {
      const fullShortenedLink = `https://short.url/${shortCode}`;

      setMockDatabase(prevDb => ({
        ...prevDb,
        [shortCode]: {
          id: Date.now(),
          originalUrl: originalUrl,
          shortenedLink: fullShortenedLink,
          clicks: 0,
          createdAt: new Date().toLocaleString(),
        },
      }));

      setShortenedLink(fullShortenedLink);

      try {
        const qrApiUrl = `https://quickchart.io/qr?text=${encodeURIComponent(fullShortenedLink)}&size=200&format=png`;
        setQrCodeUrl(qrApiUrl);
        setMessage({ type: 'success', text: 'URL shortened successfully!' });
      } catch (error) {
        console.error('Error generating QR code:', error);
        setMessage({ type: 'warning', text: 'URL shortened, but failed to generate QR code.' });
        setQrCodeUrl('');
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

  // Function to simulate a click
  const simulateClick = (shortCode) => {
    setMockDatabase(prevDb => {
      const newDb = { ...prevDb };
      if (newDb[shortCode]) {
        newDb[shortCode].clicks = (newDb[shortCode].clicks || 0) + 1;
      }
      return newDb;
    });
  };

  // Function to copy to clipboard
  const copyToClipboard = (textToCopy) => {
    const el = document.createElement('textarea');
    el.value = textToCopy;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 2000);
    setMessage({ type: 'success', text: 'Link copied to clipboard!' });
  };

  // Function to handle editing a link
  const handleEditLink = (linkId) => {
    const linkToEdit = links.find(link => link.id === linkId);
    if (linkToEdit) {
      const newAlias = prompt(`Enter new custom alias for ${linkToEdit.shortCode}:`, linkToEdit.shortCode);
      if (newAlias !== null && newAlias.trim() !== '') {
        const sanitizedAlias = newAlias.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (sanitizedAlias === linkToEdit.shortCode) {
          setMessage({ type: 'info', text: 'Alias not changed.' });
          return;
        }
        if (mockDatabase[sanitizedAlias]) {
          setMessage({ type: 'error', text: 'This custom alias is already in use.' });
          return;
        }

        setMockDatabase(prevDb => {
          const newDb = { ...prevDb };
          delete newDb[linkToEdit.shortCode];
          newDb[sanitizedAlias] = {
            ...linkToEdit,
            shortCode: sanitizedAlias,
            shortenedLink: `https://short.url/${sanitizedAlias}`,
          };
          return newDb;
        });
        setMessage({ type: 'success', text: 'Link alias updated successfully!' });
      }
    }
  };

  // Function to handle deleting a link (with confirmation modal)
  const handleDeleteLink = (linkId) => {
    const link = links.find(l => l.id === linkId);
    if (link) {
      setLinkToDelete(link);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = () => {
    if (linkToDelete) {
      setMockDatabase(prevDb => {
        const newDb = { ...prevDb };
        delete newDb[linkToDelete.shortCode];
        return newDb;
      });
      setMessage({ type: 'success', text: 'Link deleted successfully!' });
      setShowDeleteModal(false);
      setLinkToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setLinkToDelete(null);
  };

  // Function to fetch GitHub repositories
  const fetchGitHubRepos = async () => {
    if (!githubUsername) {
      setGithubError('Please enter a GitHub username.');
      return;
    }

    setGithubLoading(true);
    setGithubError(null);
    setGithubRepos([]);

    try {
      const response = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=stars&per_page=10`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('GitHub user not found.');
        }
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const repos = await response.json();
      if (repos.length === 0) {
        setGithubError('No public repositories found for this user.');
      } else {
        setGithubRepos(repos);
      }
    } catch (error) {
      console.error('GitHub API error:', error);
      setGithubError(error.message);
    } finally {
      setGithubLoading(false);
    }
  };

  // Function to pre-fill shorten form with GitHub repo URL
  const shortenGitHubUrl = (repoUrl, repoName) => {
    setOriginalUrl(repoUrl);
    setCustomKey(repoName.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setActiveTab('shorten');
    setMessage(null);
    setShortenedLink('');
    setQrCodeUrl('');
  };

  // Calculate analytics stats
  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const avgClicks = totalLinks > 0 ? (totalClicks / totalLinks).toFixed(1) : 0;
  const topPerformer = totalLinks > 0 ?
    links.reduce((prev, current) => (prev.clicks > current.clicks) ? prev : current).shortCode : 'N/A';

  // Data for the Bar Chart
  const chartData = links.map(link => ({
    name: link.shortCode,
    clicks: link.clicks,
  }));

  // Function to clear input field
  const clearInput = (setter) => {
    setter('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-800 flex items-center justify-center p-4 font-inter text-gray-800">
      <InterFontLoader /> {/* Load Inter font */}
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl transform transition-all duration-500 ease-in-out hover:scale-[1.01] hover:shadow-3xl">
        <h1 className="text-5xl font-extrabold text-center text-gray-900 mb-10 tracking-tight leading-tight">
          <span className="text-blue-600">Shorten</span> Your <span className="text-purple-600">Links</span>
        </h1>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 sm:gap-4 mb-8 border-b-2 border-gray-200 overflow-x-auto pb-2">
          <button
            className={`flex-shrink-0 py-3 px-4 sm:px-6 text-lg font-semibold rounded-t-lg transition-all duration-300 ${activeTab === 'shorten' ? 'bg-blue-100 text-blue-700 border-b-4 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('shorten')}
          >
            Shorten URL
          </button>
          <button
            className={`flex-shrink-0 py-3 px-4 sm:px-6 text-lg font-semibold rounded-t-lg transition-all duration-300 ${activeTab === 'analytics' ? 'bg-blue-100 text-blue-700 border-b-4 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button
            className={`flex-shrink-0 py-3 px-4 sm:px-6 text-lg font-semibold rounded-t-lg transition-all duration-300 ${activeTab === 'manage' ? 'bg-blue-100 text-blue-700 border-b-4 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('manage')}
          >
            My Links
          </button>
          <button
            className={`flex-shrink-0 py-3 px-4 sm:px-6 text-lg font-semibold rounded-t-lg transition-all duration-300 ${activeTab === 'github' ? 'bg-blue-100 text-blue-700 border-b-4 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('github')}
          >
            GitHub Explorer
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-6 p-4 rounded-xl text-center text-lg font-semibold transition-all duration-300 ease-in-out transform ${
            message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300 scale-100' :
            message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300 scale-100' :
            'bg-yellow-100 text-yellow-700 border border-yellow-300 scale-100'
          } `}>
            {message.text}
          </div>
        )}

        {/* Shorten URL Tab Content */}
        {activeTab === 'shorten' && (
          <div className="animate-fade-in">
            <div className="mb-8">
              <label htmlFor="originalUrl" className="block text-gray-700 text-lg font-semibold mb-2">
                Original URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  id="originalUrl"
                  className="w-full p-4 pr-10 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-400 focus:border-blue-600 transition-all duration-300 ease-in-out text-lg placeholder-gray-400"
                  placeholder="e.g., https://www.example.com/very/long/url/that/needs/shortening"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                />
                {originalUrl && (
                  <button
                    onClick={() => clearInput(setOriginalUrl)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="mb-8">
              <label htmlFor="customKey" className="block text-gray-700 text-lg font-semibold mb-2">
                Custom Key (Optional)
              </label>
              <div className="flex rounded-xl border border-gray-300 overflow-hidden focus-within:ring-4 focus-within:ring-blue-400 focus-within:border-blue-600 transition-all duration-300 ease-in-out">
                <span className="bg-gray-100 p-4 text-gray-500 text-lg font-mono">https://short.url/</span>
                <div className="relative flex-grow">
                  <input
                    type="text"
                    id="customKey"
                    className="flex-grow w-full p-4 pr-10 outline-none text-lg placeholder-gray-400"
                    placeholder="e.g., my-awesome-link"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  />
                  {customKey && (
                    <button
                      onClick={() => clearInput(setCustomKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleShortenUrl}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 ease-in-out text-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="animate-spin h-7 w-7 mr-3 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0l3 3a2 2 0 11-2.828 2.828l-3-3a2 2 0 010-2.828 1 1 0 00-1.414-1.414 4 4 0 000 5.656l3 3a4 4 0 005.656-5.656l-1.5-1.5a1 1 0 00-1.414 1.414l1.5 1.5zm-.707-1.707a1 1 0 00-1.414 0c-.39.39-.39 1.023 0 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" clipRule="evenodd" />
                  </svg>
                  Shorten URL
                </>
              )}
            </button>

            {/* Shortened Link & QR Code Display */}
            {shortenedLink && (
              <div className="mt-10 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200 shadow-lg flex flex-col items-center animate-scale-in">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-5">Your Shortened Link:</h2>
                <a
                  href={shortenedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 text-3xl font-bold break-all hover:underline mb-5 transition-colors duration-200 ease-in-out block text-center"
                  onClick={() => simulateClick(shortenedLink.split('/').pop())}
                >
                  {shortenedLink}
                </a>
                <div className="relative">
                  <button
                    onClick={() => copyToClipboard(shortenedLink)}
                    className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 ease-in-out text-lg flex items-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H6zM5 9a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" />
                    </svg>
                    Copy Link
                  </button>
                  {showCopiedMessage && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 animate-fade-in-out">
                      Copied!
                    </span>
                  )}
                </div>

                {qrCodeUrl && (
                  <div className="mt-8 text-center animate-fade-in">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Scan QR Code:</h3>
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-56 h-56 mx-auto border-4 border-white rounded-xl shadow-xl transition-transform duration-300 hover:scale-105"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/224x224/cccccc/000000?text=QR+Error'; }}
                    />
                    <p className="text-base text-gray-600 mt-3">Quickly share your link!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab Content */}
        {activeTab === 'analytics' && (
          <div className="mt-6 p-6 bg-gray-50 rounded-2xl shadow-xl border border-gray-200 animate-fade-in">
            <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-8">📊 Link Analytics Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-5 rounded-xl shadow-md text-center border border-gray-100 animate-fade-in-up">
                <div className="text-4xl font-bold text-blue-600 mb-2">{totalLinks}</div>
                <div className="text-lg text-gray-600">Total Links</div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-md text-center border border-gray-100 animate-fade-in-up delay-100">
                <div className="text-4xl font-bold text-purple-600 mb-2">{totalClicks}</div>
                <div className="text-lg text-gray-600">Total Clicks</div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-md text-center border border-gray-100 animate-fade-in-up delay-200">
                <div className="text-4xl font-bold text-green-600 mb-2">{avgClicks}</div>
                <div className="text-lg text-gray-600">Avg Clicks/Link</div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-md text-center border border-gray-100 animate-fade-in-up delay-300">
                <div className="text-xl font-bold text-indigo-600 mb-2 break-all">{topPerformer}</div>
                <div className="text-lg text-gray-600">Top Performer</div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 text-center mb-4">Clicks per Short Link</h3>
            {links.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="clicks" fill="#8884d8" animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 mt-6 text-lg">No link data available for charts. Shorten some URLs!</p>
            )}
          </div>
        )}

        {/* My Links Tab Content */}
        {activeTab === 'manage' && (
          <div className="mt-6 p-6 bg-gray-50 rounded-2xl shadow-xl border border-gray-200 animate-fade-in">
            <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-8">🔗 My Shortened Links</h2>
            {links.length === 0 ? (
              <p className="text-center text-gray-500 mt-6 text-lg p-10">No links created yet. Go to the "Shorten URL" tab to create your first link!</p>
            ) : (
              <div className="space-y-4">
                {links.map((link) => (
                  <div key={link.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center transform transition-transform duration-200 hover:scale-[1.005]">
                    <div className="flex-1 mb-4 sm:mb-0">
                      <div className="font-bold text-lg text-blue-700 break-all mb-1">
                        <a href={link.shortenedLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {link.shortenedLink}
                        </a>
                      </div>
                      <div className="text-gray-600 text-sm break-all mb-1">{link.originalUrl}</div>
                      <div className="text-gray-500 text-xs">
                        Created: {link.createdAt} | Clicks: <span className="font-semibold text-gray-800">{link.clicks}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => copyToClipboard(link.shortenedLink)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors duration-200 shadow-sm"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleEditLink(link.id)}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 transition-colors duration-200 shadow-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors duration-200 shadow-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GitHub Explorer Tab Content */}
        {activeTab === 'github' && (
          <div className="mt-6 p-6 bg-gray-50 rounded-2xl shadow-xl border border-gray-200 animate-fade-in">
            <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-8">🐙 GitHub Repository Explorer</h2>
            <div className="mb-6">
              <label htmlFor="githubUsername" className="block text-gray-700 text-lg font-semibold mb-2">
                GitHub Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="githubUsername"
                  className="w-full p-4 pr-10 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-400 focus:border-blue-600 transition-all duration-300 ease-in-out text-lg placeholder-gray-400"
                  placeholder="e.g., octocat"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                />
                {githubUsername && (
                  <button
                    onClick={() => clearInput(setGithubUsername)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={fetchGitHubRepos}
              className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-4 px-6 rounded-xl hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-300 ease-in-out text-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={githubLoading}
            >
              {githubLoading ? (
                <svg className="animate-spin h-7 w-7 mr-3 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM5 9a1 1 0 000 2h1a1 1 0 100-2H5zm4 0a1 1 0 000 2h1a1 1 0 100-2H9zm3 0a1 1 0 000 2h1a1 1 0 100-2h-1z" clipRule="evenodd" />
                  </svg>
                  Explore Repositories
                </>
              )}
            </button>

            {githubError && (
              <div className="mt-6 p-4 rounded-xl text-center text-lg font-semibold bg-red-100 text-red-700 border border-red-300 animate-fade-in">
                Error: {githubError}
              </div>
            )}

            {githubLoading && (
              <div className="mt-8 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white p-5 rounded-xl shadow-md border border-gray-100 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}

            {githubRepos.length > 0 && (
              <div className="mt-8 space-y-4 animate-fade-in">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Top Repositories for @{githubUsername}</h3>
                {githubRepos.map(repo => (
                  <div key={repo.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="font-bold text-xl text-blue-700 hover:underline">
                        {repo.name}
                      </a>
                      <div className="bg-yellow-400 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.92 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                        </svg>
                        {repo.stargazers_count}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-3">{repo.description || 'No description available'}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-gray-500 text-xs mb-3">
                      <span>Language: <span className="font-medium text-gray-700">{repo.language || 'Unknown'}</span></span>
                      <span>Forks: <span className="font-medium text-gray-700">{repo.forks_count}</span></span>
                      <span>Watchers: <span className="font-medium text-gray-700">{repo.watchers_count}</span></span>
                      <span>Updated: <span className="font-medium text-gray-700">{new Date(repo.updated_at).toLocaleDateString()}</span></span>
                    </div>
                    <button
                      onClick={() => shortenGitHubUrl(repo.html_url, repo.name)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors duration-200 shadow-md"
                    >
                      Shorten This Repo URL
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-gray-600 text-sm mt-10">
          Crafted with ❤️ using React and Tailwind CSS. QR code generation by QuickChart.io.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full text-center transform scale-100 animate-zoom-in">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6">Are you sure you want to delete the link: <br /><span className="font-semibold break-all">{linkToDelete?.shortenedLink}</span>?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmDelete}
                className="bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-md"
              >
                Delete
              </button>
              <button
                onClick={cancelDelete}
                className="bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-400 transition-colors duration-200 shadow-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
