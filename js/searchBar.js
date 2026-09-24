const SearchBar = (() => {
  const element = document.querySelector(".search-bar");
  const searchBoxes = document.querySelectorAll(".search-box");
  const clearBtns = document.querySelectorAll(".search .clear-btn");

  function search(terms) {
    const query = terms.trim().toLowerCase();
    const results = query ? currentItems.filter((item) => item.name.toLowerCase().includes(query)) : null;
    displayItems(results);

    searchBoxes.forEach((el) => (el.querySelector("input").value = terms));
    clearBtns.forEach((el) => (el.innerHTML = query ? `<i class="bi bi-x-lg"></i>` : `<i class="bi bi-search"></i>`));
  }

  function clear() {
    search("");
  }

  function toggle() {
    const navbar = document.querySelector(".navbar");
    if (navbar.classList.contains("search")) clear();
    navbar.classList.toggle("search");
  }

  return { search, toggle, clear };
})();
