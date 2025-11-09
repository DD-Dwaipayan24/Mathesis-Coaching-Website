
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

        // fetch materials list
         // ✅ 3️⃣ Declare and append materialsDiv BEFORE we use it
        const materialsDiv = document.createElement('div');
        materialsDiv.className = 'materials-section';
        materialsDiv.innerHTML = `<h3>📚 Course Materials</h3><p>Loading materials...</p>`;
        courseDiv.appendChild(materialsDiv);

        const matRes = await fetch(`${API_URL}/materials/${encodeURIComponent(course.title.trim())}/materials.json`);
        console.log(`🌐 Fetching materials from: ${API_URL}/materials/${encodeURIComponent(course.title.trim())}/materials.json`);
        if (!matRes.ok) {
          materialsDiv.innerHTML = `<h3>📚 Course Materials</h3><p class="locked">Unable to load materials.</p>`;
          continue;
        }
        const matData = await matRes.json();
        console.log(`📚 Materials data for course ${course.title.trim()}:`, matData);

        if (!matData.files?.length) {
          materialsDiv.innerHTML = `<h3>📚 Course Materials</h3><p>No materials available yet.</p>`;
          console.log(`No materials available for course ${course.title.trim()}`);
        } else {
          const grid = document.createElement('div');
          grid.className = 'material-grid';
          console.log(matData)
          matData.files.forEach(fileName => {
            const card = document.createElement('div');
            card.className = 'material-card';
            // Use iframe for quick view-only - pointer-events disabled by CSS
            card.innerHTML = `
              <div class="pdf-header">
                <p>${fileName.replace(".pdf", "")}</p>
                <button class="fullscreen-btn" title="View Fullscreen">⛶</button>
              </div>
              <iframe src="https://docs.google.com/gview?url=${API_URL}/materials/${encodeURIComponent(course.title.trim())}/${encodeURIComponent(fileName)}" class="pdf-viewer" loading="lazy"></iframe>
              <p>${escapeHtml(fileName)}</p>
            `;
            grid.appendChild(card);
          });
          // ✅ Attach fullscreen button event listeners AFTER cards are created
setTimeout(() => {
  document.querySelectorAll('.fullscreen-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const iframe = e.target.closest('.material-card').querySelector('.pdf-viewer');

      if (!document.fullscreenElement) {
        iframe.requestFullscreen().catch((err) => {
          alert(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    });
  });
}, 200);

          materialsDiv.innerHTML = `<h3>📚 Course Materials</h3>`;
          materialsDiv.appendChild(grid);
         }

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


async function loadMaterials() {
  const container = document.getElementById("materials-container");
  container.innerHTML = "<p>Loading materials...</p>";

  try {
    // Example API — you’ll replace with your backend endpoint
    const res = await fetch("/api/materials", { credentials: "include" });
    const data = await res.json();

    if (!data || data.length === 0) {
      container.innerHTML = "<p>No materials available yet.</p>";
      return;
    }

    container.innerHTML = data.map(material => `
      <div class="material-card ${material.locked ? 'locked' : ''}">
        <iframe src="${material.locked ? '' : material.pdfUrl}"></iframe>
        <div class="material-info">
          <h3>${material.courseName}</h3>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error("Failed to load materials:", err);
    container.innerHTML = "<p>Unable to load course materials.</p>";
  }
}



// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadCourses();
  loadMaterials();
});

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