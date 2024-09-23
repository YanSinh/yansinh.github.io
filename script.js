// ======================= Dark Mode Toggle =======================

// Get the Dark Mode toggle button
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

// Function to toggle dark mode
function toggleDarkMode() {
  body.classList.toggle('dark-mode');

  // Save the user's preference in localStorage
  if (body.classList.contains('dark-mode')) {
    localStorage.setItem('theme', 'dark-mode');
    darkModeToggle.textContent = '☀️'; // Change icon to sun
    darkModeToggle.setAttribute('aria-label', 'Switch to Light Mode');
  } else {
    localStorage.setItem('theme', 'light-mode');
    darkModeToggle.textContent = '🌙'; // Change icon to moon
    darkModeToggle.setAttribute('aria-label', 'Switch to Dark Mode');
  }
}

// Event listener for Dark Mode toggle button
darkModeToggle.addEventListener('click', toggleDarkMode);

// Check for saved user preference on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark-mode') {
    body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️'; // Sun icon
    darkModeToggle.setAttribute('aria-label', 'Switch to Light Mode');
  } else {
    darkModeToggle.textContent = '🌙'; // Moon icon
    darkModeToggle.setAttribute('aria-label', 'Switch to Dark Mode');
  }
});

// ======================= Modal Management =======================

// Function to open a modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    body.style.overflow = 'hidden'; // Prevent background scrolling
  }
}

// Function to close a modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    body.style.overflow = 'auto'; // Restore background scrolling
  }
}

// Get modal elements
const imageModal = document.getElementById('image-modal');
const listModal = document.getElementById('list-modal');
const gameModal = document.getElementById('game-modal');
const lightbox = document.getElementById('lightbox');

// Get button elements
const viewImagesBtn = document.getElementById('view-images');
const viewListBtn = document.getElementById('view-list');
const playNowBtn = document.getElementById('play-now');

// Get close button elements inside modals
const closeImageModalBtn = imageModal.querySelector('.close-btn');
const closeListModalBtn = listModal.querySelector('.close-btn');
const closeGameModalBtn = gameModal.querySelector('.close-btn');
const closeLightboxBtn = lightbox.querySelector('.lightbox-close');

// Event listeners to open modals
viewImagesBtn.addEventListener('click', () => openModal('image-modal'));
viewListBtn.addEventListener('click', () => openModal('list-modal'));
playNowBtn.addEventListener('click', () => openModal('game-modal'));

// Event listeners to close modals
closeImageModalBtn.addEventListener('click', () => closeModal('image-modal'));
closeListModalBtn.addEventListener('click', () => closeModal('list-modal'));
closeGameModalBtn.addEventListener('click', () => closeModal('game-modal'));
closeLightboxBtn.addEventListener('click', () => closeModal('lightbox'));

// Close modals when clicking outside the modal content
window.addEventListener('click', (event) => {
  if (event.target === imageModal) {
    closeModal('image-modal');
  }
  if (event.target === listModal) {
    closeModal('list-modal');
  }
  if (event.target === gameModal) {
    closeModal('game-modal');
  }
  if (event.target === lightbox) {
    closeModal('lightbox');
  }
});

// ======================= Lightbox Functionality =======================

// Get the image gallery container
const imageGallery = imageModal.querySelector('.image-gallery');

// Get the lightbox image element
const lightboxImg = lightbox.querySelector('img');

// Event listener for image clicks in the gallery
imageGallery.addEventListener('click', (event) => {
  if (event.target.tagName === 'IMG') {
    const src = event.target.src;
    const alt = event.target.alt;
    lightboxImg.src = src;
    lightboxImg.alt = alt;
    openModal('lightbox');
  }
});

// ======================= Keyboard Accessibility =======================

// Close all modals when pressing the 'Esc' key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal('image-modal');
    closeModal('list-modal');
    closeModal('game-modal');
    closeModal('lightbox');
  }
});
