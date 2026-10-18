# Zenkia Anime installers

These private test installers open the live website and need an internet connection. They are not Play Store or Microsoft Store releases.

## Build and download

After the installer pull request is merged, open **GitHub → Actions → Build installable apps**, run the workflow, and download the artifacts named **ZenkiaAnime-Android-APK** and **ZenkiaAnime-Windows-Setup** from the completed run. Workflow artifacts are temporary downloads.

## Android

Download the APK on the phone, open it, and allow installation from that browser/file app if Android asks. The app uses the installed browser for web sign-in. Until the website publishes a matching Digital Asset Links file for the APK signing certificate, Chrome may show its Custom Tab bar around the site.

## Windows

Run the Setup.exe and follow the installer. Windows may show a SmartScreen warning because this private test installer is not code-signed. The app opens the production site in an Electron shell. Google sign-in opens the system browser and returns to the installed app.

Before using Google sign-in in the Windows app, add this exact URL to **Supabase → Authentication → URL Configuration → Redirect URLs**:

`zenkia-anime://auth/callback`

Keep the existing production Site URL and redirect URLs. Do not put OAuth client secrets or signing keys in the repository.

## App limits

The site and Supabase account data remain online; these installers do not provide offline playback or store anime episodes locally. The Android APK is a debug-signed private test build. Keep its matching APK for testing; a future published version should be signed with a persistent private release key and a Digital Asset Links association.
