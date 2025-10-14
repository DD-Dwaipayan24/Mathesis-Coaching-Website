// List of courses with Vimeo IDs
const videos = [
  { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 1', vimeoId: '1126890140' },
  { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 2', vimeoId: '1126892339' },
  { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 3', vimeoId: '1126894648' },
  { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 4', vimeoId: '1126899169' }
];


// Load all courses and check access
async function loadVideos() {
  const container = document.getElementById('video-container');
  if (!container) {
    console.warn('No element with id "video-container" found. Aborting loadVideos.');
    return;
  }
  container.innerHTML = '';

  for (let video of videos) {
    try {
      const res = await fetch(`/check-access/${encodeURIComponent(video.id)}`);
      if (!res.ok) throw new Error(`check-access failed: ${res.status}`);

      // defensive parse
      let data;
      try { data = await res.json(); } catch (e) { throw new Error('Invalid JSON from check-access'); }

      const div = document.createElement('div');
      div.className = 'video-card';

      if (data.hasPaid) {
        const embedUrl = `https://player.vimeo.com/video/${encodeURIComponent(video.vimeoId)}?fl=pl&fe=sh`;
        // Show Vimeo iframe if user has access
        div.innerHTML = `
          <h3>${escapeHtml(video.title)}</h3>
          <div class="video-wrapper">
            <iframe
              src="${embedUrl}"
              loading="lazy"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>`;
        container.appendChild(div);
      } else {
        // Show locked message and request access button
        div.innerHTML = `
          <h3>${escapeHtml(video.title)}</h3>
          <p class="locked">🔒 Locked — Please request access.</p>
          <button class="buy-button">Request Access</button>
        `;
        container.appendChild(div);

        // attach event listener instead of inline onclick to avoid escaping issues
        const btn = div.querySelector('.buy-button');
        if (btn) btn.addEventListener('click', () => requestAccess(video.id));
      }
    } catch (err) {
      console.error(`Error loading course ${video.id}:`, err);
      // append an error card so the user sees something
      const errDiv = document.createElement('div');
      errDiv.className = 'video-card error';
      errDiv.innerHTML = `<h3>${escapeHtml(video.title)}</h3><p class="small">Failed to load this course.</p>`;
      container.appendChild(errDiv);
    }
  }
}

// Function to request access for a course
async function requestAccess(courseId) {
  try {
    const res = await fetch(`/request-access/${encodeURIComponent(courseId)}`, { method: 'POST' });
    if (!res.ok) throw new Error(`request-access failed: ${res.status}`);
    const data = await res.json();
    alert(data && data.message ? data.message : 'Request sent');
  } catch (err) {
    console.error('Error requesting access:', err);
    alert('Failed to send access request');
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', loadVideos);

// Small helper to avoid inserting raw HTML from data (very simple)
function escapeHtml(str) {
  return String(str).replace(/[&<>"'`]/g, function (s) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;'
    })[s];
  });
}
