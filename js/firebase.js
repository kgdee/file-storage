// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtcjeZJZZ-Cp1I6mMjnkDceafJb8VqiYk",
  authDomain: "file-storage-f993c.firebaseapp.com",
  projectId: "file-storage-f993c",
  storageBucket: "file-storage-f993c.firebasestorage.app",
  messagingSenderId: "1038771068830",
  appId: "1:1038771068830:web:10e0ef6c71eed2d5b8408f",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentListeners = {};

async function getFolder(folderId) {
  if (!folderId) return ROOT_FOLDER;

  try {
    const docRef = db.collection("folders").doc(folderId);
    const doc = await docRef.get();

    if (doc.exists) {
      const docData = doc.data();

      const folder = { id: doc.id, name: docData.name, path: docData.path };

      return folder;
    }

    return null;
  } catch (error) {
    console.error(error);
  }
}

async function createFolder(folder, parentFolderId) {
  try {
    loading(0);
    let path = [];

    if (parentFolderId) {
      const parentFolder = await getFolder(parentFolderId);
      path = [...parentFolder.path, parentFolderId];
    }

    loading(50);

    const folderRef = await db.collection("folders").add({
      name: folder.name,
      icon: folder.icon ? compressImageFile(folder.icon, 32) : null,
      parent: parentFolderId,
      path: path,
      type: "folder",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log("Folder created successfully.");
    loading(100);
    setTimeout(() => loading(null), 500);
  } catch (error) {
    console.error("Error creating folder: ", error);
  }
}

async function updateFolder(folderId, folder) {
  try {
    loading(0);

    const folderRef = db.collection("files").doc(folderId);

    await folderRef.update({
      name: folder.name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    loading(100);
    console.log("Folder updated successfully.");
    setTimeout(() => loading(null), 500);
  } catch (error) {
    console.error("Error updating file: ", error);
  }
}

async function deleteFolder(folderId) {
  try {
    loading(0);
    const query = db.collection("folders").where("path", "array-contains", folderId);

    const querySnapshot = await query.get();

    // Delete nested folders and its files
    for (let i = 0; i < querySnapshot.size; i++) {
      const doc = querySnapshot.docs[i];
      await deleteFiles(doc.id);
      await deleteFolderDoc(doc.id);

      loading((90 / querySnapshot.size) * (i + 1));
    }

    // Delete its files
    await deleteFiles(folderId);

    // Delete the folder
    await deleteFolderDoc(folderId);

    loading(100);
    setTimeout(() => loading(null), 500);
  } catch (error) {
    console.error(error);
  }
}

async function deleteFolderDoc(folderId) {
  try {
    const folderRef = db.collection("folders").doc(folderId);
    await folderRef.delete();
    console.log("Folder deleted successfully.");
  } catch (error) {
    console.error(error);
  }
}

async function getFile(fileId) {
  try {
    const docRef = db.collection("files").doc(fileId);
    const doc = await docRef.get();

    if (doc.exists) {
      const docData = doc.data();
      return docData;
    }

    return null;
  } catch (error) {
    console.error(error);
  }
}

async function uploadFile(file, folderId) {
  try {
    loading(0);

    const content = file.type.startsWith("text/") ? await file.text() : await getFileDataUrl(file);

    const fileRef = await db.collection("files").add({
      name: file.name,
      type: "file",
      content: content,
      folder: folderId,
      fileType: file.type,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    loading(100);
    console.log("File uploaded successfully.");
    setTimeout(() => loading(null), 500);
  } catch (error) {
    console.error("Error uploading file:", error);
  }
}

async function updateFile(fileId, file) {
  try {
    loading(0);

    const fileRef = db.collection("files").doc(fileId);

    await fileRef.update({
      name: file.name,
      content: await getFileDataUrl(file),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    loading(100);
    console.log("File updated successfully.");
    setTimeout(() => loading(null), 500);
  } catch (error) {
    console.error("Error updating file: ", error);
  }
}

async function deleteFile(fileId) {
  try {
    loading(0);
    const fileRef = db.collection("files").doc(fileId);
    await fileRef.delete();

    console.log("File deleted successfully.");
    loading(100);
    setTimeout(() => loading(null), 500);
  } catch (error) {
    console.error(error);
  }
}

async function deleteFiles(folderId) {
  try {
    const query = db.collection("files").where("folder", "==", folderId);

    const querySnapshot = await query.get();

    querySnapshot.forEach((doc) => {
      deleteFile(doc.id, () => {});
    });
  } catch (error) {
    console.error(error);
  }
}

// Function to list folders and files in a specific folder
function listFiles(folderId, callback) {
  let result = { folders: [], files: [] };

  // Cleanup previous listeners
  if (currentListeners.foldersListener) currentListeners.foldersListener();
  if (currentListeners.filesListener) currentListeners.filesListener();

  try {
    // Listen for changes to the folders collection
    const foldersListener = db
      .collection("folders")
      .where("parent", "==", folderId)
      .onSnapshot((querySnapshot) => {
        result.folders = [];
        querySnapshot.forEach((doc) => {
          const folderData = doc.data();
          result.folders.push({ id: doc.id, ...folderData });
        });
        callback(result);
      });

    // Listen for changes to the files collection
    const filesListener = db
      .collection("files")
      .where("folder", "==", folderId)
      .onSnapshot((querySnapshot) => {
        result.files = [];
        querySnapshot.forEach((doc) => {
          const fileData = doc.data();
          result.files.push({ id: doc.id, ...fileData });
        });
        callback(result);
      });

    currentListeners = { foldersListener, filesListener };
  } catch (error) {
    console.error(error);
  }
}

async function createTxt(data, folderId) {
  const { name, content } = data;

  loading(0);

  const file = new File([content], `${name}.txt`, { type: "text/plain" });

  await uploadFile(file, folderId, () => {});

  loading(100);
  setTimeout(() => loading(null), 500);
}

async function updateTxt(fileId, data) {
  const { name, content } = data;

  if (!content) return;

  loading(0);

  const file = new File([content], `${name}.txt`, { type: "text/plain" });

  await updateFile(fileId, file, () => {});

  loading(100);
  setTimeout(() => loading(null), 500);
}

async function compressImageFile(file, maxSize = 128) {
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
