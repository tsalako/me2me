const topicSelect = document.getElementById("topic-select");
const newTopicBtn = document.getElementById("new-topic-inline-btn");
const form = document.getElementById("entry-form");
const statusEl = document.getElementById("form-status");
const visibilityToggle = document.getElementById("visibility-toggle");
const visibilityInput = document.getElementById("visibility-input");
const feed = document.getElementById("feed");
const topicPage = document.querySelector("[data-topic-page]");

if (topicSelect) {
  topicSelect.addEventListener("change", () => {
    window.location.href = topicSelect.value;
  });
}

if (newTopicBtn) {
  newTopicBtn.addEventListener("click", async () => {
    const title = window.prompt("New topic title:");
    if (!title || !title.trim()) return;

    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to create topic.");
      return;
    }
    window.location.href = data.path;
  });
}

if (visibilityToggle) {
  visibilityToggle.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-visibility]");
    if (!btn) return;
    visibilityInput.value = btn.dataset.visibility;
    visibilityToggle.querySelectorAll(".segment").forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
  });
}

function scrollFeedToBottom() {
  if (!feed) return;
  feed.scrollTop = feed.scrollHeight;
}

if (topicPage?.dataset.mode === "live") {
  window.addEventListener("load", scrollFeedToBottom);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (form && topicPage?.dataset.isOwner === "true") {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusEl.textContent = "Posting…";

    const topicId = topicPage.dataset.topicId;
    const mode = topicPage.dataset.mode;
    const content = document.getElementById("entry-content").value.trim();
    const entryDateInput = document.getElementById("entry-date");

    const payload = {
      content,
      mode,
      visibility: visibilityInput.value,
      entryDate: entryDateInput ? entryDateInput.value : null,
    };

    const res = await fetch(`/api/topics/${topicId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.error || "Failed to post.";
      return;
    }

    if (mode === "live") {
      const entry = data.entry;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `
        <article class="entry-card">
          <p class="entry-content">${escapeHtml(entry.content)}</p>
          <div class="entry-meta">
            <span>${escapeHtml(entry.createdAtLabel)}</span>
            <span class="visibility-badge ${escapeHtml(entry.visibility)}">${escapeHtml(entry.visibility)}</span>
          </div>
        </article>
      `;
      const empty = feed.querySelector(".empty-state");
      if (empty) empty.remove();
      feed.appendChild(wrapper.firstElementChild);
      scrollFeedToBottom();
    } else {
      window.location.reload();
      return;
    }

    form.reset();
    visibilityInput.value = "public";
    visibilityToggle?.querySelectorAll(".segment").forEach((el) => el.classList.remove("active"));
    visibilityToggle?.querySelector('[data-visibility="public"]')?.classList.add("active");
    statusEl.textContent = "Posted.";
  });
}
