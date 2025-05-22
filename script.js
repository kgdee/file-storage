const projectName = "file-storage";
const breadcrumbsEl = document.querySelector(".breadcrumbs");
const directoryEl = document.querySelector(".directory");
const fileUploadInput = document.querySelector(".file-upload input");
const progressModal = document.querySelector(".progress-modal");
const folderModal = document.querySelector(".folder-modal");
const textModal = document.querySelector(".text-modal");

let currentFolder = { id: null, name: "Public Drive", path: null, type: "root" };

let items = [];

let selectedItem = null;

let darkTheme = JSON.parse(localStorage.getItem(`${projectName}_darkTheme`)) || false;

document.addEventListener("DOMContentLoaded", function () {
  openFolder(null);
  toggleTheme(darkTheme);
});

function stopPropagation(event) {
  event.stopPropagation();
}

function displayFile(file) {
  let icon = getIcon(file);

  return `
    <div class="item file" onclick="selectItem('${file.id}')" data-id="${file.id}">
      <img src="${icon}" class="icon">
      <p class="title">${file.name}</p>
    </div>
  `;
}

function getIcon(file) {
  let icon = "images/file.png";

  switch (file.fileType) {
    case "audio/mpeg":
    case "audio/ogg":
    case "audio/wav":
    case "audio/webm":
      icon = "images/file-audio.png";
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
      icon = "images/file-video.png";
      break;
    case "text/plain":
      icon = "images/file-text.png";
      break;
    case "text/html":
      icon = "images/file-internet.png";
      break;
    case "application/zip":
    case "application/x-zip-compressed":
    case "multipart/x-zip":
      icon = "images/file-zip.png";
      break;
    case "application/vnd.rar":
    case "application/x-rar-compressed":
    case "application/rar":
    case "application/x-compressed":
      icon = "images/file-rar.png";
      break;
    default:
      break;
  }

  return icon;
}

function displayFolder(folder) {
  let icon = "images/folder.png";

  return `
    <div class="item folder" onclick="selectItem('${folder.id}')" data-id="${folder.id}">
      <img src="${icon}" class="icon">
      <p class="title">${folder.name}</p>
    </div>
  `;
}

async function refreshFiles(files) {
  items = files.folders.concat(files.files);

  if (items.length > 0) {
    directoryEl.innerHTML = items.map((item) => (item.type === "folder" ? displayFolder(item) : displayFile(item))).join(" ");
  } else {
    directoryEl.innerHTML = `Folder is empty`;
  }

  refreshSelection();
}

async function openFolder(folderId) {
  loading(0);
  currentFolder = await getFolder(folderId);
  loading(50);
  listFiles(folderId, refreshFiles);

  renderBreadcrumbs();

  loading(100);
  setTimeout(() => loading(null), 500);
}

// Function to render breadcrumbs
async function renderBreadcrumbs() {
  breadcrumbsEl.innerHTML = `<span onclick="openFolder(null)">Public Drive</span>`;

  if (currentFolder.type === "root") return;

  for (const folderId of currentFolder.path) {
    const folder = await getFolder(folderId);

    breadcrumbsEl.innerHTML += ` / <span onclick="openFolder('${folderId}')">${folder.name}<span>`;
  }

  breadcrumbsEl.innerHTML += `  / <span>${currentFolder.name}</span>`;
}

fileUploadInput.addEventListener("input", function () {
  const file = fileUploadInput.files[0];
  if (!file) return;
  uploadFile(file, currentFolder.id, loading);
});

async function selectItem(itemId) {
  if (selectedItem && selectedItem.id === itemId) {
    if (selectedItem.type === "file") {
      selectedItem.fileType === "text/plain" ? toggleTextModal("update") : downloadItem();
    } else {
      openFolder(itemId);
    }
    return;
  }

  const item = items.find((item) => item.id === itemId);
  selectedItem = item || null;

  refreshSelection();
}

function refreshSelection() {
  const selectedItemEls = document.querySelectorAll(".directory .item.selected");
  selectedItemEls.forEach((item) => {
    item.classList.remove("selected");
  });

  if (!selectedItem) return;

  selectedItem = items.find((item) => item.id === selectedItem.id);
  if (!selectedItem) return;
  const elementToSelect = document.querySelector(`[data-id="${selectedItem.id}"]`);
  elementToSelect.classList.add("selected");
}

document.addEventListener("click", (event) => {
  if (!directoryEl.contains(event.target) || event.target === directoryEl) selectItem(null);
});

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
}

function loading(progress) {
  const progressEl = document.querySelector(".progress-modal progress");
  const statusEl = document.querySelector(".progress-modal .status");

  if (typeof progress === "number" && !isNaN(progress)) {
    progressModal.classList.remove("hidden");
    progressEl.value = progress;
    statusEl.innerText = `${Math.round(progress)}%`;
  } else {
    progressModal.classList.add("hidden");
    progressEl.value = 0;
    statusEl.innerText = "";
  }
}

function toggleFolderModal() {
  folderModal.classList.toggle("hidden");
}

function handleCreateFolder() {
  const nameInput = folderModal.querySelector(".name-input");
  createFolder(nameInput.value, currentFolder.id, loading);

  nameInput.value = "";

  toggleFolderModal();
}

async function toggleTextModal(mode) {
  textModal.classList.toggle("hidden");
  const modalTitle = textModal.querySelector(".title");
  const nameInput = textModal.querySelector(".name-input");
  const contentInput = textModal.querySelector(".content-input");
  const submitButton = textModal.querySelector(".submit");
  const copyButton = textModal.querySelector(".copy");
  modalTitle.textContent = "Create new text";
  nameInput.value = "New Text";
  contentInput.value = "";
  submitButton.textContent = "Create";
  copyButton.textContent = "Paste";
  copyButton.onclick = async () => {
    const text = await navigator.clipboard.readText();
    contentInput.value = text;
  };

  if (!mode) return;

  if (mode === "update") {
    const textName = selectedItem.name.split(".")[0];
    nameInput.value = textName;
    modalTitle.textContent = `Update ${textName}`;
    submitButton.textContent = "Update";
    copyButton.textContent = "Copy";
    const response = await fetch(selectedItem.url);
    const textContent = await response.text();
    contentInput.value = textContent;

    copyButton.onclick = async () => {
      await navigator.clipboard.writeText(contentInput.value);
    };
  }

  submitButton.onclick = () => handleText(mode);
}

function handleText(mode) {
  const name = textModal.querySelector(".name-input").value;
  const content = textModal.querySelector(".content-input").value;

  if (mode === "create") {
    createTxt({ name: name, content: content }, currentFolder.id, loading);
  } else if (mode === "update") {
    updateTxt({ name: name, content: content }, selectedItem.id, loading);
  }

  toggleTextModal();
}

function toggleTheme(force = undefined) {
  const toggle = document.querySelector(".action-bar .theme");
  force === undefined ? (darkTheme = !darkTheme) : (darkTheme = force);
  localStorage.setItem(`${projectName}_darkTheme`, darkTheme);
  document.body.classList.toggle("dark-theme", darkTheme);
  toggle.innerHTML = darkTheme ? `<i class="bi bi-sun"></i>` : `<i class="bi bi-moon"></i>`;
}

window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`;
  console.error(error);
  alert(error);
});
