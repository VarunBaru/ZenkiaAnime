const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

const APP_URL = "https://zenkia-anime.vercel.app/";
const APP_ORIGIN = new URL(APP_URL).origin;
const PROTOCOL = "zenkia-anime:";
let mainWindow;
let queuedCallback;

const hasSingleInstance = app.requestSingleInstanceLock();
if (!hasSingleInstance) {
  app.quit();
} else {
  if (process.platform === "win32") {
    app.setAsDefaultProtocolClient("zenkia-anime");
  }

  app.on("second-instance", (_event, commandLine) => {
    const callback = commandLine.find((arg) => arg.startsWith(PROTOCOL));
    if (callback) handleAuthCallback(callback);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleAuthCallback(url);
  });

  ipcMain.handle("auth:open-external", async (event, rawUrl) => {
    if (new URL(event.senderFrame.url).origin !== APP_ORIGIN) {
      throw new Error("Sign-in request came from an untrusted page.");
    }

    const authUrl = new URL(rawUrl);
    if (
      authUrl.protocol !== "https:" ||
      !authUrl.hostname.endsWith(".supabase.co") ||
      authUrl.pathname !== "/auth/v1/authorize"
    ) {
      throw new Error("Refused an unexpected sign-in URL.");
    }

    await shell.openExternal(authUrl.toString());
  });

  function handleAuthCallback(rawUrl) {
    let callback;
    try {
      callback = new URL(rawUrl);
    } catch {
      return;
    }

    if (
      callback.protocol !== PROTOCOL ||
      callback.hostname !== "auth" ||
      callback.pathname !== "/callback"
    ) {
      return;
    }

    const code = callback.searchParams.get("code");
    const error =
      callback.searchParams.get("error_description") || callback.searchParams.get("error");
    if (!code && !error) return;

    queuedCallback = { code: code || undefined, error: error || undefined };
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("auth:callback", queuedCallback);
    }
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 900,
      minHeight: 620,
      backgroundColor: "#101113",
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("https://")) void shell.openExternal(url);
      return { action: "deny" };
    });

    mainWindow.webContents.on("will-navigate", (event, url) => {
      let target;
      try {
        target = new URL(url);
      } catch {
        event.preventDefault();
        return;
      }

      if (target.origin !== APP_ORIGIN) {
        event.preventDefault();
        if (target.protocol === "https:") void shell.openExternal(target.toString());
      }
    });

    mainWindow.webContents.once("did-finish-load", () => {
      if (queuedCallback) mainWindow.webContents.send("auth:callback", queuedCallback);
    });

    void mainWindow.loadURL(APP_URL);
    mainWindow.on("closed", () => {
      mainWindow = undefined;
    });
  }

  const initialCallback = process.argv.find((arg) => arg.startsWith(PROTOCOL));
  if (initialCallback) handleAuthCallback(initialCallback);

  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
