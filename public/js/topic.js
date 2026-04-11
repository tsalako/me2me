(() => {
  const page = document.querySelector("[data-topic-page]");
  if (!page) return;

  const topicId = page.dataset.topicId;
  const mode = page.dataset.mode;
  const isOwner = page.dataset.isOwner === "true";

  const feed = document.getElementById("feed");
  const topicSelect = document.getElementById("topic-select");
  const form = document.getElementById("entry-form");
  const textarea = document.getElementById("entry-content");
  const formStatus = document.getElementById("form-status");
  const visibilityInput = document.getElementById("visibility-input");
  const visibilityToggle = document.getElementById("visibility-toggle");
  const editingEntryIdInput = document.getElementById("editing-entry-id");
  const editingRow = document.getElementById("editing-row");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const submitBtn = document.getElementById("submit-btn");
  const minutesDateInput = document.getElementById("entry-date");
  const minutesDateWrap = document.getElementById("minutes-date-wrap");
  const liveEditDateInput = document.getElementById("live-edit-date");
  const liveEditDateWrap = document.getElementById("live-edit-date-wrap");

  if (topicSelect) {
    topicSelect.addEventListener("change", () => {
      window.location.href = topicSelect.value;
    });
  }

  function setVisibility(value) {
    visibilityInput.value = value;
    visibilityToggle?.querySelectorAll("[data-visibility]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.visibility === value);
    });
  }

  visibilityToggle?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-visibility]");
    if (!btn) return;
    setVisibility(btn.dataset.visibility);
  });

  function isEditing() {
    return !!editingEntryIdInput?.value;
  }

  function resetComposer() {
    editingEntryIdInput.value = "";
    textarea.value = "";
    submitBtn.textContent = "post";
    editingRow?.classList.add("hidden");
    formStatus.textContent = "";
    setVisibility("public");

    if (mode === "minutes" && minutesDateInput) {
      // leave current date as-is
    }

    liveEditDateWrap?.classList.add("hidden");
    if (mode === "minutes") {
      minutesDateWrap?.classList.remove("hidden");
    }
  }

  function startEditFromCard(card) {
    const id = card.dataset.entryId;
    const sourceEl = card.querySelector(".entry-source");
    const content = sourceEl ? JSON.parse(sourceEl.textContent || "\"\"") : "";
    const visibility = card.dataset.entryVisibility || "public";
    const entryDate = card.dataset.entryDate || "";

    editingEntryIdInput.value = id;
    textarea.value = content;
    submitBtn.textContent = "save";
    editingRow?.classList.remove("hidden");
    setVisibility(visibility);

    if (mode === "minutes") {
      minutesDateWrap?.classList.remove("hidden");
      if (minutesDateInput) minutesDateInput.value = entryDate || minutesDateInput.value;
    }

    if (mode === "live") {
      liveEditDateWrap?.classList.remove("hidden");
      if (liveEditDateInput) liveEditDateInput.value = entryDate || "";
    }

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  cancelEditBtn?.addEventListener("click", () => {
    resetComposer();
  });

  function closeAllMenus() {
    document.querySelectorAll("[data-entry-menu]").forEach((menu) => {
      menu.classList.add("hidden");
    });
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-entry-menu-trigger]");
    const menu = event.target.closest("[data-entry-menu]");

    if (trigger) {
      const card = trigger.closest(".entry-card");
      const targetMenu = card?.querySelector("[data-entry-menu]");
      const wasHidden = targetMenu?.classList.contains("hidden");
      closeAllMenus();
      if (targetMenu && wasHidden) targetMenu.classList.remove("hidden");
      return;
    }

    if (!menu) {
      closeAllMenus();
    }
  });

  feed?.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("[data-entry-edit]");
    const deleteBtn = event.target.closest("[data-entry-delete]");

    if (editBtn) {
      const card = editBtn.closest(".entry-card");
      closeAllMenus();
      if (card) startEditFromCard(card);
      return;
    }

    if (deleteBtn) {
      const card = deleteBtn.closest(".entry-card");
      const entryId = card?.dataset.entryId;
      if (!entryId) return;

      closeAllMenus();

      const confirmed = window.confirm("Delete this entry?");
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/entries/${entryId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete entry.");

        card?.remove();
        formStatus.textContent = "Entry deleted.";
        if (editingEntryIdInput.value === entryId) resetComposer();
      } catch (err) {
        formStatus.textContent = err.message || "Failed to delete entry.";
      }
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    formStatus.textContent = "";

    const content = textarea.value.trim();
    if (!content) {
      formStatus.textContent = "Post content is required.";
      return;
    }

    const editingId = editingEntryIdInput.value;
    const isUpdate = !!editingId;

    const payload = {
      content,
      visibility: visibilityInput.value,
      mode,
    };

    if (mode === "minutes" && minutesDateInput?.value) {
      payload.entryDate = minutesDateInput.value;
    }

    if (mode === "live" && isUpdate && liveEditDateInput?.value) {
      payload.entryDate = liveEditDateInput.value;
    }

    try {
      const res = await fetch(
        isUpdate ? `/api/entries/${editingId}` : `/api/topics/${topicId}/entries`,
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");

      // simplest reliable refresh for now
      window.location.reload();
    } catch (err) {
      formStatus.textContent = err.message || "Something went wrong.";
    }
  });

  function scrollFeedToBottom() {
    if (!feed) return;
    requestAnimationFrame(() => {
      feed.scrollTop = feed.scrollHeight;
    });
  }

  if (mode === "live") {
    scrollFeedToBottom();
    window.addEventListener("load", scrollFeedToBottom);
  }

  setVisibility("public");
})();