const dropZone = document.querySelector(".drop-zone");
const actionBar = document.querySelector(".action-bar");
const itemsGrid = document.querySelector(".items-grid");
const breadcrumbsEl = document.querySelector(".breadcrumbs");
const actionsModal = document.querySelector(".create-modal");
const settingsModal = document.querySelector(".settings-modal");
const marginInput = settingsModal.querySelector(".item.margin input");

let currentFolder = ROOT_FOLDER;
let currentItems = [];
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
    await uploadFile(files[i], currentFolder.id);
  }
}

async function openFolder(folderId) {
  deselectItems();
  loading(0);
  currentFolder = await getFolder(folderId);
  loading(50);
  listFiles(folderId, setItems);

  displayBreadcrumbs();

  loading(100);
  setTimeout(() => loading(null), 500);
}

function loading() {}

function getFileHTML(file) {
  let icon = getItemIcon(file);

  return `
    <div class="item file" onclick="handleItemClick('${file.id}')" data-id="${file.id}">
      <img src="${icon}" class="icon">
      <p class="title">${file.name}</p>
    </div>
  `;
}

function getFolderHTML(folder) {
  let icon = "assets/images/folder.png";

  return `
    <div class="item folder" onclick="handleItemClick('${folder.id}')" data-id="${folder.id}">
      <img src="${icon}" class="icon">
      <p class="title">${folder.name}</p>
    </div>
  `;
}

function updateUI() {
  displayItems();
  displayBreadcrumbs();
  toggleActions(isActionsHidden);
  toggleTheme(darkTheme);
  updateMargin();
}

function setItems(items) {
  currentItems = items;
  displayItems();
}

function getItem(itemId) {
  return currentItems.filter((item) => item.id === itemId)[0];
}

function displayItems() {
  currentItems = currentItems.folders.concat(currentItems.files);

  itemsGrid.innerHTML = currentItems.map((item) => (item.type === "folder" ? getFolderHTML(item) : getFileHTML(item))).join(" ") || `Folder is empty`;
}

function handleItemClick(itemId) {
  const item = getItem(itemId);

  if (selectedItem && item && selectedItem.id === item.id) {
    if (item.type === "folder") {
      openFolder(item.id);
    } else if (item.fileType.startsWith("text/")) {
      TextModal.openUpdate(item.id);
    }
  } else {
    selectItem(item);
  }
}

function selectItem(item) {
  deselectItems();
  selectedItem = item;
  itemsGrid.querySelector(`[data-id="${selectedItem.id}"]`).classList.add("selected");
}

function deselectItems() {
  if (!selectedItem) return;
  itemsGrid.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
  selectedItem = null;
}

function selectAdjacentItem(direction = 1) {
  if (!selectedItem) selectedItem = currentItems[0];

  const index = sorted.findIndex((item) => item.id === selectedItem);

  const item = sorted[index + direction];
  if (!item) return;

  selectItem(item.id);
}

function editItem() {
  if (!selectedItem) return;

  if (selectedItem.type === "folder") {
    FolderModal.openUpdate(selectedItem.id);
  } else if (selectedItem.fileType.startsWith("text/")) {
    TextModal.openUpdate(selectedItem.id);
  } else {
    Toast.show("Item editing is not available for selected item.");
  }
}

function createItemName(baseName) {
  let count = 1;
  let name;
  do {
    name = `${baseName}${count > 1 ? ` (${count})` : ""}`;
    count++;
  } while (currentItems.some((item) => item.name === `${name}.txt`));
  return name;
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
  breadcrumbsEl.innerHTML = `<span onclick="openFolder(null)">Root</span>`;

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
    deleteFile(selectedItem.id);
  } else {
    deleteFolder(selectedItem.id);
  }

  selectedItem = null;
  Toast.show("Item deleted successfully.");
}

function getItemIcon(item) {
  const fileType = item.fileType;

  if (fileType.startsWith("audio/")) return "assets/images/file-audio.png";
  if (fileType.startsWith("image/")) return item.url;
  if (fileType.startsWith("video/")) return "assets/images/file-video.png";
  if (fileType.startsWith("text/html")) return "assets/images/file-internet.png";
  if (fileType.startsWith("text/")) return "assets/images/file-text.png";
  if (fileType.startsWith("application/zip")) return "assets/images/file-zip.png";
  if (fileType.startsWith("application/vnd.rar")) return "assets/images/file-rar.png";

  return "assets/images/file.png";
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
