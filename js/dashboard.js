// List of courses with Vimeo IDs
// const videos = [
//   { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 1', vimeoId: '1126890140' },
//   { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 2', vimeoId: '1126892339' },
//   { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 3', vimeoId: '1126894648' },
//   { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 4', vimeoId: '1126899169' }
// ];


// Load all courses and check access
async function loadVideos() {
  const container = document.getElementById('video-container');
  if (!container) {
    console.warn('No element with id "video-container" found. Aborting loadVideos.');
    return;
  }
  container.innerHTML = '<p>Loading your courses...</p>';

    try {
      const API_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://mathesis-coaching-website.onrender.com/';
      
      const res = await fetch(`${API_URL}/my-courses`, {
      credentials: 'include', // ✅ send session cookies
    });
      if (!res.ok) throw new Error(`check-access failed: ${res.status}`);

    const data = await res.json();
    container.innerHTML = ''; // clear loading text

    if (!data.success || !data.courses) {
      container.innerHTML = `
        <div class="no-courses">
          <p>😕 You haven't purchased any courses yet.</p>
          <a href="/courses.html" class="btn">Browse Courses</a>
        </div>`;
      return;
    }

    // 2️⃣ Loop through all courses
    for (let video of data.allCourses) {
      const div = document.createElement('div');
      div.className = 'video-card';

      // Defensive check for hasPaid flag
      if (data.success && data.courses.length > 0) {
        const embedUrl = `https://player.vimeo.com/video/${encodeURIComponent(video.vimeoId)}?fl=pl&fe=sh`;
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
        // Locked + Request Access
        div.innerHTML = `
          <h3>${escapeHtml(video.title)}</h3>
          <p class="locked">🔒 Locked — Please request access.</p>
          <button class="buy-button">Request Access</button>
        `;
        container.appendChild(div);

        const btn = div.querySelector('.buy-button');
        if (btn) btn.addEventListener('click', () => requestAccess(video.id));
      }
    }
  } catch (err) {
    console.error('🔥 Error loading dashboard:', err);
    container.innerHTML = `<p class="error">Failed to load your courses. Please try again later.</p>`;
  }
}

// === Request Access for Locked Course ===
async function requestAccess(courseId) {
  try {
    const API_URL = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://mathesis-coaching-website.onrender.com';

    const res = await fetch(`${API_URL}/request-access/${encodeURIComponent(courseId)}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) throw new Error(`request-access failed: ${res.status}`);
    const data = await res.json();

    alert(data?.message || 'Access request sent successfully!');
  } catch (err) {
    console.error('Error requesting access:', err);
    alert('Failed to send access request. Please try again later.');
  }
}

// === Escape HTML Helper ===
function escapeHtml(str) {
  return String(str).replace(/[&<>"'`]/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
  }[s]));
}

// === Init Dashboard on Load ===
document.addEventListener('DOMContentLoaded', loadVideos);