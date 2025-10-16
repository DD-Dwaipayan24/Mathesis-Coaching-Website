// List of courses with Vimeo IDs
// const videos = [
//   { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 1', vimeoId: '1126890140' },
//   { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 2', vimeoId: '1126892339' },
//   { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 3', vimeoId: '1126894648' },
//   { id: 'PDE and Complex Analysis', title: 'MAT 201 LECTURE 4', vimeoId: '1126899169' }
// ];
const fetch = require('node-fetch');
console.log(window.location.hostname);
// Load all courses and their videos
async function loadCourses() {
  const container = document.getElementById('video-container');
  if (!container) {
    console.warn('⚠️ No element with id "video-container" found.');
    return;
  }
  container.innerHTML = '<p>Loading your courses...</p>';

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://www.mathesis-coaching.com';
  // console.log('🌐 Using API URL:', API_URL);
  try {
    // 1️⃣ Fetch purchased courses
    const courseRes = await fetch(`${API_URL}/my-courses`, { credentials: 'include' });
    if (!courseRes.ok) throw new Error(`my-courses failed: ${courseRes.status}`);
    const courseData = await courseRes.json();
    console.log('📚 Purchased courses:', courseData);

    if (!courseData.success || !courseData.courses.length) {
      container.innerHTML = '<p>No purchased courses found.</p>';
      return;
    }

    container.innerHTML = ''; // clear loading message

    // 2️⃣ Loop through purchased courses
    for (const course of courseData.courses) {
      const courseDiv = document.createElement('div');
      courseDiv.className = 'course-section';
      courseDiv.innerHTML = `<h2>${escapeHtml(course.title)}</h2>`;
      container.appendChild(courseDiv);
      console.log(`🎓 Loading course: ${course.id}`);

      try {
        // 3️⃣ Check access for this course
        const accessRes = await fetch(`${API_URL}/check-access/${encodeURIComponent(course.id)}`, { credentials: 'include' });
        const accessData = await accessRes.json();
        console.log(`🔑 Access for ${course.id}:`, accessData);

        accessData.hasPaid = true; // TEMPORARY BYPASS FOR TESTING
        if (!accessData.hasPaid) {
          courseDiv.innerHTML += `<p class="locked">🔒 Locked — Please complete payment.</p>`;
          continue;
        }

        // 4️⃣ Fetch Vimeo videos for this course (folder)
        const videoRes = await fetch(`${API_URL}/vimeo-videos/${encodeURIComponent(course.vimeoFolderId)}`, { credentials: 'include' });
        if (!videoRes.ok) throw new Error('Failed to load videos');
        const videos = await videoRes.json();

        if (!videos.length) {
          courseDiv.innerHTML += `<p>No videos available yet.</p>`;
          continue;
        }

        // 5️⃣ Render each video securely
        const videoGrid = document.createElement('div');
        videoGrid.className = 'video-grid';

        videos.forEach(video => {
          const embedUrl = `https://player.vimeo.com/video/${encodeURIComponent(video.vimeoId)}?h=secure&autopause=0`;

          const videoCard = document.createElement('div');
          videoCard.className = 'video-card';
          videoCard.innerHTML = `
            <h3>${escapeHtml(video.title)}</h3>
            <div class="video-wrapper">
              <iframe
                src="${embedUrl}"
                loading="lazy"
                allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>
          `;
          videoGrid.appendChild(videoCard);
        });

        courseDiv.appendChild(videoGrid);

      } catch (err) {
        console.error(`Error loading videos for ${course.id}:`, err);
        courseDiv.innerHTML += `<p class="error">⚠️ Failed to load course videos.</p>`;
      }
    }

  } catch (err) {
    console.error('Error loading courses:', err);
    container.innerHTML = '<p>❌ Failed to load your dashboard. Please try again later.</p>';
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', loadCourses);

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
