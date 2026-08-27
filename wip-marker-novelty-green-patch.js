(() => {
  if (document.getElementById('wip-marker-novelty-green-style')) return;
  const style = document.createElement('style');
  style.id = 'wip-marker-novelty-green-style';
  style.textContent = `
    .wip-marker-new{box-shadow:0 0 0 4px rgba(22,163,74,.9),0 8px 22px rgba(22,163,74,.36)!important}
    .wip-marker-new-ring{border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,.24)!important}
  `;
  document.head.appendChild(style);
})();
