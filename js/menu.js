let currentRestaurant = null;
let categories = [];
let menuItems = [];
let selectedCategory = "all";
let deliveryType = "Retirada";

const cart = {};
let selectedItem = null;
let selectedQty = 1;

// ─── INIT ───
async function initApp() {
  await loadRestaurant();
  if (!currentRestaurant) return;
  await loadCategories();
  await loadItems();
  renderCategories();
  renderMenu();
  setupEvents();
}

// ─── DADOS ───
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
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:12px;background:#0a0a0a">
        <span style="font-size:2.5rem">⚠️</span>
        <p style="color:#888;font-family:sans-serif;margin:0">Cardápio indisponível no momento.</p>
      </div>`;
    return;
  }
  currentRestaurant = data;
  document.getElementById("restaurant-name").textContent = data.name;
  document.getElementById("restaurant-city").textContent = data.city || "";
}

async function loadCategories() {
  const { data } = await supabaseClient
    .from("categories").select("*")
    .eq("restaurant_id", currentRestaurant.id)
    .order("sort_order");
  categories = data || [];
}

async function loadItems() {
  const { data } = await supabaseClient
    .from("menu_items").select("*")
    .eq("restaurant_id", currentRestaurant.id)
    .eq("available", true)
    .order("sort_order");
  menuItems = data || [];
}

// ─── RENDER ───
function renderCategories() {
  const box = document.getElementById("categories");
  box.innerHTML = `<button class="category-btn active" onclick="filterCategory('all', this)">Todos</button>`;
  categories.forEach(cat =>
    box.innerHTML += `<button class="category-btn" onclick="filterCategory('${cat.id}', this)">${cat.name}</button>`
  );
}

function filterCategory(categoryId, btn) {
  selectedCategory = categoryId;
  document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderMenu();
}

function renderMenu() {
  const menu = document.getElementById("menu");
  const filtered = selectedCategory === "all"
    ? menuItems
    : menuItems.filter(i => i.category_id === selectedCategory);

  if (!filtered.length) {
    menu.innerHTML = `<p style="color:#888;text-align:center;padding:2rem">Nenhum item disponível.</p>`;
    return;
  }

  menu.innerHTML = filtered.map(item => {
    const inCart = cart[item.id] ? cart[item.id].qty : 0;
    return `
      <article class="item-card${inCart ? ' in-cart' : ''}" onclick="openProductModal('${item.id}')">
        <div class="item-info">
          <h3>${item.name}</h3>
          ${item.description ? `<p>${item.description}</p>` : ""}
          <span class="price">${formatPrice(item.price)}</span>
          ${inCart ? `<span class="cart-badge">${inCart} no pedido</span>` : ""}
        </div>
        ${item.image_url ? `<img src="${item.image_url}" class="item-img" alt="${item.name}" loading="lazy">` : ""}
      </article>`;
  }).join("");
}

// ─── MODAL PRODUTO ───
function openProductModal(itemId) {
  selectedItem = menuItems.find(i => i.id === itemId);
  selectedQty = cart[itemId] ? 1 : 1;

  document.getElementById("product-name").textContent = selectedItem.name;
  document.getElementById("product-description").textContent = selectedItem.description || "";
  document.getElementById("product-price").textContent = formatPrice(selectedItem.price);
  document.getElementById("product-qty").textContent = selectedQty;

  const imgEl = document.getElementById("product-img");
  if (selectedItem.image_url) {
    imgEl.src = selectedItem.image_url;
    imgEl.style.display = "block";
  } else {
    imgEl.style.display = "none";
  }

  document.getElementById("product-modal").classList.remove("hidden");
}

// ─── CARRINHO ───
function addToCart() {
  if (!selectedItem) return;
  const id = selectedItem.id;
  if (!cart[id]) {
    cart[id] = { id, name: selectedItem.name, price: Number(selectedItem.price), qty: 0 };
  }
  cart[id].qty += selectedQty;
  updateFooter();
  renderMenu();
  document.getElementById("product-modal").classList.add("hidden");
}

function removeFromCart(id) {
  delete cart[id];
  updateFooter();
  renderOrderItems();
  renderMenu();
  if (!Object.keys(cart).length) {
    document.getElementById("order-modal").classList.add("hidden");
  }
}

function updateFooter() {
  let total = 0, count = 0;
  Object.values(cart).forEach(i => { total += i.price * i.qty; count += i.qty; });
  const btn = document.getElementById("whatsapp-btn");
  btn.textContent = count
    ? `🛒 ${count} item${count > 1 ? 's' : ''} · ${formatPrice(total)}`
    : "🍔 Fazer Pedido";
}

// ─── MODAL PEDIDO ───
function renderOrderItems() {
  const box = document.getElementById("order-items");
  let total = 0;
  const items = Object.values(cart);

  if (!items.length) { box.innerHTML = ""; return; }

  box.innerHTML = items.map(i => {
    total += i.price * i.qty;
    return `
      <div class="order-item">
        <div class="order-item-info">
          <span class="order-item-qty">${i.qty}x</span>
          <span class="order-item-name">${i.name}</span>
        </div>
        <div class="order-item-right">
          <span class="order-item-price">${formatPrice(i.price * i.qty)}</span>
          <button class="order-item-remove" onclick="removeFromCart('${i.id}')">✕</button>
        </div>
      </div>`;
  }).join("") + `
    <div class="order-total-row">
      <span>Total</span>
      <span>${formatPrice(total)}</span>
    </div>`;
}

function openOrderModal() {
  if (!Object.keys(cart).length) {
    alert("Adicione itens ao pedido primeiro.");
    return;
  }
  renderOrderItems();
  document.getElementById("order-modal").classList.remove("hidden");
}

// ─── ENTREGA / RETIRADA ───
function setDelivery(type) {
  deliveryType = type;
  document.getElementById("btn-retirada").classList.toggle("active", type === "Retirada");
  document.getElementById("btn-entrega").classList.toggle("active", type === "Entrega");
  document.getElementById("address-box").style.display = type === "Entrega" ? "block" : "none";
}

// ─── TROCO ───
function handlePaymentChange() {
  const payment = document.getElementById("payment-method").value;
  document.getElementById("troco-box").style.display = payment === "Dinheiro" ? "block" : "none";
}

// ─── FINALIZAR ───
function finishOrder() {
  const name = document.getElementById("customer-name").value.trim();
  const payment = document.getElementById("payment-method").value;
  const troco = document.getElementById("troco-valor").value.trim();
  const obs = document.getElementById("obs").value.trim();

  if (!name) { alert("Informe seu nome."); return; }
  if (!payment) { alert("Escolha a forma de pagamento."); return; }

  if (deliveryType === "Entrega") {
    const rua = document.getElementById("addr-rua").value.trim();
    const num = document.getElementById("addr-num").value.trim();
    const bairro = document.getElementById("addr-bairro").value.trim();
    if (!rua || !num || !bairro) { alert("Preencha rua, número e bairro."); return; }
  }

  // Montar itens
  let total = 0;
  let itens = "";
  Object.values(cart).forEach(i => {
    total += i.price * i.qty;
    itens += `  ${i.qty}x ${i.name} - ${formatPrice(i.price * i.qty)}\n`;
  });

  // Pagamento
  let pgto = `Pagamento: ${payment}`;
  if (payment === "Dinheiro" && troco) {
    pgto += `\nTroco para: R$ ${parseFloat(troco).toFixed(2).replace(".", ",")}`;
    const trocoVal = parseFloat(troco) - total;
    if (trocoVal > 0) pgto += ` (troco: ${formatPrice(trocoVal)})`;
  }

  // Endereço
  let entrega = "";
  if (deliveryType === "Entrega") {
    const rua = document.getElementById("addr-rua").value.trim();
    const num = document.getElementById("addr-num").value.trim();
    const bairro = document.getElementById("addr-bairro").value.trim();
    const comp = document.getElementById("addr-comp").value.trim();
    entrega = `Entrega\nEndereco: ${rua}, ${num} - ${bairro}${comp ? ` (${comp})` : ""}`;
  } else {
    entrega = "Retirada no local";
  }

  // Montar mensagem
  let msg = "";
  msg += `NOVO PEDIDO - ${currentRestaurant.name}\n`;
  msg += `================================\n`;
  msg += `${itens}`;
  msg += `--------------------------------\n`;
  msg += `Total: ${formatPrice(total)}\n`;
  msg += `================================\n`;
  msg += `${pgto}\n`;
  msg += `${entrega}\n`;
  if (obs) msg += `Obs: ${obs}\n`;
  msg += `================================\n`;
  msg += `Nome: ${name}`;

  window.open(`https://wa.me/${currentRestaurant.phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ─── EVENTOS ───
function setupEvents() {
  document.getElementById("whatsapp-btn").addEventListener("click", openOrderModal);
  document.getElementById("close-modal-btn").addEventListener("click", () =>
    document.getElementById("order-modal").classList.add("hidden"));
  document.getElementById("close-product-btn").addEventListener("click", () =>
    document.getElementById("product-modal").classList.add("hidden"));
  document.getElementById("finish-order-btn").addEventListener("click", finishOrder);
  document.getElementById("plus-qty").addEventListener("click", () => {
    selectedQty++;
    document.getElementById("product-qty").textContent = selectedQty;
  });
  document.getElementById("minus-qty").addEventListener("click", () => {
    if (selectedQty > 1) selectedQty--;
    document.getElementById("product-qty").textContent = selectedQty;
  });
  document.getElementById("add-product-btn").addEventListener("click", addToCart);
  document.getElementById("payment-method").addEventListener("change", handlePaymentChange);
}

window.filterCategory = filterCategory;
window.openProductModal = openProductModal;
window.removeFromCart = removeFromCart;
window.setDelivery = setDelivery;

initApp();
