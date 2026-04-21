"use strict";


const WHATSAPP_NUMBER = "56986121222"; 
const MENU_ENDPOINT   = "/.netlify/functions/get-menu";
const STORAGE_KEY     = "picoteo_cart_v2";
const FALLBACK_IMG    = "img/logo.png";


let allItems       = [];   
let filteredItems  = [];   
let activeCategory = "todos";
let searchTerm     = "";
let cart           = loadCart();


const menuGrid      = document.getElementById("menuGrid");
const categoryFilters = document.getElementById("categoryFilters");
const menuError     = document.getElementById("menuError");
const retryBtn      = document.getElementById("retryBtn");
const cartSidebar   = document.getElementById("cartSidebar");
const cartOverlay   = document.getElementById("cartOverlay");
const cartToggleBtn = document.getElementById("cartToggleBtn");
const cartCloseBtn  = document.getElementById("cartCloseBtn");
const cartBadge     = document.getElementById("cartBadge");
const cartItemsEl   = document.getElementById("cartItems");
const cartEmpty     = document.getElementById("cartEmpty");
const cartFooter    = document.getElementById("cartFooter");
const cartTotalEl   = document.getElementById("cartTotal");
const checkoutBtn   = document.getElementById("checkoutBtn");
const clearCartBtn  = document.getElementById("clearCartBtn");
const keepShoppingBtn = document.getElementById("keepShoppingBtn");
const toastEl       = document.getElementById("toast");
const searchInput   = document.getElementById("searchInput");


document.addEventListener("DOMContentLoaded", () => {
  fetchMenu();
  renderCart();
  bindCartEvents();

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      updateFilteredItems();
    });
  }
});


async function fetchMenu() {
  showSkeletons();
  menuError.classList.add("hidden");

  try {
    const res = await fetch(MENU_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.error) throw new Error(json.error);

    allItems = json.data || [];
    buildCategoryFilters();
    applyFilter("todos");
  } catch (err) {
    console.error("Error fetching menu:", err);
    menuGrid.innerHTML = "";
    menuError.classList.remove("hidden");
  }
}

retryBtn.addEventListener("click", fetchMenu);


function showSkeletons() {
  menuGrid.innerHTML = Array.from({ length: 6 })
    .map(() => `<div class="skeleton-card" aria-hidden="true"></div>`)
    .join("");
}


function buildCategoryFilters() {
  
  const seen = new Set();
  const categories = [];
  for (const item of allItems) {
    const cat = (item.categoria || "Otros").trim();
    if (!seen.has(cat)) { seen.add(cat); categories.push(cat); }
  }

  
  const existingDynamic = categoryFilters.querySelectorAll("[data-category]:not([data-category='todos'])");
  existingDynamic.forEach(b => b.remove());

  const todos = categoryFilters.querySelector("[data-category='todos']");

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.dataset.category = cat;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.id = `filter-${slugify(cat)}`;
    btn.textContent = categoryEmoji(cat) + " " + cat;
    btn.addEventListener("click", () => applyFilter(cat));
    categoryFilters.insertBefore(btn, todos.nextSibling);
  });

  
  todos.addEventListener("click", () => applyFilter("todos"), { once: false });
}

function applyFilter(category) {
  activeCategory = category;

  
  categoryFilters.querySelectorAll(".filter-btn").forEach(btn => {
    const isActive = btn.dataset.category === category;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  updateFilteredItems();
}

function updateFilteredItems() {
  let items = activeCategory === "todos"
    ? allItems
    : allItems.filter(i => (i.categoria || "Otros").trim() === activeCategory);

  if (searchTerm) {
    items = items.filter(i => 
      (i.platillo || "").toLowerCase().includes(searchTerm) || 
      (i.descripcion || "").toLowerCase().includes(searchTerm)
    );
  }

  filteredItems = items;
  renderMenuGrid();
}

function categoryEmoji(cat) {
  const map = {
    "ceviches": "🐟",
    "ceviche":  "🐟",
    "brasas":   "🔥",
    "brasa":    "🔥",
    "chifa":    "🍜",
    "sopas":    "🍲",
    "sopa":     "🍲",
    "entradas": "🥗",
    "entrada":  "🥗",
    "bebidas":  "🥤",
    "bebida":   "🥤",
    "postres":  "🍮",
    "postre":   "🍮",
    "parrilla": "🥩",
    "pollo":    "🍗",
    "pescado":  "🐠",
  };
  const key = Object.keys(map).find(k => cat.toLowerCase().includes(k));
  return key ? map[key] : "🍽️";
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}


function renderMenuGrid() {
  if (!filteredItems.length) {
    menuGrid.innerHTML = `
      <p style="color:var(--clr-text-muted);grid-column:1/-1;text-align:center;padding:3rem 0">
        No hay platos en esta categoría.
      </p>`;
    return;
  }

  menuGrid.innerHTML = filteredItems.map(item => buildCardHTML(item)).join("");

  menuGrid.querySelectorAll(".menu-card").forEach(card => {
    card.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-cart-btn");
      const id = card.dataset.id;
      const item = allItems.find(i => String(i.id) === id);
      
      if (btn) {
        if (item) addToCart(item);
      } else {
        if (item) openItemModal(item);
      }
    });
  });

  menuGrid.querySelectorAll(".card-img").forEach(img => {
    img.addEventListener("error", function () {
      this.src = FALLBACK_IMG;
    });
  });
}

function buildCardHTML(item) {
  const imgSrc  = item.imagen ? `img/${item.imagen}` : FALLBACK_IMG;
  const precio  = formatPrice(item.precio);
  const cat     = (item.categoria || "Otros").trim();
  const variant = item.variante ? `<p class="card-variant">✦ ${escHtml(item.variante)}</p>` : "";
  const desc    = item.descripcion
    ? `<p class="card-description">${escHtml(item.descripcion)}</p>` : "";

  return `
    <article class="menu-card" role="listitem" data-id="${escHtml(String(item.id))}">
      <div class="card-image-wrap">
        <img
          class="card-img"
          src="${escHtml(imgSrc)}"
          alt="${escHtml(item.platillo || "Plato")}"
          loading="lazy"
        />
        <span class="card-category-tag">${escHtml(cat)}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${escHtml(item.platillo || "Sin nombre")}</h3>
        ${desc}
        ${variant}
      </div>
      <div class="card-footer">
        <span class="card-price">${precio}</span>
        <button
          class="add-to-cart-btn"
          data-id="${escHtml(String(item.id))}"
          aria-label="Añadir ${escHtml(item.platillo || "plato")} al carrito"
        >
          ＋ Añadir
        </button>
      </div>
    </article>`;
}

function formatPrice(price) {
  if (price == null || price === "") return "—";
  const num = Number(price);
  if (isNaN(num)) return String(price);
  return new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", maximumFractionDigits: 0
  }).format(num);
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}




function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}


function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}


function addToCart(item) {
  const key = `${item.id}:${item.variante || ""}`;
  const existing = cart.find(e => e.key === key);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      key,
      id:       item.id,
      platillo: item.platillo,
      variante: item.variante || "",
      precio:   Number(item.precio) || 0,
      qty:      1,
    });
  }

  saveCart();
  renderCart();
  bumpBadge();
  showToast(`✅ ${item.platillo} añadido`);
}


function changeQty(key, delta) {
  const entry = cart.find(e => e.key === key);
  if (!entry) return;
  entry.qty += delta;
  if (entry.qty <= 0) cart = cart.filter(e => e.key !== key);
  saveCart();
  renderCart();
}


function clearCart() {
  cart = [];
  saveCart();
  renderCart();
  showToast("🗑️ Carrito vaciado");
}


function renderCart() {
  const total = cart.reduce((sum, e) => sum + e.precio * e.qty, 0);
  const count = cart.reduce((sum, e) => sum + e.qty, 0);

  
  cartBadge.textContent = count;

  
  const isEmpty = cart.length === 0;
  cartEmpty.style.display  = isEmpty ? "flex" : "none";
  cartFooter.style.display = isEmpty ? "none"  : "flex";

  
  cartTotalEl.textContent = formatPrice(total);

  
  if (isEmpty) {
    cartItemsEl.innerHTML = "";
    return;
  }

  cartItemsEl.innerHTML = cart.map(entry => `
    <div class="cart-item" role="listitem">
      <span class="cart-item-name">${escHtml(entry.platillo)}</span>
      ${entry.variante ? `<span class="cart-item-variant">✦ ${escHtml(entry.variante)}</span>` : ""}
      <div class="cart-qty-controls">
        <button
          class="qty-btn"
          data-key="${escHtml(entry.key)}"
          data-delta="-1"
          aria-label="Reducir cantidad de ${escHtml(entry.platillo)}"
        >−</button>
        <span class="qty-value">${entry.qty}</span>
        <button
          class="qty-btn"
          data-key="${escHtml(entry.key)}"
          data-delta="1"
          aria-label="Aumentar cantidad de ${escHtml(entry.platillo)}"
        >+</button>
      </div>
      <span class="cart-item-price">${formatPrice(entry.precio * entry.qty)}</span>
    </div>`).join("");

  
  cartItemsEl.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key   = btn.dataset.key;
      const delta = parseInt(btn.dataset.delta, 10);
      changeQty(key, delta);
    });
  });
}


function buildWhatsAppMessage() {
  const lines = ["Pedido – Picoteo de la Tía Luci", ""];

  cart.forEach(entry => {
    const sub = formatPrice(entry.precio * entry.qty);
    const variant = entry.variante ? ` (${entry.variante})` : "";
    lines.push(`• ${entry.qty}× ${entry.platillo}${variant} → ${sub}`);
  });

  const total = cart.reduce((s, e) => s + e.precio * e.qty, 0);
  lines.push("");
  lines.push(`Total: ${formatPrice(total)}`);
  lines.push("");
  lines.push("📍 Dirección de entrega: (escribe tu dirección aquí)");

  return encodeURIComponent(lines.join("\n"));
}

checkoutBtn.addEventListener("click", () => {
  if (!cart.length) { showToast("⚠️ Tu carrito está vacío"); return; }
  const msg = buildWhatsAppMessage();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank", "noopener,noreferrer");
  
  
  setTimeout(() => {
    clearCart();
    closeCart();
  }, 500);
});

clearCartBtn.addEventListener("click", clearCart);

if (keepShoppingBtn) {
  keepShoppingBtn.addEventListener("click", closeCart);
}


function openCart() {
  cartSidebar.classList.add("open");
  cartOverlay.classList.add("open");
  cartSidebar.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartSidebar.classList.remove("open");
  cartOverlay.classList.remove("open");
  cartSidebar.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function bindCartEvents() {
  cartToggleBtn.addEventListener("click", openCart);
  cartCloseBtn.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && cartSidebar.classList.contains("open")) closeCart();
  });
}


function bumpBadge() {
  cartBadge.classList.remove("bump");
  requestAnimationFrame(() => requestAnimationFrame(() => cartBadge.classList.add("bump")));
  cartBadge.addEventListener("animationend", () => cartBadge.classList.remove("bump"), { once: true });
}


let toastTimer;
function showToast(message, duration = 2500) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), duration);
}

// ==========================================
// MODAL DE DETALLE DEL PLATO
// ==========================================

const itemModalOverlay = document.getElementById("itemModalOverlay");
const itemModal        = document.getElementById("itemModal");
const modalCloseBtn    = document.getElementById("modalCloseBtn");
const modalImage       = document.getElementById("modalImage");
const modalCategory    = document.getElementById("modalCategory");
const modalTitle       = document.getElementById("modalTitle");
const modalVariant     = document.getElementById("modalVariant");
const modalDesc        = document.getElementById("modalDesc");
const modalPrice       = document.getElementById("modalPrice");
const modalAddBtn      = document.getElementById("modalAddBtn");

function openItemModal(item) {
  modalImage.src = item.imagen ? `img/${item.imagen}` : FALLBACK_IMG;
  modalImage.alt = item.platillo || "Plato";
  
  modalImage.onerror = () => { modalImage.src = FALLBACK_IMG; };

  modalCategory.textContent = (item.categoria || "Otros").trim();
  modalTitle.textContent = item.platillo || "Sin nombre";
  
  if (item.variante) {
    modalVariant.innerHTML = `✦ ${escHtml(item.variante)}`;
    modalVariant.style.display = "block";
  } else {
    modalVariant.style.display = "none";
  }
  
  if (item.descripcion) {
    modalDesc.innerHTML = escHtml(item.descripcion).replace(/(\r\n|\n|\r)/gm, "<br>");
    modalDesc.style.display = "block";
  } else {
    modalDesc.style.display = "none";
  }
  
  modalPrice.textContent = formatPrice(item.precio);
  
  modalAddBtn.onclick = () => {
    addToCart(item);
    closeItemModal();
  };
  
  itemModalOverlay.classList.add("open");
  itemModalOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeItemModal() {
  if (!itemModalOverlay.classList.contains("open")) return;
  itemModalOverlay.classList.remove("open");
  itemModalOverlay.setAttribute("aria-hidden", "true");
  
  if (!cartSidebar.classList.contains("open")) {
    document.body.style.overflow = "";
  }
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener("click", closeItemModal);
}

if (itemModalOverlay) {
  itemModalOverlay.addEventListener("click", (e) => {
    if (e.target === itemModalOverlay) closeItemModal();
  });
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && itemModalOverlay && itemModalOverlay.classList.contains("open")) {
    closeItemModal();
  }
});
