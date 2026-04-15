#!/usr/bin/env node
/**
 * generate.js — Static episode page builder
 * Psychotherapy and Applied Psychology Podcast
 *
 * What this does:
 *   1. Fetches all episodes from the Buzzsprout API
 *   2. Generates a fully static, crawlable HTML page for each episode → ep/[id].html
 *   3. Rewrites sitemap.xml to include all episode URLs
 *
 * Run manually:  node generate.js
 * Netlify runs this automatically on every deploy via netlify.toml
 */

const https = require('https');
const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const API_URL        = 'https://www.buzzsprout.com/api/2324798/episodes.json?api_token=5c913cfdf411f020c10e9bd354f42836';
const BASE_URL       = 'https://psychotherapyandappliedpsychology.com';
const PODCAST_TITLE  = 'Psychotherapy and Applied Psychology';
const PODCAST_ARTWORK = `${BASE_URL}/logo.png`;
const GA_ID          = 'G-T91TB00ERC';
const RSS_FEED       = 'https://rss.buzzsprout.com/2324798.rss';
const APPLE_URL      = 'https://podcasts.apple.com/us/podcast/psychotherapy-and-applied-psychology/id1734318570';
const SPOTIFY_URL    = 'https://open.spotify.com/show/4rG5TrfM0cu3Z4iOMRBCp6';
const YOUTUBE_CHANNEL = 'http://www.youtube.com/@PsychotherapyAppliedPsychology';

const OUT_DIR         = path.join(__dirname, 'ep');
const YOUTUBE_MAP_PATH = path.join(__dirname, 'youtube-map.json');
const SITEMAP_PATH    = path.join(__dirname, 'sitemap.xml');
const TABS_CACHE_PATH = path.join(__dirname, 'ep-tabs-cache.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function metaDesc(html, maxLen = 155) {
  const text = stripHtml(html);
  return text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : text;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function isoDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `PT${h > 0 ? h + 'H' : ''}${m > 0 ? m + 'M' : ''}${s > 0 ? s + 'S' : ''}`;
}

// ─── Slug & Guest Helpers ─────────────────────────────────────────────────────

/** Derive a keyword-rich slug from the episode's audio_url.
 *  e.g. audio_url ending in "18914652-psychedelic-therapy-jason-luoma.mp3"
 *  → slug = "18914652-psychedelic-therapy-jason-luoma"
 *  Falls back to the numeric id if audio_url is absent.
 */
function getEpisodeSlug(ep) {
  if (!ep.audio_url) return String(ep.id);
  const m = ep.audio_url.match(/\/episodes\/([^.]+)\.mp3/);
  return m ? m[1] : String(ep.id);
}

/** Pull every guest name + website out of guests.html so we can mark up
 *  episode pages with a Person schema. Returns { "last first": url|null } */
function loadGuestsLookup() {
  const lookup = {};
  try {
    const html = fs.readFileSync(path.join(__dirname, 'guests.html'), 'utf8');
    const re = /\{\s*name:\s*"([^"]+)"[\s\S]*?website:\s*(?:"([^"]*?)"|null)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const rawName = m[1];
      const website = m[2] || null;
      // Strip honorifics for a normalised lookup key
      const key = rawName.replace(/^(Dr\.\s*|Mr\.\s*|Ms\.\s*|Prof\.\s*)/i, '').trim().toLowerCase();
      lookup[key] = { fullName: rawName, website };
    }
  } catch (_) { /* guests.html missing — skip */ }
  return lookup;
}

/** Extract the guest's name from an episode title.
 *  Matches "…with Dr. First Last" or "…with First Last" at end of title. */
function extractGuestName(title) {
  const m = title.match(/\bwith\s+((?:Dr\.\s+|Mr\.\s+|Ms\.\s+|Prof\.\s+)?[A-Z][a-zA-Z''-]+(?:\s+[A-Z][a-zA-Z''-]+)+)\s*$/i);
  return m ? m[1].trim() : null;
}

// ─── Buzzsprout Tab Fetching (chapters + transcript) ─────────────────────────

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PodcastSiteBot/1.0)' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function decodeHtmlEntities(str) {
  return (str || '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '');
}

function parseEpisodeTabs(html) {
  // Parse chapters from aria-labels on chapter buttons
  const chapters = [];
  const chapRe = /aria-label="Jump to ([0-9:]+),\s*([^"]+)"/g;
  let m;
  while ((m = chapRe.exec(html)) !== null) {
    chapters.push({ time: m[1], title: decodeHtmlEntities(m[2]) });
  }

  // Parse transcript — find the transcript panel div
  let transcript = '';
  const transIdx = html.indexOf('id="transcript"');
  if (transIdx !== -1) {
    // Take a generous chunk from the transcript panel start
    const transChunk = html.substring(transIdx, transIdx + 150000);
    // Stop before any other non-transcript tab panel
    const endMatch = transChunk.search(/data-tabs-panel="(?!transcript)/);
    const transContent = endMatch > 0 ? transChunk.substring(0, endMatch) : transChunk;
    // Extract all <p> text
    const pMatches = [...transContent.matchAll(/<p>([\s\S]*?)<\/p>/g)];
    if (pMatches.length > 0) {
      transcript = pMatches
        .map(p => decodeHtmlEntities(p[1].replace(/<[^>]+>/g, '').trim()))
        .filter(t => t.length > 10)
        .join('\n\n');
    }
  }

  return { chapters, transcript };
}

function loadTabsCache() {
  if (fs.existsSync(TABS_CACHE_PATH)) {
    try { return JSON.parse(fs.readFileSync(TABS_CACHE_PATH, 'utf8')); }
    catch (e) { return {}; }
  }
  return {};
}

function saveTabsCache(cache) {
  fs.writeFileSync(TABS_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

async function fetchAllTabs(episodes, cache) {
  const toFetch = episodes.filter(ep => !cache[ep.id]);
  if (toFetch.length === 0) {
    console.log(`✓  Tabs cache: all ${episodes.length} episodes already cached`);
    return;
  }
  console.log(`⬇  Fetching tabs for ${toFetch.length} uncached episodes (${episodes.length - toFetch.length} cached)…`);
  const CONCURRENCY = 5;
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async ep => {
      const slugMatch = (ep.audio_url || '').match(/\/episodes\/(\d+-[^.]+)\.mp3/);
      if (!slugMatch) { cache[ep.id] = { chapters: [], transcript: '' }; return; }
      const url = `https://www.buzzsprout.com/2324798/episodes/${slugMatch[1]}`;
      try {
        const html = await fetchHtml(url);
        cache[ep.id] = parseEpisodeTabs(html);
        process.stdout.write('.');
      } catch (e) {
        cache[ep.id] = { chapters: [], transcript: '' };
        process.stdout.write('x');
      }
    }));
  }
  process.stdout.write('\n');
}

// ─── HTML Template ───────────────────────────────────────────────────────────

function buildContentTabs(ep, tabs) {
  const hasChapters  = tabs && tabs.chapters  && tabs.chapters.length > 0;
  const hasTranscript = tabs && tabs.transcript && tabs.transcript.trim().length > 100;
  const hasTabs = hasChapters || hasTranscript;

  // Show Notes panel (always present)
  const showNotesPanel = `
        <div class="ep-tab-panel${hasTabs ? ' ep-tab-active' : ''}" id="ep-panel-shownotes"${hasTabs ? ' role="tabpanel"' : ''}>
          <div class="ep-shownotes">${ep.description || ''}</div>
        </div>`;

  // Chapters panel
  const chaptersPanel = hasChapters ? `
        <div class="ep-tab-panel" id="ep-panel-chapters" role="tabpanel">
          <ol class="ep-chapters-list">
            ${tabs.chapters.map(c => `<li>
              <span class="ep-chapter-time">${escapeHtml(c.time)}</span>
              <span class="ep-chapter-title">${escapeHtml(c.title)}</span>
            </li>`).join('')}
          </ol>
        </div>` : '';

  // Transcript panel
  const transcriptPanel = hasTranscript ? `
        <div class="ep-tab-panel" id="ep-panel-transcript" role="tabpanel">
          <div class="ep-transcript-wrap">
            <p class="ep-transcript-text">${escapeHtml(tabs.transcript)}</p>
          </div>
        </div>` : '';

  if (!hasTabs) {
    // No tabs — just the plain show notes with heading (original layout)
    return `
        <div class="ep-section-header">
          <h2 class="ep-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            About This Episode
          </h2>
        </div>
        <div class="ep-shownotes">${ep.description || ''}</div>`;
  }

  return `
        <div class="ep-tabs-nav" role="tablist">
          <button class="ep-tab-btn ep-tab-active" data-panel="shownotes" role="tab" aria-selected="true">Show Notes</button>
          ${hasChapters  ? `<button class="ep-tab-btn" data-panel="chapters"   role="tab" aria-selected="false">Chapters</button>` : ''}
          ${hasTranscript ? `<button class="ep-tab-btn" data-panel="transcript" role="tab" aria-selected="false">Transcript</button>` : ''}
        </div>
        ${showNotesPanel}
        ${chaptersPanel}
        ${transcriptPanel}
        <script>
          (function() {
            var sec = document.getElementById('content-section');
            if (!sec) return;
            sec.querySelectorAll('.ep-tab-btn').forEach(function(btn) {
              btn.addEventListener('click', function() {
                sec.querySelectorAll('.ep-tab-btn').forEach(function(b) { b.classList.remove('ep-tab-active'); b.setAttribute('aria-selected','false'); });
                sec.querySelectorAll('.ep-tab-panel').forEach(function(p) { p.classList.remove('ep-tab-active'); });
                btn.classList.add('ep-tab-active');
                btn.setAttribute('aria-selected','true');
                var panel = sec.querySelector('#ep-panel-' + btn.dataset.panel);
                if (panel) panel.classList.add('ep-tab-active');
              });
            });
          })();
        <\/script>`;
}

function buildEpisodePage(ep, youtubeVideoId, tabs, guestsLookup, slug) {
  slug             = slug || String(ep.id);
  const pageUrl    = `${BASE_URL}/ep/${slug}.html`;
  const title      = escapeHtml(ep.title);
  const desc       = metaDesc(ep.description);
  const descEsc    = escapeHtml(desc);
  const artwork    = escapeHtml(ep.artwork_url || PODCAST_ARTWORK);
  const dateStr    = formatDate(ep.published_at);
  const dur        = formatDuration(ep.duration);
  const epLabel    = ep.episode_number ? `Episode ${ep.episode_number}` : '';
  const twitterCard = (ep.artwork_url) ? 'summary_large_image' : 'summary';

  // ── PodcastEpisode schema ────────────────────────────────────────────────
  const podcastSchema = {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    'name': ep.title,
    'description': desc,
    'url': pageUrl,
    'datePublished': ep.published_at ? ep.published_at.split('T')[0] : '',
    'timeRequired': isoDuration(ep.duration),
    'associatedMedia': ep.audio_url ? {
      '@type': 'AudioObject',
      'contentUrl': ep.audio_url,
      'encodingFormat': 'audio/mpeg'
    } : undefined,
    'partOfSeries': {
      '@type': 'PodcastSeries',
      'name': PODCAST_TITLE,
      'url': BASE_URL + '/'
    },
    'image': ep.artwork_url || PODCAST_ARTWORK
  };

  // ── BreadcrumbList schema ────────────────────────────────────────────────
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home',     'item': BASE_URL + '/' },
      { '@type': 'ListItem', 'position': 2, 'name': 'Episodes', 'item': BASE_URL + '/episodes.html' },
      { '@type': 'ListItem', 'position': 3, 'name': ep.title,   'item': pageUrl }
    ]
  };

  // ── Person schema (guest) ────────────────────────────────────────────────
  let personSchema = null;
  if (guestsLookup) {
    const guestRaw = extractGuestName(ep.title);
    if (guestRaw) {
      const key = guestRaw.replace(/^(Dr\.\s*|Mr\.\s*|Ms\.\s*|Prof\.\s*)/i, '').trim().toLowerCase();
      const guest = guestsLookup[key];
      if (guest) {
        personSchema = { '@context': 'https://schema.org', '@type': 'Person', 'name': guest.fullName };
        if (guest.website) personSchema['url'] = guest.website;
      } else {
        // Guest not found in lookup — use the extracted name anyway
        personSchema = { '@context': 'https://schema.org', '@type': 'Person', 'name': guestRaw };
      }
    }
  }

  const schemaBlocks = [
    `<script type="application/ld+json">\n${JSON.stringify(podcastSchema, null, 2)}\n</script>`,
    `<script type="application/ld+json">\n${JSON.stringify(breadcrumbSchema, null, 2)}\n</script>`,
    personSchema ? `<script type="application/ld+json">\n${JSON.stringify(personSchema, null, 2)}\n</script>` : ''
  ].filter(Boolean).join('\n  ');

  const youtubeSection = youtubeVideoId ? `
      <!-- YouTube Video -->
      <div class="ep-section" id="video-section">
        <div id="youtube-container" class="ep-youtube-container">
          <div class="ep-youtube-thumb" id="yt-thumb-${youtubeVideoId}" style="cursor:pointer;" title="Play video">
            <img
              src="https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg"
              alt="${title}"
              class="ep-youtube-thumb-img"
              onerror="this.src='https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg'"
            >
            <button class="ep-youtube-play-btn" aria-label="Play video">
              <svg viewBox="0 0 68 48" width="68" height="48">
                <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#ff0000"/>
                <path d="M45 24 27 14v20" fill="#fff"/>
              </svg>
            </button>
            <a href="https://www.youtube.com/watch?v=${youtubeVideoId}" target="_blank" class="ep-youtube-watch-label" onclick="event.stopPropagation();">Watch on YouTube ↗</a>
          </div>
        </div>
        <script>
          (function() {
            var vid = '${youtubeVideoId}';
            var thumb = document.getElementById('yt-thumb-' + vid);
            if (thumb) {
              thumb.addEventListener('click', function(e) {
                if (e.target.closest('a')) return;
                var c = document.getElementById('youtube-container');
                c.innerHTML = '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:var(--radius-lg);background:#000;"><iframe src="https://www.youtube-nocookie.com/embed/' + vid + '?autoplay=1&rel=0" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:var(--radius-lg);"></iframe></div>';
              });
            }
          })();
        <\/script>
      </div>` : '';

  const audioSection = ep.id ? `
      <!-- Audio Player -->
      <div class="ep-section" id="audio-section">
        <div class="ep-audio-player">
          <div id="buzzsprout-player-${ep.id}"></div>
          <script src="https://www.buzzsprout.com/2324798/${ep.id}.js?container_id=buzzsprout-player-${ep.id}&player=small" type="text/javascript" charset="utf-8"><\/script>
        </div>
      </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${descEsc}">
  <meta name="theme-color" content="#1a3a52">

  <!-- SEO: Canonical -->
  <link rel="canonical" href="${pageUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="${PODCAST_TITLE}">
  <meta property="og:title" content="${title} | ${PODCAST_TITLE}">
  <meta property="og:description" content="${descEsc}">
  <meta property="og:image" content="${artwork}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${twitterCard}">
  <meta name="twitter:title" content="${title} | ${PODCAST_TITLE}">
  <meta name="twitter:description" content="${descEsc}">
  <meta name="twitter:image" content="${artwork}">

  <title>${title} | ${PODCAST_TITLE}</title>

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">

  <!-- Stylesheets -->
  <link rel="stylesheet" href="../style.css">
  <style>
    /* Episode content tabs */
    .ep-tabs-nav { display:flex; border-bottom:2px solid #e5e7eb; margin-bottom:1.5rem; gap:0; }
    .ep-tab-btn { background:none; border:none; border-bottom:3px solid transparent; margin-bottom:-2px; padding:0.7rem 1.2rem; cursor:pointer; font-size:0.95rem; font-weight:500; color:#6b7280; font-family:inherit; transition:color 0.15s; }
    .ep-tab-btn:hover { color:#111827; }
    .ep-tab-btn.ep-tab-active { color:#1a3a52; border-bottom-color:#1a3a52; }
    .ep-tab-panel { display:none; }
    .ep-tab-panel.ep-tab-active { display:block; }
    /* Chapters list */
    .ep-chapters-list { list-style:none; padding:0; margin:0; }
    .ep-chapters-list li { display:flex; gap:1rem; padding:0.65rem 0; border-bottom:1px solid #f3f4f6; align-items:flex-start; }
    .ep-chapters-list li:last-child { border-bottom:none; }
    .ep-chapter-time { font-size:0.85rem; font-weight:600; color:#1a3a52; min-width:3.5rem; flex-shrink:0; padding-top:2px; }
    .ep-chapter-title { font-size:0.95rem; line-height:1.5; }
    /* Transcript */
    .ep-transcript-wrap { max-height:520px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:8px; padding:1.25rem 1.5rem; background:#fafafa; }
    .ep-transcript-text { font-size:0.93rem; line-height:1.9; color:#374151; white-space:pre-wrap; margin:0; }
  </style>

  <!-- Favicon -->
  <link rel="icon" href="../logo.png" type="image/png">
  <link rel="apple-touch-icon" href="../logo.png">
  <link rel="alternate" type="application/rss+xml" title="${PODCAST_TITLE}" href="${RSS_FEED}">

  <!-- Schema.org: PodcastEpisode + BreadcrumbList + Person -->
  ${schemaBlocks}
</head>
<body>

  <!-- Header & Navigation -->
  <header>
    <div class="container">
      <a href="../index.html" class="logo">
        <img src="../logo.webp" alt="Podcast Logo">
        <span>Psychotherapy &amp; Applied Psychology</span>
      </a>
      <button class="menu-toggle" aria-label="Toggle navigation" aria-expanded="false">
        <span class="hamburger-icon">☰</span>
      </button>
      <nav>
        <a href="../index.html">Home</a>
        <a href="../episodes.html">Episodes</a>
        <a href="../guests.html">Guests</a>
        <a href="../about.html">About</a>
        <a href="../contact.html">Contact</a>
        <a href="../faq.html">FAQ</a>
      </nav>
    </div>
  </header>

  <!-- Episode Hero -->
  <section class="ep-hero">
    <div class="container">
      <nav class="ep-breadcrumb" aria-label="breadcrumb">
        <a href="../index.html">Home</a>
        <span class="breadcrumb-sep">›</span>
        <a href="../episodes.html">Episodes</a>
        <span class="breadcrumb-sep">›</span>
        <span>${title}</span>
      </nav>

      <div class="ep-hero-layout">
        <!-- Artwork -->
        <div class="ep-hero-artwork-wrap">
          <img src="${artwork}" alt="${title}" class="ep-hero-artwork">
        </div>

        <!-- Info -->
        <div class="ep-hero-info">
          ${epLabel ? `<div class="ep-hero-label">${escapeHtml(epLabel)}</div>` : ''}
          <h1 class="ep-hero-title">${title}</h1>
          <div class="ep-hero-meta">
            ${dateStr ? `<span>${escapeHtml(dateStr)}</span>` : ''}
            ${dateStr && dur ? `<span class="ep-meta-dot">·</span>` : ''}
            ${dur ? `<span>${escapeHtml(dur)}</span>` : ''}
          </div>

          <!-- Platform Buttons -->
          <div class="ep-platform-buttons">
            <a href="${APPLE_URL}" target="_blank" rel="noopener" class="ep-platform-btn ep-platform-apple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              Apple Podcasts
            </a>
            <a href="${SPOTIFY_URL}" target="_blank" rel="noopener" class="ep-platform-btn ep-platform-spotify">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              Spotify
            </a>
            ${youtubeVideoId ? `
            <a href="https://www.youtube.com/watch?v=${youtubeVideoId}" target="_blank" rel="noopener" class="ep-platform-btn ep-platform-youtube">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
              Watch on YouTube
            </a>` : `
            <a href="${YOUTUBE_CHANNEL}" target="_blank" rel="noopener" class="ep-platform-btn ep-platform-youtube">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
              YouTube Channel
            </a>`}
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Main Content -->
  <div class="ep-main container">

    <!-- Primary Column -->
    <div class="ep-primary">
${youtubeSection}
${audioSection}

      <!-- Show Notes / Chapters / Transcript Tabs -->
      <div class="ep-section" id="content-section">
        ${buildContentTabs(ep, tabs)}
      </div>

    </div><!-- /ep-primary -->

    <!-- Sidebar -->
    <aside class="ep-sidebar">

      <div class="ep-sidebar-card">
        <h3 class="ep-sidebar-heading">Share This Episode</h3>
        <div class="ep-share-buttons">
          <button class="ep-share-btn" onclick="navigator.clipboard.writeText('${pageUrl}').then(function(){var c=document.getElementById('copy-confirm');c.style.display='block';setTimeout(function(){c.style.display='none'},2000)})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Link
          </button>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(ep.title)}&url=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener" class="ep-share-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Share on X
          </a>
          <a href="https://bsky.app/intent/compose?text=${encodeURIComponent(ep.title + ' ' + pageUrl)}" target="_blank" rel="noopener" class="ep-share-btn">
            <svg width="16" height="16" viewBox="0 0 568 501" fill="currentColor"><path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.209C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 323.8 536.444 388.56 473.922 453.32c-119.011 122.22-170.594-30.636-183.623-69.82-2.65-7.765-3.874-11.376-3.899-8.31-.025-3.066-1.249.545-3.899 8.31-13.029 39.184-64.612 192.04-183.623 69.82C36.556 388.56 65.778 323.8 180.653 304.25c-65.72 11.185-139.6-7.295-159.875-79.748C14.945 203.66 5 75.293 5 57.947 5-28.906 81.134-1.611 123.121 33.664z"/></svg>
            Bluesky
          </a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener" class="ep-share-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            LinkedIn
          </a>
        </div>
        <div id="copy-confirm" style="display:none; font-size:0.85rem; color:var(--success); margin-top:0.5rem; text-align:center;">✓ Link copied!</div>
      </div>

      <div class="ep-sidebar-card">
        <h3 class="ep-sidebar-heading">Listen On</h3>
        <div class="ep-sidebar-platforms">
          <a href="${APPLE_URL}" target="_blank" rel="noopener" class="ep-sidebar-platform-link ep-plat-apple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Apple Podcasts
          </a>
          <a href="${SPOTIFY_URL}" target="_blank" rel="noopener" class="ep-sidebar-platform-link ep-plat-spotify">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            Spotify
          </a>
          <a href="https://pca.st/itunes/1734318570" target="_blank" rel="noopener" class="ep-sidebar-platform-link ep-plat-pocketcasts">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/></svg>
            Pocket Casts
          </a>
          <a href="${youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : YOUTUBE_CHANNEL}" target="_blank" rel="noopener" class="ep-sidebar-platform-link ep-plat-youtube">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
            YouTube
          </a>
        </div>
      </div>

      <div class="ep-sidebar-card">
        <h3 class="ep-sidebar-heading">About the Host</h3>
        <div class="ep-host-card">
          <img src="../logo.webp" alt="Dan" class="ep-host-avatar">
          <div>
            <div class="ep-host-name">Dan</div>
            <div class="ep-host-title">Professor, University of British Columbia</div>
          </div>
        </div>
        <p class="ep-host-bio">Dan researches the science of psychotherapy, bringing world-leading experts to discuss what actually works in mental health treatment.</p>
        <a href="../about.html" class="ep-sidebar-link">Learn more →</a>
      </div>

    </aside>

  </div><!-- /ep-main -->

  <!-- Related Episodes -->
  <section class="ep-related-section">
    <div class="container">
      <div class="section-title">
        <h2>More Episodes</h2>
      </div>
      <div id="related-container" class="latest-episodes"></div>
      <div style="text-align:center; margin-top: var(--spacing-2xl);">
        <a href="../episodes.html" class="btn btn-primary">View All Episodes</a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer></footer>

  <script src="../shared.js"></script>
  <script>
    // Load related episodes
    (async function() {
      var container = document.getElementById('related-container');
      if (!container) return;
      var episodes = await fetchEpisodes();
      var related = episodes.filter(function(e) { return String(e.id) !== '${ep.id}'; }).slice(0, 3);
      related.forEach(function(e) { container.appendChild(createEpisodePreviewCard(e)); });
    })();
  </script>
</body>
</html>`;
}

// ─── Static Episode Card (for homepage & episodes page injection) ────────────

function buildStaticPreviewCard(ep, slug) {
  const title    = escapeHtml(ep.title);
  const desc     = stripHtml(ep.description || '');
  const truncDesc = desc.length > 150 ? desc.substring(0, 150) + '...' : desc;
  const artwork  = escapeHtml(ep.artwork_url || PODCAST_ARTWORK);
  const dateStr  = formatDate(ep.published_at);
  const dur      = formatDuration(ep.duration);
  const epLabel  = ep.episode_number ? `Ep. ${ep.episode_number}` : '';
  const epUrl    = `/ep/${slug}.html`;

  return `<div class="episode-preview">
      <a href="${epUrl}" class="episode-preview-artwork-link" style="display:block; text-decoration:none;">
        <div class="episode-preview-artwork">
          <img src="${artwork}" alt="${title}" loading="lazy">
        </div>
      </a>
      <div class="episode-preview-body">
        ${epLabel ? `<div class="episode-preview-number">${epLabel}</div>` : ''}
        <h3><a href="${epUrl}" style="color:inherit; text-decoration:none;">${title}</a></h3>
        <div class="episode-preview-date">${escapeHtml(dateStr)}${dur ? ' &middot; ' + escapeHtml(dur) : ''}</div>
        <p class="episode-preview-description">${escapeHtml(truncDesc)}</p>
        <a href="${epUrl}" class="episode-preview-link">View Episode &rarr;</a>
      </div>
    </div>`;
}

/**
 * Replace content between <!-- MARKER_START --> and <!-- MARKER_END --> in a string.
 */
function replaceBetweenMarkers(html, startMarker, endMarker, content) {
  const si = html.indexOf(startMarker);
  const ei = html.indexOf(endMarker);
  if (si === -1 || ei === -1) return null;
  return html.substring(0, si + startMarker.length) + '\n' + content + '\n        ' + html.substring(ei);
}

/**
 * Inject static episode HTML into index.html and episodes.html so that
 * non-JS crawlers (Bing, social previews, AI crawlers, Google's initial
 * HTML pass) see real episode content instead of empty spinner containers.
 *
 * The client-side JS in shared.js will replace this static content with
 * interactive versions (ticker, search, pagination) on page load.
 */
function injectStaticEpisodes(episodes) {
  const INDEX_PATH    = path.join(__dirname, 'index.html');
  const EPISODES_PATH = path.join(__dirname, 'episodes.html');
  const START         = '<!-- STATIC_EPISODES_START -->';
  const END           = '<!-- STATIC_EPISODES_END -->';
  const JSONLD_START  = '<!-- JSONLD_EPISODES_START -->';
  const JSONLD_END    = '<!-- JSONLD_EPISODES_END -->';

  // Build slug lookup
  const slugFor = {};
  episodes.forEach(ep => { slugFor[ep.id] = getEpisodeSlug(ep); });

  // ── Homepage: 8 alternating episodes (matches JS ticker selection) ──────
  if (fs.existsSync(INDEX_PATH)) {
    let html = fs.readFileSync(INDEX_PATH, 'utf8');
    const homepageEps = episodes.slice(0, 16).filter((_, i) => i % 2 === 0);
    const cards = homepageEps.map(ep => buildStaticPreviewCard(ep, slugFor[ep.id])).join('\n        ');
    const result = replaceBetweenMarkers(html, START, END, '        ' + cards);
    if (result) {
      fs.writeFileSync(INDEX_PATH, result, 'utf8');
      console.log(`✓  Injected ${homepageEps.length} static episode cards into index.html`);
    } else {
      console.log('⚠  index.html missing STATIC_EPISODES markers — skipping');
    }
  }

  // ── Episodes page: all episodes + ItemList JSON-LD ─────────────────────
  if (fs.existsSync(EPISODES_PATH)) {
    let html = fs.readFileSync(EPISODES_PATH, 'utf8');

    // Inject static cards
    const cards = episodes.map(ep => buildStaticPreviewCard(ep, slugFor[ep.id])).join('\n        ');
    let result = replaceBetweenMarkers(html, START, END, '        ' + cards);
    if (result) {
      html = result;
      console.log(`✓  Injected ${episodes.length} static episode cards into episodes.html`);
    } else {
      console.log('⚠  episodes.html missing STATIC_EPISODES markers — skipping cards');
    }

    // Inject ItemList JSON-LD
    const itemListSchema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'All Episodes — Psychotherapy and Applied Psychology',
      'numberOfItems': episodes.length,
      'itemListElement': episodes.map((ep, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'url': `${BASE_URL}/ep/${slugFor[ep.id]}.html`,
        'name': ep.title
      }))
    };
    const jsonLdBlock = `  <script type="application/ld+json">\n${JSON.stringify(itemListSchema, null, 2)}\n  </script>`;
    const jsonResult = replaceBetweenMarkers(html, JSONLD_START, JSONLD_END, jsonLdBlock);
    if (jsonResult) {
      html = jsonResult;
      console.log(`✓  Injected ItemList JSON-LD (${episodes.length} episodes) into episodes.html`);
    }

    fs.writeFileSync(EPISODES_PATH, html, 'utf8');
  }
}

// ─── Sitemap ─────────────────────────────────────────────────────────────────

const STATIC_PAGES = [
  { url: '/',             changefreq: 'weekly',  priority: '1.0' },
  { url: '/episodes.html', changefreq: 'weekly',  priority: '0.9' },
  { url: '/guests.html',  changefreq: 'weekly',  priority: '0.8' },
  { url: '/about.html',   changefreq: 'monthly', priority: '0.7' },
  { url: '/faq.html',     changefreq: 'monthly', priority: '0.6' },
  { url: '/follow.html',  changefreq: 'monthly', priority: '0.6' },
  { url: '/contact.html', changefreq: 'monthly', priority: '0.5' },
];

function buildSitemap(episodes) {
  const staticEntries = STATIC_PAGES.map(p => `
  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

  const episodeEntries = episodes.map(ep => {
    const slug = getEpisodeSlug(ep);
    return `
  <url>
    <loc>${BASE_URL}/ep/${slug}.html</loc>
    <lastmod>${ep.published_at ? ep.published_at.split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${episodeEntries}
</urlset>`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎙  Psychotherapy & Applied Psychology — static page generator');
  console.log('────────────────────────────────────────────────────────────');

  // Load YouTube map
  let youtubeMap = {};
  if (fs.existsSync(YOUTUBE_MAP_PATH)) {
    const raw = JSON.parse(fs.readFileSync(YOUTUBE_MAP_PATH, 'utf8'));
    youtubeMap = raw.map || {};
    console.log(`✓  Loaded YouTube map (${Object.keys(youtubeMap).length} entries)`);
  }

  // Fetch episodes
  console.log('⬇  Fetching episodes from Buzzsprout API…');
  let episodes;
  try {
    const raw = await fetchJson(API_URL);
    episodes = raw.filter(ep => !ep.private && !ep.inactive_at);
    console.log(`✓  Fetched ${episodes.length} episodes`);
  } catch (err) {
    console.error('✗  Failed to fetch episodes:', err.message);
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log('✓  Created ep/ directory');
  }

  // Load tabs cache and fetch any missing episodes
  console.log('📑 Loading chapters + transcripts…');
  const tabsCache = loadTabsCache();
  await fetchAllTabs(episodes, tabsCache);
  saveTabsCache(tabsCache);
  console.log(`✓  Tabs cache saved (${Object.keys(tabsCache).length} entries)`);

  // Load guest data for Person schema
  const guestsLookup = loadGuestsLookup();
  console.log(`✓  Loaded guests lookup (${Object.keys(guestsLookup).length} guests)`);

  // Generate episode pages
  console.log('📄 Generating episode pages…');
  let generated = 0;
  let errors = 0;

  for (const ep of episodes) {
    try {
      const ytEntry = youtubeMap[String(ep.id)];
      const youtubeVideoId = ytEntry ? ytEntry.videoId : null;
      const tabs = tabsCache[ep.id] || { chapters: [], transcript: '' };
      const slug = getEpisodeSlug(ep);

      // Write the main slug-based page
      const html = buildEpisodePage(ep, youtubeVideoId, tabs, guestsLookup, slug);
      fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html, 'utf8');

      // Write a lightweight redirect from the old numeric-ID URL → slug URL
      if (slug !== String(ep.id)) {
        const slugUrl = `/ep/${slug}.html`;
        const redirectHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="canonical" href="${BASE_URL}${slugUrl}"><meta http-equiv="refresh" content="0; url=${slugUrl}"><title>Redirecting…</title></head><body><a href="${slugUrl}">Click here if not redirected.</a></body></html>`;
        fs.writeFileSync(path.join(OUT_DIR, `${ep.id}.html`), redirectHtml, 'utf8');
      }

      generated++;
    } catch (err) {
      console.error(`  ✗  Episode ${ep.id} (${ep.title}): ${err.message}`);
      errors++;
    }
  }

  console.log(`✓  Generated ${generated} episode pages${errors > 0 ? ` (${errors} errors)` : ''}`);

  // Update sitemap
  console.log('🗺  Updating sitemap.xml…');
  const sitemap = buildSitemap(episodes);
  fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
  console.log(`✓  sitemap.xml updated (${STATIC_PAGES.length} static + ${episodes.length} episode URLs)`);

  // Inject static episode HTML into homepage + episodes page for crawlers
  console.log('🕷  Injecting static episodes for crawler visibility…');
  injectStaticEpisodes(episodes);

  console.log('────────────────────────────────────────────────────────────');
  console.log('✅  Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
