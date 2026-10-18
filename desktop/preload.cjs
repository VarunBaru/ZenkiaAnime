const { contextBridge, ipcRenderer } = require("electron");

let queuedCallback;
const callbackListeners = new Set();

ipcRenderer.on("auth:callback", (_event, payload) => {
  if (callbackListeners.size === 0) {
    queuedCallback = payload;
    return;
  }
  for (const listener of callbackListeners) listener(payload);
});

contextBridge.exposeInMainWorld("zenkiaDesktop", {
  openAuthUrl: (url) => ipcRenderer.invoke("auth:open-external", url),
  onAuthCallback: (callback) => {
    callbackListeners.add(callback);
    if (queuedCallback) {
      callback(queuedCallback);
      queuedCallback = undefined;
    }
    return () => callbackListeners.delete(callback);
  }
});
