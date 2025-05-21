const storagePrefix = "file-storage_";
const breadcrumbsEl = document.querySelector(".breadcrumbs");
const directoryEl = document.querySelector(".directory");
// const createFolderForm = document.querySelector(".create-folder")
const fileUploadInput = document.querySelector(".file-upload input");
const progressModal = document.querySelector(".progress-modal");
const createFolderModal = document.querySelector(".create-folder-modal");
const createFolderForm = document.querySelector(".create-folder-modal form");
const textModal = document.querySelector(".text-modal");

let currentFolder = { id: null, name: "My Drive", path: null, type: "root" };

let items = [];

let selectedItem = null;

function stopPropagation(event) {
  event.stopPropagation();
}

function displayFile(file) {
  let icon = getIcon(file)

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
      icon = "images/file-video.png"
      break;
    case "text/plain":
      icon = "images/file-text.png"
      break;
    case "text/html":
      icon = "images/file-internet.png"
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
  breadcrumbsEl.innerHTML = `<span onclick="openFolder(null)">My Drive</span>`;

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
      openFolder();
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

  const elementToSelect = document.querySelector(`[data-id="${selectedItem.id}"]`);
  elementToSelect.classList.add("selected");
}

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

openFolder(null);

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

function openCreateFolderModal() {
  createFolderModal.classList.toggle("hidden");
}

createFolderForm.addEventListener("submit", function (e) {
  e.preventDefault();

  createFolder(createFolderForm.elements["folderName"].value, currentFolder.id, loading);

  createFolderForm.reset();

  openCreateFolderModal();
});

async function toggleTextModal(mode) {
  textModal.classList.toggle("hidden");
  const modalTitle = textModal.querySelector(".title");
  const nameInput = textModal.querySelector(".name-input");
  const contentInput = textModal.querySelector(".content-input");
  const submitButton = textModal.querySelector(".submit");
  modalTitle.textContent = "Create new text";
  nameInput.value = "New Text";
  contentInput.value = "";
  submitButton.textContent = "Create";

  if (!mode) return;

  if (mode === "update") {
    const textName = selectedItem.name.split(".")[0];
    nameInput.value = textName;
    modalTitle.textContent = `Update ${textName}`;
    const response = await fetch(selectedItem.url);
    const textContent = await response.text();
    contentInput.value = textContent;
    submitButton.textContent = "Update";
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

// document.addEventListener("keydown", function(event) {
//   if (event.key === " ") getFile("w7BTG0G5WiCH2v5PpsBI")
// })

window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`;
  console.error(error);
  alert(error);
});
