const storagePrefix = "file-storage_"
const breadcrumbsEl = document.querySelector(".breadcrumbs")
const directoryEl = document.querySelector(".directory")
// const createFolderForm = document.querySelector(".create-folder")
const fileUploadInput = document.querySelector(".file-upload input")
const progressModal = document.querySelector(".progress-modal")
const createFolderModal = document.querySelector(".create-folder-modal")
const createFolderForm = document.querySelector(".create-folder-modal form")
const createTxtModal = document.querySelector(".create-txt-modal")
const createTxtForm = document.querySelector(".create-txt-modal form")


let currentFolder = { id: null, name: "My Drive", path: null, type: "root" }

let items = []

let selectedItem = null

function stopPropagation(event) {
  event.stopPropagation()
}

function displayFile(file) {
  let icon = (isImage(file.name) && file.url) ? file.url : "images/file.png"
  
  return `
    <div class="item file" onclick="selectItem('${file.id}')" data-id="${file.id}">
      <img src="${icon}" class="icon">
      <p class="title">${file.name}</p>
    </div>
  `
}

function displayFolder(folder) {
  let icon = "images/folder.png"
  
  return `
    <div class="item folder" onclick="selectItem('${folder.id}')" data-id="${folder.id}">
      <img src="${icon}" class="icon">
      <p class="title">${folder.name}</p>
    </div>
  `
}

async function refreshFiles(files) {
  items = files.folders.concat(files.files)

  if (items.length > 0) {
    directoryEl.innerHTML = items.map(item => (
      item.type === "folder" ? displayFolder(item) : displayFile(item)
    )).join(" ")
  } else {
    directoryEl.innerHTML = `Folder is empty`
  }
}

function isImage(filename) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.tiff'];

  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

async function openFolder(folderId) {
  loading(0)
  currentFolder = await getFolder(folderId)
  loading(50)
  listFiles(folderId, refreshFiles)

  // console.log(currentFolder.path)
  renderBreadcrumbs()

  loading(100)
  setTimeout(()=>loading(null), 500);
}


// Function to render breadcrumbs
async function renderBreadcrumbs() {

  breadcrumbsEl.innerHTML = `<span onclick="openFolder(null)">My Drive</span>`

  if (currentFolder.type === "root") return

  for (const folderId of currentFolder.path) {
    const folder = await getFolder(folderId)
    
    breadcrumbsEl.innerHTML += ` / <span onclick="openFolder('${folderId}')">${folder.name}<span>`
  }

  breadcrumbsEl.innerHTML += `  / <span>${currentFolder.name}</span>`
}


createFolderForm.addEventListener("submit", function(e) {
  e.preventDefault()
  createFolder(createFolderForm.elements['folderName'].value, currentFolder.id, loading)
  createFolderForm.reset()
})

fileUploadInput.addEventListener("input", function() {
  const file = fileUploadInput.files[0]
  if (!file) return
  uploadFile(file, currentFolder.id, loading)
})

async function selectItem(itemId) {

  // double click on item
  if (selectedItem && selectedItem.id === itemId) {

    selectedItem.type === "file" ? downloadItem() : openFolder(itemId)

    return
  }

  if (selectedItem) {
    const element = document.querySelector(`[data-id="${selectedItem.id}"]`);
    element.classList.remove("selected")
  }

  const item = items.find(item => item.id === itemId)
  selectedItem = item

  const element = document.querySelector(`[data-id="${selectedItem.id}"]`);
  element.classList.add("selected")
}

function downloadItem() {
  if (!selectedItem) return
  if (selectedItem.type !== "file") return

  window.open(selectedItem.url, '_blank')
}

function deleteItem() {
  if (!selectedItem) return

  if (selectedItem.type === "file") {
    deleteFile(selectedItem.id, loading)
  } else {
    deleteFolder(selectedItem.id, loading)
  }

  selectedItem = null
}


openFolder(null)



function loading(progress) {

  const progressEl = document.querySelector(".progress-modal progress")
  const statusEl = document.querySelector(".progress-modal .status")

  if (typeof progress === 'number' && !isNaN(progress)) {
    progressModal.classList.remove("hidden")
    progressEl.value = progress
    statusEl.innerText = `${Math.round(progress)}%`;

  } else {
    progressModal.classList.add("hidden")
    progressEl.value = 0
    statusEl.innerText = ""
  }
}


function openCreateFolderModal() {
  createFolderModal.classList.toggle("hidden")
}

createFolderForm.addEventListener("submit", function(e) {
  e.preventDefault()

  createFolder(createFolderForm.elements['folderName'].value, currentFolder.id, loading)

  createFolderForm.reset()

  openCreateFolderModal()
})

function openCreateTxtModal() {
  createTxtModal.classList.toggle("hidden")
}

createTxtForm.addEventListener("submit", function(e) {
  e.preventDefault()

  const name = createTxtForm.elements['name'].value
  const content = createTxtForm.elements['content'].value

  createTxt({ name: name, content: content }, currentFolder.id, loading)

  createTxtForm.reset()

  openCreateTxtModal()
})




// document.addEventListener("keydown", function(event) {
//   if (event.key === " ") getFile("w7BTG0G5WiCH2v5PpsBI")
// })


window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`
  console.error(error)
  alert(error)
});
