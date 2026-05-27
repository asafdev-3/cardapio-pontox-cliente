function formatPrice(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get("r") || DEFAULT_SLUG;
}
