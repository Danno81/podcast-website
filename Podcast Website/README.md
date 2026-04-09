# Psychotherapy and Applied Psychology Podcast Website

A modern, professional podcast website for "Psychotherapy and Applied Psychology" hosted by Dr. Daniel W Cox, a professor at the University of British Columbia.

## Overview

This is a complete multi-page static website that pulls episodes dynamically from the Buzzsprout RSS feed. The site is built with clean, semantic HTML, professional CSS, and vanilla JavaScript—no frameworks or build tools required.

**Key Features:**
- Dynamic episode loading from RSS feed (via CORS proxy)
- Clean, modern, professional design
- Fully responsive (mobile-first)
- Smooth animations and transitions
- Search and filter functionality for episodes
- Audio player integration
- Platform links and subscribe CTAs
- Social media integration
- Fast loading and excellent SEO

## Files

### HTML Pages
- **index.html** — Home page with hero section, latest 3 episodes, about preview, and subscribe section
- **episodes.html** — Full searchable episode listing with expandable episodes and audio players
- **about.html** — About the podcast, host biography, mission statement, and listener benefits
- **contact.html** — Contact information, subscribe links, social media, and FAQ

### Styling & Scripts
- **style.css** — Comprehensive stylesheet with responsive design, animations, and professional color palette
- **shared.js** — Shared JavaScript for RSS parsing, episode management, and page initialization

## Design

### Color Palette
- **Primary Dark**: `#1a3a52` (Deep teal/navy)
- **Primary**: `#2c5aa0` (Professional blue)
- **Accent**: `#d4a574` (Warm gold/amber)
- **Background**: `#f8f7f5` (Warm off-white)
- **Surface**: `#ffffff` (White)

### Typography
- **Headings**: Playfair Display (serif)
- **Body**: Inter (sans-serif)

### Responsive Breakpoints
- Desktop: Full layout
- Tablet (≤768px): Single-column layouts, adjusted spacing
- Mobile (≤480px): Optimized for small screens, stacked elements

## Getting Started

### Local Development
1. Clone or download the project
2. Open any HTML file directly in your browser (e.g., `open index.html`)
3. Or serve locally with Python:
```bash
python -m http.server 8000
# Then visit http://localhost:8000
```

## Technical Details

### RSS Feed Integration
- Uses the Buzzsprout RSS feed: `https://rss.buzzsprout.com/2324798.rss`
- Implements CORS proxy (`https://api.allorigins.win/raw?url=...`) to bypass CORS restrictions
- Client-side parsing with `DOMParser` API
- Episode caching (1 hour) to minimize requests
- Graceful error handling

### Episode Structure
Each episode includes:
- Title
- Publication date
- Description
- Audio URL
- Link to Buzzsprout
- Episode number

### JavaScript Functions
- `fetchEpisodes(forceRefresh)` — Fetch and cache episodes from RSS
- `getLatestEpisodes(count)` — Get N latest episodes
- `searchEpisodes(query)` — Search episodes by title/description
- `createEpisodePreviewCard(episode)` — Create preview card (home page)
- `createEpisodeCard(episode)` — Create full card with audio player (episodes page)
- `setActiveNav()` — Highlight active navigation link
- `initPage()` — Initialize page on load

## Podcast Information

**Podcast Details:**
- **Title**: Psychotherapy and Applied Psychology
- **Host**: Dr. Daniel W Cox
- **Affiliation**: University of British Columbia
- **Email**: TheAppliedPsychologyPodcast@gmail.com
- **Artwork**: https://storage.buzzsprout.com/npdsrx17zjumqrkq144cob8llvc2?.jpg

**Social Links:**
- **Buzzsprout**: https://psychotherapyandappliedpsychology.buzzsprout.com
- **YouTube**: http://www.youtube.com/@PsychotherapyAppliedPsychology
- **Speakpipe**: https://www.speakpipe.com/PsychotherapyAppliedPsychology
- **LinkedIn**: https://www.linkedin.com/in/dan-cox-705595303/
- **Bluesky**: https://bsky.app/profile/danielwcox.bsky.social

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Fallback for audio player in older browsers

## Customization

### Change Colors
Edit the CSS custom properties in `style.css`:
```css
:root {
  --primary-dark: #1a3a52;
  --accent: #d4a574;
  /* etc. */
}
```

### Change Podcast Info
Edit `PODCAST_CONFIG` in `shared.js`:
```javascript
const PODCAST_CONFIG = {
  podcast: {
    title: 'Your Podcast Title',
    author: 'Your Name',
    // etc.
  }
}
```

### Add/Remove Pages
- Create new HTML file with same header/footer structure
- Add navigation link to all pages
- Import `shared.js` and `style.css`

## Performance

- Lightweight: \~50KB total (HTML + CSS + JS)
- Fast page loads
- Efficient RSS parsing
- Episode caching reduces API calls
- No external dependencies (beyond Google Fonts)

## Accessibility

- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support
- Color contrast meets WCAG standards
- Responsive design for all devices

## Troubleshooting

### Episodes Not Loading
1. Check browser console for errors (F12)
2. Verify internet connection
3. Check if RSS feed URL is accessible
4. CORS proxy may be rate-limited (try refreshing)

### Styling Issues
1. Clear browser cache
2. Verify `style.css` is in the same directory
3. Check for CSS overrides in browser dev tools

### Audio Player Not Working
1. Verify audio URL is accessible
2. Check browser supports MP3/audio codec
3. Some platforms may not allow direct audio playback

## License

This website is created for the Psychotherapy and Applied Psychology podcast by Dr. Daniel W Cox.

## Support

For issues or suggestions, contact:
- Email: TheAppliedPsychologyPodcast@gmail.com
- Speakpipe: https://www.speakpipe.com/PsychotherapyAppliedPsychology
- LinkedIn: https://www.linkedin.com/in/dan-cox-705595303/

---

Last updated: March 2026
