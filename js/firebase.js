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

  const docRef = db.collection("folders").doc(folderId);
  const doc = await docRef.get();

  if (doc.exists) {
    const docData = doc.data();

    const folder = { id: doc.id, name: docData.name, path: docData.path };

    return folder;
  }

  return null;
}

async function createFolder(folderData, parentFolderId) {
  loading(0);
  let path = [];

  if (parentFolderId) {
    const parentFolder = await getFolder(parentFolderId);
    path = [...parentFolder.path, parentFolderId];
  }

  loading(50);

  const folderRef = await db.collection("folders").add({
    name: folderData.name,
    icon: folderData.icon || null,
    parent: parentFolderId,
    path: path,
    type: "folder",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  notify("Folder created successfully.");
  loading(100);
  setTimeout(() => loading(null), 500);
}

async function updateFolder(folderId, folderData) {
  loading(0);

  const folderRef = db.collection("files").doc(folderId);

  await folderRef.update({
    name: folderData.name,
    icon: folderData.icon || null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  loading(100);
  notify("Folder updated successfully.");
  setTimeout(() => loading(null), 500);
}

async function deleteFolder(folderId) {
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
}

async function deleteFolderDoc(folderId) {
  const folderRef = db.collection("folders").doc(folderId);
  await folderRef.delete();
  notify("Folder deleted successfully.");
}

async function getFile(fileId) {
  const docRef = db.collection("files").doc(fileId);
  const doc = await docRef.get();

  if (doc.exists) {
    const docData = doc.data();
    return docData;
  }

  return null;
}

async function createFile(fileData) {
  loading(0);

  const fileRef = await db.collection("files").add({
    name: fileData.name,
    type: "file",
    icon: fileData.icon || null,
    content: fileData.content,
    folder: fileData.folder,
    fileType: fileData.fileType,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  loading(100);
  notify("File created successfully.");
  setTimeout(() => loading(null), 500);
}

async function updateFile(fileData) {
  loading(0);

  const fileRef = db.collection("files").doc(fileData.id);

  await fileRef.update({
    ...fileData,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  loading(100);
  notify("File updated successfully.");
  setTimeout(() => loading(null), 500);
}

async function deleteFile(fileId) {
  loading(0);
  const fileRef = db.collection("files").doc(fileId);
  await fileRef.delete();

  notify("File deleted successfully.");
  loading(100);
  setTimeout(() => loading(null), 500);
}

async function deleteFiles(folderId) {
  const query = db.collection("files").where("folder", "==", folderId);

  const querySnapshot = await query.get();

  querySnapshot.forEach((doc) => {
    deleteFile(doc.id, () => {});
  });
}

// Function to list folders and files in a specific folder
function listFiles(folderId, callback) {
  let result = { folders: [], files: [] };

  // Cleanup previous listeners
  if (currentListeners.foldersListener) currentListeners.foldersListener();
  if (currentListeners.filesListener) currentListeners.filesListener();

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
}
