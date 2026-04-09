/* ============================================================================
   Psychotherapy and Applied Psychology Podcast - Shared JavaScript
   Uses Buzzsprout API for reliable episode data
   ============================================================================ */

// Shared footer
function renderFooter() {
  const footer = document.querySelector('footer');
  if (!footer) return;
  const year = new Date().getFullYear();
  footer.innerHTML = `
    <div class="container">
      <div class="footer-section">
        <h4>Listen</h4>
        <div class="footer-section">
          <a href="https://podcasts.apple.com/us/podcast/psychotherapy-and-applied-psychology/id1734318570" target="_blank">Apple Podcasts</a>
          <a href="https://open.spotify.com/show/4rG5TrfM0cu3Z4iOMRBCp6" target="_blank">Spotify</a>
          <a href="http://www.youtube.com/@PsychotherapyAppliedPsychology" target="_blank">YouTube</a>
          <a href="follow.html">See All</a>
        </div>
      </div>
      <div class="footer-section">
        <h4>Connect</h4>
        <div class="footer-section">
          <a href="contact.html">Get in Touch</a>
          <a href="https://www.linkedin.com/in/dan-cox-705595303/" target="_blank">LinkedIn</a>
          <a href="https://bsky.app/profile/danielwcox.bsky.social" target="_blank">Bluesky</a>
        </div>
      </div>
      <div class="footer-section">
        <h4>Dr. Daniel W Cox</h4>
        <p>Professor at the University of British Columbia</p>
        <p style="margin-top: 0;">Conversations about therapy, mental health, and the science behind how people change.</p>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${year} Psychotherapy and Applied Psychology. All rights reserved.</p>
      </div>
    </div>
  `;
}

// Hamburger menu toggle
document.addEventListener('DOMContentLoaded', function () {
  renderFooter();

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('header nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.querySelector('.hamburger-icon').textContent = isOpen ? '✕' : '☰';
  });

  // Close menu when any nav link is tapped
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.querySelector('.hamburger-icon').textContent = '☰';
    });
  });
});

// Configuration
const PODCAST_CONFIG = {
  apiUrl: 'https://www.buzzsprout.com/api/2324798/episodes.json?api_token=5c913cfdf411f020c10e9bd354f42836',
  podcast: {
    title: 'Psychotherapy and Applied Psychology',
    author: 'Dr. Daniel W Cox',
    artwork: 'https://storage.buzzsprout.com/npdsrx17zjumqrkq144cob8llvc2?.jpg',
    description: 'Psychotherapy and Applied Psychology features in-depth conversations with leading clinicians and scientists. Hosted by Dr. Dan Cox (UBC), the show covers psychotherapy practice and research, mental health, clinical training, and the human questions that sit underneath all of it.',
    links: {
      youtube: 'http://www.youtube.com/@PsychotherapyAppliedPsychology',
      speakpipe: 'https://www.speakpipe.com/PsychotherapyAppliedPsychology',
      linkedin: 'https://www.linkedin.com/in/dan-cox-705595303/',
      email: 'TheAppliedPsychologyPodcast@gmail.com',
      bluesky: 'https://bsky.app/profile/danielwcox.bsky.social',
      buzzsprout: 'https://psychotherapyandappliedpsychology.buzzsprout.com',
      apple: 'https://podcasts.apple.com/us/podcast/psychotherapy-and-applied-psychology/id1734318570',
      spotify: 'https://open.spotify.com/show/4rG5TrfM0cu3Z4iOMRBCp6'
    }
  }
};

let cachedEpisodes = null;

const LS_KEY = 'pap_episodes';
const LS_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const { episodes, savedAt } = JSON.parse(raw);
    if (!episodes || !savedAt) return null;
    return { episodes, savedAt };
  } catch (_) { return null; }
}

function saveToStorage(episodes) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ episodes, savedAt: Date.now() }));
  } catch (_) {}
}

async function fetchFromApi() {
  const response = await fetch(PODCAST_CONFIG.apiUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const episodes = data
    .filter(ep => !ep.private && !ep.inactive_at)
    .map((ep) => ({
      id: ep.id,
      title: ep.title || '',
      description: cleanHtml(ep.description || ''),
      descriptionHtml: ep.description || '',
      pubDate: new Date(ep.published_at),
      pubDateFormatted: formatDate(new Date(ep.published_at)),
      audioUrl: ep.audio_url || '',
      artworkUrl: ep.artwork_url || PODCAST_CONFIG.podcast.artwork,
      duration: ep.duration || 0,
      durationFormatted: formatDuration(ep.duration || 0),
      seasonNumber: ep.season_number,
      episodeNumber: ep.episode_number,
      totalPlays: ep.total_plays || 0,
      tags: ep.tags || '',
      guid: ep.guid || '',
      link: `https://www.buzzsprout.com/2324798/episodes/${ep.id}`
    }));
  saveToStorage(episodes);
  cachedEpisodes = episodes;
  return episodes;
}

/**
 * Fetch episodes — returns localStorage cache instantly if available,
 * always refreshes in the background when data is stale.
 */
async function fetchEpisodes(forceRefresh = false) {
  try {
    // In-memory cache (same page session)
    if (cachedEpisodes && !forceRefresh) return cachedEpisodes;

    const stored = loadFromStorage();
    const isStale = !stored || (Date.now() - stored.savedAt) > LS_MAX_AGE_MS;

    if (stored) {
      cachedEpisodes = stored.episodes;
      // Refresh stale data silently in the background
      if (isStale) fetchFromApi().catch(() => {});
      return stored.episodes;
    }

    // No cache at all — must wait for the API
    return await fetchFromApi();
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return cachedEpisodes || [];
  }
}

/**
 * Clean HTML tags from text content
 */
function cleanHtml(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const scripts = temp.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  let text = temp.textContent || '';
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Format date to readable format
 */
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return '';
  }
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format duration in seconds to mm:ss or h:mm:ss
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Get the latest N episodes
 */
async function getLatestEpisodes(count = 3) {
  const episodes = await fetchEpisodes();
  return episodes.slice(0, count);
}

/**
 * Search episodes by title and description
 */
async function searchEpisodes(query) {
  const episodes = await fetchEpisodes();
  const lowerQuery = query.toLowerCase();
  return episodes.filter(episode => {
    return episode.title.toLowerCase().includes(lowerQuery) ||
           episode.description.toLowerCase().includes(lowerQuery) ||
           episode.tags.toLowerCase().includes(lowerQuery);
  });
}

/**
 * Create an episode preview card (used on home page)
 */
function createEpisodePreviewCard(episode) {
  const card = document.createElement('div');
  card.className = 'episode-preview';

  const episodeLabel = episode.episodeNumber
    ? `Ep. ${episode.episodeNumber}`
    : '';
  const truncatedDesc = episode.description.length > 150
    ? episode.description.substring(0, 150) + '...'
    : episode.description;

  const epSlug = episode.audioUrl
    ? episode.audioUrl.replace('https://www.buzzsprout.com/2324798/episodes/', '').replace('.mp3', '')
    : String(episode.id);
  const episodeUrl = `/ep/${epSlug}.html`;

  card.innerHTML = `
    <a href="${episodeUrl}" class="episode-preview-artwork-link" style="display:block; text-decoration:none;">
      <div class="episode-preview-artwork">
        <img src="${episode.artworkUrl}" alt="${episode.title}" loading="lazy">
      </div>
    </a>
    <div class="episode-preview-body">
      ${episodeLabel ? `<div class="episode-preview-number">${episodeLabel}</div>` : ''}
      <h3><a href="${episodeUrl}" style="color:inherit; text-decoration:none;">${episode.title}</a></h3>
      <div class="episode-preview-date">${episode.pubDateFormatted}${episode.durationFormatted ? ' &middot; ' + episode.durationFormatted : ''}</div>
      <p class="episode-preview-description">${truncatedDesc}</p>
      <a href="${episodeUrl}" class="episode-preview-link">View Episode &rarr;</a>
    </div>
  `;

  return card;
}

/**
 * Create a full episode card (used on episodes page)
 */
function createEpisodeCard(episode) {
  const card = document.createElement('div');
  card.className = 'card episode-card';
  card.id = `episode-${episode.id}`;

  const episodeLabel = episode.episodeNumber
    ? `Ep. ${episode.episodeNumber}`
    : '';

  card.innerHTML = `
    <div class="episode-card-header" role="button" tabindex="0" aria-expanded="false">
      <img class="episode-card-artwork" src="${episode.artworkUrl}" alt="${episode.title}" loading="lazy">
      <div class="episode-meta">
        ${episodeLabel ? `<div class="episode-label">${episodeLabel}</div>` : ''}
        <h3>${episode.title}</h3>
        <div class="episode-date">
          <span>${episode.pubDateFormatted}${episode.durationFormatted ? ' &middot; ' + episode.durationFormatted : ''}</span>
        </div>
      </div>
      <div class="episode-expand-icon">&#9660;</div>
    </div>
  ${episode.audioUrl ? `
    <div class="audio-player" style="padding: var(--spacing-md) var(--spacing-lg) 0;">
      <audio controls preload="none" style="width:100%;">
        <source src="${episode.audioUrl}" type="audio/mpeg">
        Your browser does not support the audio element.
      </audio>
    </div>
  ` : ''}
    <div class="episode-expanded-content">
      <div class="episode-description-full">${episode.descriptionHtml}</div>
      <div class="episode-actions" style="display:flex; gap:0.75rem; flex-wrap:wrap;">
        <a href="/ep/${episode.audioUrl ? episode.audioUrl.replace('https://www.buzzsprout.com/2324798/episodes/','').replace('.mp3','') : episode.id}.html" class="btn btn-primary btn-sm">Full Episode Page</a>
        <a href="${episode.link}" target="_blank" class="btn btn-secondary btn-sm">View on Buzzsprout</a>
      </div>
    </div>
  `;

  // Click header to expand/collapse
  const header = card.querySelector('.episode-card-header');
  header.addEventListener('click', (e) => {
    // Don't toggle if clicking a link inside
    if (e.target.tagName === 'A') return;
    const isExpanded = card.classList.toggle('expanded');
    header.setAttribute('aria-expanded', isExpanded);
  });

  // Keyboard accessibility
  header.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const isExpanded = card.classList.toggle('expanded');
      header.setAttribute('aria-expanded', isExpanded);
    }
  });

  // Auto-expand if URL hash matches this episode
  if (window.location.hash === `#episode-${episode.id}`) {
    card.classList.add('expanded');
    header.setAttribute('aria-expanded', 'true');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  }

  return card;
}

/**
 * Set the active navigation link
 */
function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('nav a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Initialize the page
 */
function initPage() {
  setActiveNav();

  // Smooth scroll for hash links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
