/* =========================================================================
   script.js — Điều khiển toàn bộ trang thuyết trình
   Không dùng framework — thuần JavaScript (Vanilla JS)
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     1. LẤY CÁC PHẦN TỬ DOM CẦN THIẾT
     --------------------------------------------------------------------- */
  const slidesEl   = document.getElementById('slides');
  const slides      = Array.from(document.querySelectorAll('.slide'));
  const total        = slides.length;

  const dotnavList  = document.getElementById('dotnavList');
  const progressFill = document.getElementById('progressFill');
  const progressEmber= document.getElementById('progressEmber');

  const prevBtn      = document.getElementById('prevBtn');
  const nextBtn       = document.getElementById('nextBtn');
  const curIndexEl    = document.getElementById('curIndex');
  const totalIndexEl  = document.getElementById('totalIndex');

  const autoplayBtn  = document.getElementById('autoplayBtn');
  const fullscreenBtn= document.getElementById('fullscreenBtn');

  const startBtn     = document.getElementById('startBtn');
  const backTopBtn   = document.getElementById('backTopBtn');

  let current = 0;               // slide hiện tại (0-based)
  let isAnimating = false;       // chặn spam trong lúc đang chuyển slide
  const ANIM_LOCK_MS = 900;      // phải >= thời gian transition trong CSS (0.85s)

  totalIndexEl.textContent = String(total).padStart(2, '0');

  /* ---------------------------------------------------------------------
     2. TẠO MENU ĐIỀU HƯỚNG (dot nav) TỪ data-title CỦA MỖI SLIDE
     --------------------------------------------------------------------- */
  slides.forEach((slide, i) => {
    const li = document.createElement('li');
    li.className = 'dotnav__item' + (i === 0 ? ' is-current' : '');

    const btn = document.createElement('button');
    btn.className = 'dotnav__link';
    btn.setAttribute('aria-label', 'Đi tới slide: ' + slide.dataset.title);
    btn.innerHTML =
      '<span class="dotnav__dot"></span>' +
      '<span class="dotnav__label">' + slide.dataset.title + '</span>';

    btn.addEventListener('click', () => goToSlide(i));
    li.appendChild(btn);
    dotnavList.appendChild(li);
  });
  const dotnavItems = Array.from(document.querySelectorAll('.dotnav__item'));

  /* ---------------------------------------------------------------------
     3. ĐIỀU HƯỚNG CHÍNH: goToSlide(index)
     --------------------------------------------------------------------- */
  function goToSlide(index) {
    if (index < 0 || index > total - 1) return;
    if (index === current && slides[0].classList.contains('is-active')) {
      // vẫn cho phép gọi lại slide 0 lần đầu
    }
    if (isAnimating) return;
    isAnimating = true;

    current = index;

    // Dịch chuyển container bằng transform (hiệu ứng Slide mượt)
    slidesEl.style.transform = 'translateY(-' + (current * 100) + 'vh)';

    // Cập nhật trạng thái active để kích hoạt reveal / fade / zoom của slide đó
    slides.forEach((s, i) => s.classList.toggle('is-active', i === current));

    // Cập nhật thanh tiến trình "nén hương"
    const pct = total > 1 ? (current / (total - 1)) * 100 : 0;
    progressFill.style.width = pct + '%';
    progressEmber.style.left = pct + '%';

    // Cập nhật menu điều hướng bên trái
    dotnavItems.forEach((it, i) => it.classList.toggle('is-current', i === current));

    // Cập nhật số đếm slide
    curIndexEl.textContent = String(current + 1).padStart(2, '0');

    // Lazy-load các ảnh của slide sắp tới / liền kề
    lazyLoadAround(current);

    setTimeout(() => { isAnimating = false; }, ANIM_LOCK_MS);
  }

  function nextSlide() { goToSlide(Math.min(current + 1, total - 1)); }
  function prevSlide() { goToSlide(Math.max(current - 1, 0)); }

  // Kích hoạt reveal cho slide đầu tiên ngay khi tải trang
  window.addEventListener('DOMContentLoaded', () => {
    slides[0].classList.add('is-active');
    lazyLoadAround(0);
  });

  /* ---------------------------------------------------------------------
     4. LAZY LOAD HÌNH ẢNH
     Ảnh dùng loading="lazy" gốc của trình duyệt cho mọi ảnh không phải bìa;
     ngoài ra ta chủ động "đánh thức" ảnh của slide hiện tại + lân cận bằng
     cách gán lại thuộc tính decoding/fetchpriority để trình duyệt ưu tiên.
     --------------------------------------------------------------------- */
  function lazyLoadAround(index) {
    [index - 1, index, index + 1].forEach((i) => {
      if (i < 0 || i > total - 1) return;
      const imgs = slides[i].querySelectorAll('img[loading="lazy"]');
      imgs.forEach((img) => {
        img.setAttribute('fetchpriority', i === index ? 'high' : 'low');
        img.setAttribute('decoding', 'async');
      });
    });
  }

  /* ---------------------------------------------------------------------
     5. NÚT NEXT / PREV / BẮT ĐẦU / QUAY VỀ ĐẦU
     --------------------------------------------------------------------- */
  nextBtn.addEventListener('click', nextSlide);
  prevBtn.addEventListener('click', prevSlide);
  startBtn.addEventListener('click', () => goToSlide(1));
  backTopBtn.addEventListener('click', () => goToSlide(0));

  /* ---------------------------------------------------------------------
     6. PHÍM MŨI TÊN TRÁI / PHẢI (VÀ LÊN / XUỐNG)
     --------------------------------------------------------------------- */
  window.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
      e.preventDefault();
      nextSlide();
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'Home') {
      goToSlide(0);
    } else if (e.key === 'End') {
      goToSlide(total - 1);
    } else if (e.key.toLowerCase() === 'f') {
      toggleFullscreen();
    }
  });

  /* ---------------------------------------------------------------------
     7. CUỘN CHUỘT (WHEEL) — có throttle để mỗi lần cuộn chỉ chuyển 1 slide
     --------------------------------------------------------------------- */
  let wheelLock = false;
  window.addEventListener('wheel', (e) => {
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < 12) return; // bỏ qua rung nhẹ của trackpad
    wheelLock = true;
    if (e.deltaY > 0) nextSlide(); else prevSlide();
    setTimeout(() => { wheelLock = false; }, ANIM_LOCK_MS + 150);
  }, { passive: true });

  /* ---------------------------------------------------------------------
     8. VUỐT TRÊN ĐIỆN THOẠI (TOUCH SWIPE)
     --------------------------------------------------------------------- */
  let touchStartY = 0;
  let touchStartX = 0;

  window.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].clientY;
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    const dy = touchStartY - e.changedTouches[0].clientY;
    const dx = touchStartX - e.changedTouches[0].clientX;

    // Nếu di chuyển ngang nhiều hơn dọc → không tính là chuyển slide
    if (Math.abs(dx) > Math.abs(dy)) return;

    const SWIPE_THRESHOLD = 55;
    if (Math.abs(dy) < SWIPE_THRESHOLD) return;

    if (dy > 0) nextSlide(); else prevSlide();
  }, { passive: true });

  /* ---------------------------------------------------------------------
     9. CHẾ ĐỘ TỰ ĐỘNG TRÌNH CHIẾU (AUTOPLAY) — 5 giây / slide
     --------------------------------------------------------------------- */
  let autoplayTimer = null;
  let autoplayOn = false;
  const AUTOPLAY_MS = 5000;

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(() => {
      if (current === total - 1) { goToSlide(0); }
      else { nextSlide(); }
    }, AUTOPLAY_MS);
    autoplayOn = true;
    autoplayBtn.classList.add('is-on');
    autoplayBtn.querySelector('.icon-play').hidden = true;
    autoplayBtn.querySelector('.icon-pause').hidden = false;
  }

  function stopAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
    autoplayOn = false;
    autoplayBtn.classList.remove('is-on');
    autoplayBtn.querySelector('.icon-play').hidden = false;
    autoplayBtn.querySelector('.icon-pause').hidden = true;
  }

  autoplayBtn.addEventListener('click', () => {
    autoplayOn ? stopAutoplay() : startAutoplay();
  });

  // Tạm dừng autoplay nếu người dùng tự tương tác thủ công (next/prev/dotnav)
  [prevBtn, nextBtn].forEach((btn) =>
    btn.addEventListener('click', () => { if (autoplayOn) stopAutoplay(); })
  );
  dotnavList.addEventListener('click', () => { if (autoplayOn) stopAutoplay(); });
  window.addEventListener('wheel', () => { if (autoplayOn) stopAutoplay(); }, { passive: true });
  window.addEventListener('touchend', () => { if (autoplayOn) stopAutoplay(); }, { passive: true });

  /* ---------------------------------------------------------------------
     10. CHẾ ĐỘ TOÀN MÀN HÌNH (FULLSCREEN)
     --------------------------------------------------------------------- */
  function toggleFullscreen() {
    const doc = document;
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!isFs) {
      const el = doc.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el);
    } else {
      (doc.exitFullscreen || doc.webkitExitFullscreen || function(){}).call(doc);
    }
  }
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  /* ---------------------------------------------------------------------
     11. KHỞI TẠO BAN ĐẦU
     --------------------------------------------------------------------- */
  goToSlide(0);
  slides[0].classList.add('is-active'); // đảm bảo slide đầu hiện reveal ngay cả khi goToSlide(0) bị chặn do current đã = 0

})();
