async function getCurrentUser() {
  const res = await fetch("/me", { credentials: "include" });
  return res.json();
}

async function logout() {
  await fetch("/logout", {
    method: "POST",
    credentials: "include"
  });
  location.reload();
}