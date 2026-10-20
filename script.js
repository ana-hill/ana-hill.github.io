// You shouldn't need to edit this file. Add photos in events.js instead.
document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const settle = "cubic-bezier(0.32, 0.72, 0, 1)"; // critically damped feel, no overshoot
const photos = window.PHOTOS || [];

// ---------- Footer year ----------
document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Nav: hairline only once content scrolls under it ----------
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- Gallery ----------
const gallery = document.getElementById("gallery");
const cameraIcon =
  '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-1.8A1.5 1.5 0 0 1 9.7 3.5h4.6a1.5 1.5 0 0 1 1.2.7L16.7 6h1.8A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.5"/></svg>';

if (photos.length === 0) {
  // Placeholder tiles until real photos are added
  for (let i = 0; i < 6; i++) {
    const tile = document.createElement("div");
    tile.className = "tile empty reveal";
    tile.innerHTML = `${cameraIcon}<span>Event photo</span>`;
    gallery.appendChild(tile);
  }
} else {
  photos.forEach((photo, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile reveal";
    tile.setAttribute("aria-label", `Open photo: ${photo.caption || "event photo " + (index + 1)}`);
    const img = document.createElement("img");
    img.loading = index < 3 ? "eager" : "lazy";
    img.src = `photos/${photo.file}`;
    img.alt = photo.caption || "";
    tile.appendChild(img);
    if (photo.caption) {
      const label = document.createElement("span");
      label.className = "tile-label";
      label.textContent = photo.caption;
      tile.appendChild(label);
    }
    tile.addEventListener("click", () => openViewer(index));
    gallery.appendChild(tile);
  });
}

// ---------- Photo viewer ----------
const viewer = document.getElementById("viewer");
const viewerImg = document.getElementById("viewer-img");
const viewerCaption = document.getElementById("viewer-caption");
const prevBtn = document.getElementById("viewer-prev");
const nextBtn = document.getElementById("viewer-next");
let current = 0;
let openedFrom = 0;

const tileImg = (i) => gallery.children[i] && gallery.children[i].querySelector("img");

function showPhoto() {
  const photo = photos[current];
  viewerImg.src = `photos/${photo.file}`;
  viewerImg.alt = photo.caption || `Event photo ${current + 1}`;
  const count = photos.length > 1 ? `${current + 1} of ${photos.length}` : "";
  viewerCaption.textContent = [photo.caption, count].filter(Boolean).join(" · ");
  prevBtn.hidden = nextBtn.hidden = photos.length < 2;
}

// Grow the photo out of the tile it came from, and shrink it back there on close
function flipFrom(rect) {
  const to = viewerImg.getBoundingClientRect();
  if (!rect || !to.width) return null;
  const dx = rect.left + rect.width / 2 - (to.left + to.width / 2);
  const dy = rect.top + rect.height / 2 - (to.top + to.height / 2);
  const s = Math.max(rect.width / to.width, rect.height / to.height);
  return viewerImg.animate(
    [{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.6 }, { transform: "none", opacity: 1 }],
    { duration: 420, easing: settle }
  );
}

function openViewer(index) {
  current = openedFrom = index;
  showPhoto();
  viewer.showModal();
  if (reduceMotion) return;
  const rect = tileImg(index).getBoundingClientRect();
  if (viewerImg.complete) flipFrom(rect);
  else viewerImg.addEventListener("load", () => flipFrom(rect), { once: true });
}

function closeViewer() {
  if (!viewer.open) return;
  const origin = tileImg(current);
  // Only fly back to the tile if it's on screen; otherwise just close
  const rect = origin && origin.getBoundingClientRect();
  const onScreen = rect && rect.bottom > 0 && rect.top < window.innerHeight;
  if (reduceMotion || !onScreen) return viewer.close();
  const anim = flipFrom(rect);
  if (!anim) return viewer.close();
  anim.reverse();
  anim.onfinish = () => viewer.close();
}

function step(dir) {
  current = (current + dir + photos.length) % photos.length;
  showPhoto();
  if (!reduceMotion) {
    viewerImg.animate(
      [{ transform: `translateX(${dir * 24}px)`, opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 320, easing: settle }
    );
  }
}

document.getElementById("viewer-close").addEventListener("click", closeViewer);
prevBtn.addEventListener("click", () => step(-1));
nextBtn.addEventListener("click", () => step(1));
viewer.addEventListener("cancel", (e) => { e.preventDefault(); closeViewer(); }); // Esc key
viewer.addEventListener("click", (e) => { if (e.target === viewer) closeViewer(); }); // tap outside photo
document.addEventListener("keydown", (e) => {
  if (!viewer.open || photos.length < 2) return;
  if (e.key === "ArrowRight") step(1);
  if (e.key === "ArrowLeft") step(-1);
});

// Swipe left/right between photos on phones
let touchX = null;
viewer.addEventListener("pointerdown", (e) => { touchX = e.clientX; });
viewer.addEventListener("pointerup", (e) => {
  if (touchX === null) return;
  const dx = e.clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 50 && photos.length > 1) step(dx < 0 ? 1 : -1);
});

// ---------- Scroll reveal ----------
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    }),
    { rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in"));
}
