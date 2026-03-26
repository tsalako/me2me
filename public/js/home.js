const btn = document.getElementById("new-topic-btn");

if (btn) {
  btn.addEventListener("click", async () => {
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
