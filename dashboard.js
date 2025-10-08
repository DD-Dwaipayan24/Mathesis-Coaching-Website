document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("video-container");

  try {
    const res = await fetch("/videos");
    const videos = await res.json();

    if (videos.length === 0) {
      container.innerHTML = "<p>No videos available yet.</p>";
      return;
    }

    videos.forEach(video => {
      const card = document.createElement("div");
      card.classList.add("video-card");

      card.innerHTML = `
        <h3>${video.title}</h3>
        <iframe width="560" height="315" src="${video.url}" frameborder="0" allowfullscreen></iframe>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = "<p>⚠️ Error loading videos</p>";
    console.error(err);
  }
});
