const dropZone = document.querySelector(".drop-zone");
const navbar = document.querySelector(".navbar");
const actionBar = document.querySelector(".action-bar");
const itemsGrid = document.querySelector(".items-grid");
const breadcrumbsEl = document.querySelector(".breadcrumbs");
const actionsModal = document.querySelector(".create-modal");
const settingsModal = document.querySelector(".settings-modal");
const marginInput = settingsModal.querySelector(".item.margin input");

let currentItems = [];
let currentFolder = ROOT_FOLDER;
let darkTheme = load("darkTheme", true);
let selectedItem = null;
let isActionsHidden = load("isActionsHidden", false);
let margin = load("margin", 0);

document.addEventListener("DOMContentLoaded", async () => {
  openFolder(null);
  // updateUI();
  actionsModal.querySelectorAll(".item").forEach((el) => {
    el.addEventListener("click", () => toggleModal("create-modal", false));
  });
});

async function uploadFiles(files) {
  if (!files || files.length <= 0) return;

  files = Array.from(files);

  for (let i = 0; i < files.length; i++) {
    await uploadFile(files[i], currentFolder.id, loading)
  }
};

async function openFolder(folderId) {
  loading(0);
  currentFolder = await getFolder(folderId);
  loading(50);
  listFiles(folderId, displayItems);

  displayBreadcrumbs();

  loading(100);
  setTimeout(() => loading(null), 500);
}

function loading() {

}

function getFileHTML(file) {
  let icon = getIcon(file);

  return `
    <div class="item file" onclick="selectItem('${file.id}')" data-id="${file.id}">
      <img src="${icon}" class="icon">
      <p class="title">${file.name}</p>
    </div>
  `;
}

function getFolderHTML(folder) {
  let icon = "assets/images/folder.png";

  return `
    <div class="item folder" onclick="selectItem('${folder.id}')" data-id="${folder.id}">
      <img src="${icon}" class="icon">
      <p class="title">${folder.name}</p>
    </div>
  `;
}

async function createItemData(item = {}) {
  const itemData = {
    id: item.id || generateId(),
    order: currentItems.reduce((max, item) => Math.max(max, item.order), 0) + 1,
    name: item.name || "",
    type: item.type,
    parentId: item.parentId || currentFolder.id,
    path: item.path || [...currentFolder.path, { id: currentFolder.id, name: currentFolder.name }],
    icon: item.icon || null,
    lastModified: Date.now(),
  };

  switch (item.type) {
    case "shortcut":
      itemData.url = item.url || "";
      break;
    case "text":
      itemData.content = item.content || "";
      break;
    default:
      break;
  }

  return itemData;
}

function updateUI() {
  displayItems();
  displayBreadcrumbs();
  toggleActions(isActionsHidden);
  toggleTheme(darkTheme);
  updateMargin();
}

function getItem(itemId) {
  return currentItems.filter((item) => item.id === itemId)[0];
}

function createItem(itemData) {
  if (!itemData.name) return;

  currentItems.push(itemData);

  selectedItem = itemData.id;
  displayItems();
  Toast.show("Item created successfully.");
}

function updateItem(itemId, updates) {
  if (!updates.name) return;
  const item = getItem(itemId);
  const updatedItem = { ...item, ...updates };

  currentItems = currentItems.map((item) => (item.id === itemId ? updatedItem : item));
  displayItems();
  Toast.show("Item updated successfully.");
}

function sortItems(items) {
  return [...items].sort((a, b) => a.order - b.order);
}

function displayItems(items) {
  items.files = sortItems(items.files);
  items = items.folders.concat(items.files);

  itemsGrid.innerHTML = items.map((item) => (item.type === "folder" ? getFolderHTML(item) : getFileHTML(item))).join(" ") || `Folder is empty`;
}

function handleItem(itemId) {
  if (selectedItem === itemId) {
    const item = getItem(itemId);
    switch (item.type) {
      case "folder":
        openFolder(item.id);
        break;
      case "shortcut":
        if (!isValidUrl(item.url)) break;
        window.open(item.url, "_blank");
        break;
      case "text":
        ItemModal.openUpdate(item.id);
        break;
      default:
        break;
    }
  } else {
    selectItem(itemId);
  }
}

function selectItem(itemId) {
  deselectItem();
  selectedItem = itemId;
  document.querySelector(`[data-id="${selectedItem}"]`).classList.add("selected");
}

function deselectItem() {
  if (!selectedItem) return;
  document.querySelector(`[data-id="${selectedItem}"]`).classList.remove("selected");
  selectedItem = null;
}

function selectAdjacentItem(direction = 1) {
  const sorted = sortItems(currentItems);
  if (!selectedItem) selectedItem = sorted[0].id;

  const index = sorted.findIndex((item) => item.id === selectedItem);

  const item = sorted[index + direction];
  if (!item) return;

  selectItem(item.id);
}

function editItem() {
  if (!selectedItem) return;
  ItemModal.openUpdate(selectedItem);
}

function toggleTheme(force = undefined) {
  const checkbox = document.querySelector(".theme-checkbox");
  const descEl = document.querySelector(".theme-desc");
  force === undefined ? (darkTheme = !darkTheme) : (darkTheme = force);
  save("darkTheme", darkTheme);
  document.body.classList.toggle("dark-theme", darkTheme);
  checkbox.checked = darkTheme;
  descEl.textContent = darkTheme ? "Enabled" : "Disabled";
}

async function displayBreadcrumbs() {
  breadcrumbsEl.innerHTML = `<span onclick="openFolder(null)">Public Drive</span>`;

  if (currentFolder.type === "root") return;

  for (const folderId of currentFolder.path) {
    const folder = await getFolder(folderId);

    breadcrumbsEl.innerHTML += ` / <span onclick="openFolder('${folderId}')">${folder.name}<span>`;
  }

  breadcrumbsEl.innerHTML += `  / <span>${currentFolder.name}</span>`;
  breadcrumbsEl.scrollLeft = breadcrumbsEl.scrollWidth;
}

function changeMargin(value) {
  value = Math.max(0, Math.min(value, 500));
  margin = value;
  save("margin", margin);

  updateMargin();
}

function toggleModal(name, force) {
  const element = document.querySelector(`.modal.${name}`);
  if (!element) return;
  const shouldHide = force !== undefined ? !force : undefined;
  element.classList.toggle("hidden", shouldHide);
}

dropZone.ondragover = (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
};

dropZone.ondragleave = () => dropZone.classList.remove("dragover");

dropZone.ondrop = (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length <= 0) return;
  uploadFiles(e.dataTransfer.files);
};

function downloadItem() {
  if (!selectedItem) return;
  if (selectedItem.type !== "file") return;

  window.open(selectedItem.url, "_blank");
}

function deleteItem() {
  if (!selectedItem) return;

  if (selectedItem.type === "file") {
    deleteFile(selectedItem.id, loading);
  } else {
    deleteFolder(selectedItem.id, loading);
  }

  selectedItem = null;
  Toast.show("Item deleted successfully.");
}

function getIcon(file) {
  let icon = "assets/images/file.png";

  switch (file.fileType) {
    case "audio/mpeg":
    case "audio/ogg":
    case "audio/wav":
    case "audio/webm":
      icon = "assets/images/file-audio.png";
      break;
    case "image/jpeg":
    case "image/png":
    case "image/gif":
    case "image/webp":
      icon = file.url;
      break;
    case "video/mp4":
    case "video/webm":
    case "video/ogg":
      icon = "assets/images/file-video.png";
      break;
    case "text/plain":
      icon = "assets/images/file-text.png";
      break;
    case "text/html":
      icon = "assets/images/file-internet.png";
      break;
    case "application/zip":
    case "application/x-zip-compressed":
    case "multipart/x-zip":
      icon = "assets/images/file-zip.png";
      break;
    case "application/vnd.rar":
    case "application/x-rar-compressed":
    case "application/rar":
    case "application/x-compressed":
      icon = "assets/images/file-rar.png";
      break;
    default:
      break;
  }

  return icon;
}

const keyActions = {
  KeyF: toggleFullscreen,
  ArrowLeft: () => selectAdjacentItem(-1),
  ArrowRight: () => selectAdjacentItem(1),
};

document.addEventListener("keydown", (event) => {
  const action = keyActions[event.code];
  const isFocus = document.activeElement.matches("input, textarea");

  if (action && !isFocus) {
    event.preventDefault();
    action();
  }
});
