// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "",
//   authDomain: "",
//   projectId: "",
//   storageBucket: "",
//   messagingSenderId: "",
//   appId: ""
// };

const app = firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

let currentListeners = {}

// function addData() {
//   db.collection("users").add({
//     first: "Ada",
//     last: "Lovelace2",
//     born: 1815
//   })
//   .then((docRef) => {
//     console.log("Document written with ID: ", docRef.id);
//   })
//   .catch((error) => {
//     console.error("Error adding document: ", error);
//   });
// }
// addData()

async function getFolder(folderId) {
  if (!folderId) return { id: null, name: "My Drive", path: null, type: "root" }

  try {
    const docRef = db.collection("folders").doc(folderId)
    const doc = await docRef.get()
  
    if (doc.exists) {
      const docData = doc.data()
  
      const folder = { id: doc.id, name: docData.name, path: docData.path }

      return folder
    }
  
    return null 

  } catch (error) {
    console.error(error)
  }
}

async function createFolder(folderName, parentFolderId) {
  try {
    let path = []

    if (parentFolderId) {
      const parentFolder = await getFolder(parentFolderId)
      path = [ ...parentFolder.path, { id: parentFolderId, name: parentFolder.name } ]
    }

    const folderRef = await db.collection("folders").add({
      name: folderName,
      parent: parentFolderId,
      path: path,
      type: "folder",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Folder created with ID: ", folderRef.id);
    return folderRef.id;
  } catch (error) {
    console.error("Error creating folder: ", error);
  }
}

async function uploadFile(file, folderId) {
  try {
    const fileRef = storage.ref().child(`files/${file.name}`);
    await fileRef.put(file);
    const fileUrl = await fileRef.getDownloadURL();
    await db.collection("files").add({
      name: file.name,
      url: fileUrl,
      folder: folderId,
      type: "file",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("File uploaded successfully.");
  } catch (error) {
    console.error("Error uploading file: ", error);
  }
}


// // Example usage
// async function exampleUsage() {
//   // Create a folder named "Documents" in the root directory
//   const documentsFolderId = await createFolder("Documents", null);

//   // Upload a file named "example.txt" to the "Documents" folder
//   const exampleFile = new File(["Hello, World!"], "example.txt", { type: "text/plain" });
//   await uploadFile(exampleFile, documentsFolderId);
// }


// Function to list folders and files in a specific folder
function listFoldersAndFiles(folderId, callback) {
  let result = []

  // Cleanup previous listeners
  if (currentListeners.foldersListener) currentListeners.foldersListener()
  if (currentListeners.filesListener) currentListeners.filesListener()

  try {
    // Listen for changes to the folders collection
    const foldersListener = db.collection("folders").where("parent", "==", folderId)
    .onSnapshot((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const folderData = doc.data();
        result.push({ id: doc.id, name: folderData.name, type: folderData.type })
      });
      callback(result)
    });
    
    // Listen for changes to the files collection
    const filesListener = db.collection("files").where("folder", "==", folderId)
    .onSnapshot((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const fileData = doc.data();
        result.push({ id: doc.id, name: fileData.name, url: fileData.url, type: fileData.type })
      });
      callback(result)
    });
    
    currentListeners = { foldersListener, filesListener }

  } catch (error) {
    console.error(error);
  }
}

// // Example usage: List folders and files in the "Documents" folder
// async function exampleList() {
//   const documentsFolderId = "rcQ1Z8LReblD5ZwNEkih"
//   await listFoldersAndFiles(documentsFolderId);
// }

