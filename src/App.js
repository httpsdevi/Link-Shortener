import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Copy, QrCode, BarChart3, Github, ExternalLink, Eye, Clock, TrendingUp, Zap, Globe, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const App = () => {
  // State Management
  const [url, setUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [shortenedUrls, setShortenedUrls] = useState([]);
  const [qrCode, setQrCode] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState('shorten');
  const [githubUser, setGithubUser] = useState('');
  const [githubData, setGithubData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [urlError, setUrlError] = useState('');

  // Analytics data
  const [analytics] = useState({
    totalClicks: 1247,
    totalLinks: 89,
    clicksToday: 156,
    topCountries: [
      { name: 'United States', value: 35, color: '#3B82F6' },
      { name: 'United Kingdom', value: 22, color: '#8B5CF6' },
      { name: 'Germany', value: 18, color: '#10B981' },
      { name: 'Canada', value: 15, color: '#F59E0B' },
      { name: 'Others', value: 10, color: '#EF4444' }
    ],
    clicksOverTime: [
      { date: 'Mon', clicks: 89, unique: 67 },
      { date: 'Tue', clicks: 156, unique: 134 },
      { date: 'Wed', clicks: 203, unique: 178 },
      { date: 'Thu', clicks: 167, unique: 145 },
      { date: 'Fri', clicks: 234, unique: 201 },
      { date: 'Sat', clicks: 298, unique: 256 },
      { date: 'Sun', clicks: 189, unique: 167 }
    ]
  });

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Custom tab switching
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('shorten');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('analytics');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        setActiveTab('github');
      }
    };

    const handleCustomEvent = (e) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('switchTab', handleCustomEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('switchTab', handleCustomEvent);
    };
  }, []);

  // URL validation
  const validateUrl = useCallback((inputUrl) => {
    try {
      const url = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, []);

  // Show notification
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  // Generate short URL
  const generateShortUrl = useCallback(() => {
    if (!url) {
      setUrlError('Please enter a URL');
      return;
    }

    if (!validateUrl(url)) {
      setUrlError('Please enter a valid URL');
      return;
    }

    setUrlError('');
    
    const shortId = customAlias || Math.random().toString(36).substring(2, 8);
    const shortUrl = `https://lnk.snap/${shortId}`;
    
    const newUrl = {
      id: Date.now(),
      original: url.startsWith('http') ? url : `https://${url}`,
      shortened: shortUrl,
      alias: shortId,
      clicks: Math.floor(Math.random() * 100),
      created: new Date().toLocaleDateString(),
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}`
    };

    setShortenedUrls(prev => [newUrl, ...prev]);
    setUrl('');
    setCustomAlias('');
    
    showNotification('URL shortened successfully!');
    
    // Track analytics
    if (window.linkSnapAnalytics) {
      window.linkSnapAnalytics.trackLinkCreated(newUrl.original, shortUrl);
    }
  }, [url, customAlias, validateUrl, showNotification]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification('Copied to clipboard!');
    }
  }, [showNotification]);

  // Generate QR Code
  const generateQRCode = useCallback((url) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    setQrCode(qrUrl);
    setShowQR(true);
    
    if (window.linkSnapAnalytics) {
      window.linkSnapAnalytics.track('qr_code_generated', { url });
    }
  }, []);

  // Fetch GitHub data
  const fetchGitHubData = useCallback(async () => {
    if (!githubUser.trim()) {
      showNotification('Please enter a GitHub username', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`https://api.github.com/users/${githubUser.trim()}`);
      
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'User not found' : 'Failed to fetch user data');
      }
      
      const data = await response.json();
      setGithubData(data);
      showNotification('GitHub profile loaded successfully!');
      
      if (window.linkSnapAnalytics) {
        window.linkSnapAnalytics.track('github_profile_fetched', { username: githubUser });
