export function showToast(message: string, duration: number = 2000) {
  // Remove any existing toasts
  const existing = document.querySelector('.saferoute-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'saferoute-toast fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg animate-fade-in';
  toast.innerHTML = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
