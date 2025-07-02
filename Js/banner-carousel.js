// banner-carousel.js
// Carrusel tipo Amazon para la tienda Brothers

const bannerImages = [
    'Images/carrucel.jpg',
    'Images/carrucel_1.jpg',
    'Images/carrucel_2.jpg'
];

let currentBanner = 0;
let bannerInterval = null;

function updateBannerCarousel() {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.banner-dot');
    slides.forEach((slide, idx) => {
        slide.classList.toggle('active', idx === currentBanner);
    });
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentBanner);
    });
    // Desplazamiento fluido
    const track = document.querySelector('.banner-carousel-track');
    if (track) {
        track.style.transform = `translateX(-${currentBanner * 100}%)`;
    }
}

function nextBanner() {
    currentBanner = (currentBanner + 1) % bannerImages.length;
    updateBannerCarousel();
}

function prevBanner() {
    currentBanner = (currentBanner - 1 + bannerImages.length) % bannerImages.length;
    updateBannerCarousel();
}

function goToBanner(idx) {
    currentBanner = idx;
    updateBannerCarousel();
}

function startBannerCarousel() {
    if (bannerInterval) clearInterval(bannerInterval);
    bannerInterval = setInterval(() => {
        nextBanner();
    }, 5000);
}
function restartBannerCarousel() {
    startBannerCarousel();
}
function stopBannerCarousel() {
    if (bannerInterval) clearInterval(bannerInterval);
}

window.addEventListener('DOMContentLoaded', () => {
    // Eventos de flechas
    document.querySelector('.banner-arrow.prev').onclick = () => { prevBanner(); restartBannerCarousel(); };
    document.querySelector('.banner-arrow.next').onclick = () => { nextBanner(); restartBannerCarousel(); };
    // Eventos de dots
    document.querySelectorAll('.banner-dot').forEach(dot => {
        dot.onclick = () => { goToBanner(Number(dot.dataset.dotIndex)); restartBannerCarousel(); };
    });
    // Drag/swipe para móvil y desktop
    const track = document.querySelector('.banner-carousel-track');
    let startX = 0, isDragging = false;
    track.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.pageX;
        track.style.cursor = 'grabbing';
    });
    track.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.pageX - startX;
        if (Math.abs(dx) > 40) {
            if (dx > 0) prevBanner();
            else nextBanner();
            restartBannerCarousel();
            isDragging = false;
            track.style.cursor = '';
        }
    });
    track.addEventListener('mouseup', () => { isDragging = false; track.style.cursor = ''; });
    track.addEventListener('mouseleave', () => { isDragging = false; track.style.cursor = ''; });
    // Touch
    track.addEventListener('touchstart', e => { isDragging = true; startX = e.touches[0].clientX; });
    track.addEventListener('touchmove', e => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        if (Math.abs(dx) > 40) {
            if (dx > 0) prevBanner();
            else nextBanner();
            restartBannerCarousel();
            isDragging = false;
        }
    });
    track.addEventListener('touchend', () => { isDragging = false; });
    // Pausa en hover
    const bannerContainer = document.querySelector('.banner-container');
    if (bannerContainer) {
        bannerContainer.addEventListener('mouseenter', stopBannerCarousel);
        bannerContainer.addEventListener('mouseleave', startBannerCarousel);
    }
    updateBannerCarousel();
    startBannerCarousel();
});
