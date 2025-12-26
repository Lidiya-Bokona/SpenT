function updateCountdown() {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const remaining = Math.floor((endOfDay - now) / 1000);
  document.getElementById('remaining').innerText = `$${remaining.toLocaleString()}`;
}

setInterval(updateCountdown, 1000);
