async function handleGoogleCredentialResponse(response) {
  const res = await fetch("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: response.credential }),
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Sign-in failed.");
    return;
  }

  window.location.href = data.redirectTo || "/";
}

window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;
