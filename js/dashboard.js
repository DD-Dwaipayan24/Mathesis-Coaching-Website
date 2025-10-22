
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
    // console.log('📚 Purchased courses:', courseData.courses[0]);

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

      try {
        // 3️⃣ Check access for this course
        const accessRes = await fetch(`${API_URL}/check-access/${encodeURIComponent(course.courseId)}`, { credentials: 'include' });
        const accessData = await accessRes.json();

        // console.log(`🔐 Access data for course:`, accessData);
        
        // accessData.hasPaid = true; // TEMPORARY BYPASS FOR TESTING
        if (!accessData.hasPaid) {
          courseDiv.innerHTML += `<p class="locked">🔒 Locked — Please complete payment.</p>`;
          continue;
        }
        console.log(`✅ Access granted for course ${course.folderId}`);
        // 4️⃣ Fetch Vimeo videos for this course (folder)
        const videoRes = await fetch(`${API_URL}/vimeo-videos/${encodeURIComponent(course.folderId)}`, { credentials: 'include' });
        // console.log(`🌐 Fetching videos from: ${API_URL}/vimeo-videos/${encodeURIComponent(course.folderId)}`);
    
        if (!videoRes.ok) throw new Error('Failed to load videos');
        const videos = await videoRes.json();
        // console.log(`🎞️ Videos fetched for course ${course.id}:`, videos);

        let videoList = Array.isArray(videos.videos) ? videos.videos : videos;

    
        
        if (!videos) {
          courseDiv.innerHTML += `<p>No videos available yet.</p>`;
          continue;
        }

       
        // 🔹 ADD THIS SORTING BLOCK HERE
        videoList.sort((a, b) => a.title.localeCompare(b.title));



        // 5️⃣ Render each video securely
        const videoGrid = document.createElement('div');
        if (!videoGrid) {
          courseDiv.innerHTML += `<p>Failed to create video grid element.</p>`;
          // console.warn('⚠️ Failed to create video grid element.');
          continue;
        }
        videoGrid.className = 'video-grid';

        console.log(`🎬 Found ${videoList.length} videos for course ${course.id}`);
        videoList.forEach(video => {
          const embedUrl = video.embedUrl;
          // console.log('▶️ Embedding video URL:', embedUrl);

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
        if (!videos.videos.length) {
          courseDiv.innerHTML += `<p>No videos available yet always.</p>`;
          continue;
        }

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
