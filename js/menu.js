let currentRestaurant = null;
let categories = [];
let menuItems = [];
let selectedCategory = "all";

async function initApp() {
  await loadRestaurant();
  if (!currentRestaurant) return;
  await loadCategories();
  await loadItems();
  renderCategories();
  renderMenu();
}

async function loadRestaurant() {
  const slug = getSlug();
  const { data, error } = await supabaseClient
    .from("restaurants")
    .select("id, name, slug, phone, city, active")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error || !data) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888;flex-direction:column;gap:12px">
        <span style="font-size:2rem">⚠️</span>
        <p>Cardápio indisponível no momento.</p>
      </div>`;
    return;
  }
  currentRestaurant = data;
  document.getElementById("restaurant-name").textContent = data.name;
  document.getElementById("restaurant-city").textContent = data.city || "";
}

async function loadCategories() {
  const { data, error } = await supabaseClient
    .from("categories")
    .select("*")
    .eq("restaurant_id", currentRestaurant.id)
    .order("sort_order");
  if (!error) categories = data;
}

async function loadItems() {
  const { data, error } = await supabaseClient
    .from("menu_items")
    .select("*, categories(name)")
    .eq("restaurant_id", currentRestaurant.id)
    .eq("available", true)
    .order("sort_order");
  if (!error) menuItems = data;
}

function renderCategories() {
  const box = document.getElementById("categories");
  box.innerHTML = `<button class="category-btn active" onclick="filterCategory('all', this)">Todos</button>`;
  categories.forEach(cat => {
    box.innerHTML += `<button class="category-btn" onclick="filterCategory('${cat.id}', this)">${cat.name}</button>`;
  });
}

function filterCategory(categoryId, btn) {
  selectedCategory = categoryId;
  document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderMenu();
}

function renderMenu() {
  const menu = document.getElementById("menu");
  let filtered = selectedCategory === "all"
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategory);

  if (!filtered.length) {
    menu.innerHTML = `<p style="color:#888;text-align:center;padding:2rem">Nenhum item disponível.</p>`;
    return;
  }

  menu.innerHTML = filtered.map(item => `
    <article class="item-card">
      <div class="item-info">
        <h3>${item.name}</h3>
        ${item.description ? `<p>${item.description}</p>` : ""}
        <span class="price">${formatPrice(item.price)}</span>
      </div>
      ${item.image_url ? `<img src="${item.image_url}" class="item-img" alt="${item.name}" loading="lazy">` : ""}
    </article>
  `).join("");
}

document.getElementById("whatsapp-btn").addEventListener("click", () => {
  if (!currentRestaurant) return;
  const phone = currentRestaurant.phone;
  const msg = encodeURIComponent(`Olá! Vim pelo cardápio digital do ${currentRestaurant.name}. Quero fazer um pedido.`);
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
});

initApp();
