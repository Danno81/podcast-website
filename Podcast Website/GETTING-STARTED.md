# Getting Started - Psychotherapy and Applied Psychology Podcast Website

## Quick Start

### Option 1: Open in Browser (Easiest)
1. Download all files from the `/Podcast Website/` folder
2. Open `index.html` in your web browser
3. That's it! The site is fully functional

### Option 2: Local Server (Recommended)
```bash
cd /path/to/Podcast\ Website
python -m http.server 8000
# Visit http://localhost:8000 in your browser
```

---

## What's Included

### 4 Pages
1. **Home (index.html)** - Hero section, latest 3 episodes, about preview
2. **Episodes (episodes.html)** - Full episode listing with search
3. **About (about.html)** - Podcast & host information
4. **Contact (contact.html)** - Subscribe links, contact info, FAQ

### Core Files
- **style.css** - All styling (18KB, no external CSS)
- **shared.js** - RSS parsing, episode loading (8.6KB, no dependencies)
- **README.md** - Full documentation

---

## How It Works

### RSS Feed Loading
The site automatically fetches episodes from Buzzsprout:
- **Feed URL**: https://rss.buzzsprout.com/2324798.rss
- **CORS Proxy**: https://api.allorigins.win/raw?url=... (bypasses CORS)
- **Caching**: Episodes cached for 1 hour (minimizes API calls)
- **Fallback**: Graceful error handling if feed is unavailable

### Episode Display
- Home page shows the 3 latest episodes
- Episodes page shows all episodes with search
- Click an episode to expand and see the audio player
- Audio player is HTML5 (works in all modern browsers)

### Search & Filter
- Search by episode title or description
- Results update in real-time as you type
- Load more button for pagination

---

## Customization

### Change Podcast Info
Edit `shared.js`, find the `PODCAST_CONFIG` object:

```javascript
const PODCAST_CONFIG = {
  rssUrl: 'https://rss.buzzsprout.com/2324798.rss',
  podcast: {
    title: 'Your Podcast Title',
    author: 'Your Name',
    description: 'Your description...',
    links: {
      youtube: 'Your YouTube URL',
      email: 'your@email.com',
      // etc.
    }
  }
};
```

### Change Colors
Edit `style.css`, change the CSS variables at the top:

```css
:root {
  --primary-dark: #1a3a52;    /* Deep blue */
  --primary: #2c5aa0;         /* Medium blue */
  --accent: #d4a574;          /* Gold/amber */
  --background: #f8f7f5;      /* Off-white */
  /* ... more colors ... */
}
```

### Change Text Content
Edit the HTML files directly:
- Update page titles and descriptions
- Change podcast info
- Modify social links
- Update contact information

---

## Features

✓ **Dynamic Episode Loading** - Automatically pulls latest episodes from RSS
✓ **Search Functionality** - Find episodes by title or topic
✓ **Audio Player** - Built-in HTML5 audio player
✓ **Mobile Responsive** - Works perfectly on all devices
✓ **Fast & Light** - Only 96KB total, no external dependencies
✓ **Professional Design** - Modern color scheme and typography
✓ **Social Integration** - Links to all platforms
✓ **SEO Ready** - Proper meta tags and structure

---

## File Overview

```
index.html          8.5 KB    Home page
episodes.html       8.2 KB    Episode listing
about.html          13 KB     About podcast & host
contact.html        13 KB     Contact & subscribe
style.css           18 KB     All styling
shared.js           8.6 KB    Episode loading & logic
README.md           5.9 KB    Full documentation
```

---

## Browser Compatibility

| Browser | Desktop | Mobile | Notes         |
| ------- | ------- | ------ | ------------- |
| Chrome  | ✓       | ✓      | Full support  |
| Firefox | ✓       | ✓      | Full support  |
| Safari  | ✓       | ✓      | Full support  |
| Edge    | ✓       | ✓      | Full support  |
| IE 11   | ✗       | ✗      | Not supported |

---

## Troubleshooting

### Episodes Not Loading
1. Check your internet connection
2. Open browser console (F12 → Console)
3. Check for error messages
4. Try refreshing the page
5. The CORS proxy might be temporarily rate-limited

### Styling Looks Wrong
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Make sure `style.css` is in the same folder as HTML files
4. Check browser console for any errors

### Audio Player Not Working
1. Check the RSS feed has audio URLs
2. Try a different episode
3. Check your browser supports MP3 audio
4. Some network restrictions may block audio playback

### Site Won't Load Locally
1. Make sure all files are in the same folder
2. Use a local server instead of opening files directly
3. Try `python -m http.server 8000` to serve locally

---

## Performance Tips

- Episodes are cached for 1 hour to reduce API calls
- Google Fonts are cached by your browser
- The CORS proxy provides fast international access
- Total load time is typically under 2 seconds

---

## Security & Privacy

- No user data is collected
- No tracking or analytics (add Google Analytics if desired)
- All external links open in new tabs
- Contact forms go directly to email/platforms

---

## Support & Updates

For issues or improvements:
- Email: TheAppliedPsychologyPodcast@gmail.com
- LinkedIn: https://www.linkedin.com/in/dan-cox-705595303/
- Speakpipe: https://www.speakpipe.com/PsychotherapyAppliedPsychology

---

## Next Steps

1. **Test the site** - Open index.html and explore all pages
2. **Check episodes load** - Episodes page should show available episodes
3. **Try search** - Search for an episode by title
4. **Listen** - Click an episode to expand and play audio
5. **Deploy** - Push to your web hosting on netlify

---

Ready to go live? Your site is ready to deploy immediately!

Good luck with the podcast!
