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
  actionsModal.querySelectorAll(".item").forEach((el) => {
    el.addEventListener("click", () => toggleModal("create-modal", false));
  });
});

async function uploadFile(file) {
  let content = "";

  if (file.type.startsWith("text/")) content = await file.text();
  else if (file.type.startsWith("image/")) content = await handleImageFile(file, 512);
  else {
    if (!isWithinSizeLimit(file, 0.5)) {
      Toast.show(`Upload failed. The file exceeds 500KB limit`);
      return;
    }

    content = await getFileDataUrl(file);
  }

  const fileData = {
    name: file.name,
    content: content,
    folder: currentFolder.id,
    fileType: file.type,
  };

  await createFile(fileData);
}

async function uploadFiles(files) {
  if (!files || files.length <= 0) return;

  files = Array.from(files);

  for (let i = 0; i < files.length; i++) {
    uploadFile(files[i]);
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

function getFileHTML(item) {
  let icon = item.icon || getItemIcon(item);

  return `
    <div class="item file" onclick="handleItemClick('${item.id}')" data-id="${item.id}">
      <img src="${icon}" class="icon">
      <p class="title">${item.name}</p>
    </div>
  `;
}

function getFolderHTML(item) {
  let icon = item.icon || "assets/images/folder.png";

  return `
    <div class="item folder" onclick="handleItemClick('${item.id}')" data-id="${item.id}">
      <img src="${icon}" class="icon">
      <p class="title">${item.name}</p>
    </div>
  `;
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

  itemsGrid.innerHTML = currentItems.map((item) => (item.type === "folder" ? getFolderHTML(item) : getFileHTML(item))).join(" ") || `<span class="message">Folder is empty</span>`;
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
    Toast.show("Item editing is not available for the selected item.");
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
  const item = selectedItem;
  if (!item) return;
  if (item.type !== "file") return;

  if (item.fileType.startsWith("text/")) downloadText(item);
  else download(item.content, item.name);
}

function downloadText(item) {
  const blob = new Blob([item.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  download(url, item.name);
}

async function deleteItem() {
  if (!selectedItem) return;

  const confirmed = await ConfirmModal.confirmAction(`Delete "${selectedItem.name}"?`, "This action cannot be undone.");
  if (!confirmed) return false;

  if (selectedItem.type === "file") {
    deleteFile(selectedItem.id);
  } else {
    deleteFolder(selectedItem.id);
  }

  selectedItem = null;
}

function getItemIcon(item) {
  const fileType = item.fileType;

  if (fileType.startsWith("audio/")) return "assets/images/file-audio.png";
  if (fileType.startsWith("image/")) return item.content;
  if (fileType.startsWith("video/")) return "assets/images/file-video.png";
  if (fileType.startsWith("text/html")) return "assets/images/file-internet.png";
  if (fileType.startsWith("text/")) return "assets/images/file-text.png";
  if (isArchive(fileType)) return "assets/images/file-zip.png";

  return "assets/images/file.png";
}

function notify(message) {
  console.log(message);
  Toast.show(message);
}

function loading(progress) {
  const progressModal = document.querySelector(".progress-modal");
  const progressEl = progressModal.querySelector("progress");
  const statusEl = progressModal.querySelector(".status");

  const hasProgress = Number.isFinite(progress);

  progressModal.classList.toggle("hidden", !hasProgress);
  progressEl.value = hasProgress ? progress : 0;
  statusEl.innerText = hasProgress ? `${Math.round(progress)}%` : "";
}

async function handleImageFile(file, maxSize = 128) {
  const dataUrl = await getFileDataUrl(file);
  const img = await loadImage(dataUrl);

  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  // Draw on standard HTML canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  // Return Data URL (base64 string) directly
  const mimeType = file?.type || file?.mimeType || "image/png";
  return canvas.toDataURL(mimeType);
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
