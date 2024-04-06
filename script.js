const storagePrefix = "file-storage_"
const breadcrumbsEl = document.querySelector(".breadcrumbs")
const directoryEl = document.querySelector(".directory")
const createFolderForm = document.querySelector(".create-folder")
const fileUploadInput = document.querySelector(".file-upload input")
const createTxtModal = document.querySelector(".create-txt-modal")
const createTxtForm = document.querySelector(".create-txt-modal form")


let currentFolder = { id: null, name: "My Drive", path: null, type: "root" }

function stopPropagation(event) {
  event.stopPropagation()
}

function displayFile(file) {
  let icon = (isImage(file.name) && file.url) ? file.url : "images/file.png"
  
  return `
    <div class="item file">
      <img src="${icon}" class="icon">
      <p class="title">${file.name}</p>

      <div class="options" onclick="stopPropagation(event)">
        <a href="${file.url}" download="${file.name}" target="_blank"><i class="bi bi-cloud-arrow-down"></i></a>
        <button onclick="deleteFile('${file.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `
}

function displayFolder(folder) {
  let icon = "images/folder.png"
  
  return `
    <div class="item folder" onclick="openFolder('${folder.id}')">
      <img src="${icon}" class="icon">
      <p class="title">${folder.name}</p>

      <div class="options" onclick="stopPropagation(event)">
        <button onclick="deleteFolder('${folder.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `
}

async function refreshFiles(files) {
  const items = files.folders.concat(files.files)

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
  currentFolder = await getFolder(folderId)

  listFiles(folderId, refreshFiles)

  // console.log(currentFolder.path)
  renderBreadcrumbs()
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
  createFolder(createFolderForm.elements['folderName'].value, currentFolder.id)
  createFolderForm.reset()
})

fileUploadInput.addEventListener("input", function() {
  uploadFile(fileUploadInput.files[0], currentFolder.id)
})


openFolder(null)


function openCreateTxtModal() {
  createTxtModal.classList.toggle("hidden")
}

createTxtForm.addEventListener("submit", function(e) {
  e.preventDefault()

  const fileName = createTxtForm.elements['fileName'].value + ".txt"
  const content = createTxtForm.elements['content'].value

  const file = new File([content], fileName, { type: "text/plain" });

  uploadFile(file, currentFolder.id);

  createTxtForm.reset()

  openCreateTxtModal()
})



window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`
  console.error(error)
  alert(error)
});