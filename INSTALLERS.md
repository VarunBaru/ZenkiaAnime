# Zenkia Anime installers

The install page provides permanent APK and Windows installer links. Packages are published to GitHub Releases automatically when installer sources are merged into the `main` branch:

- Android: https://github.com/VarunBaru/ZenkiaAnime/releases/latest/download/ZenkiaAnime-Android.apk
- Windows: https://github.com/VarunBaru/ZenkiaAnime/releases/latest/download/ZenkiaAnime-Windows-Setup.exe
- Release history: https://github.com/VarunBaru/ZenkiaAnime/releases

## Android

Download the APK on the phone, open it, and allow installation from that browser or file app if Android asks. The APK is debug-signed for this project. The signing key is not currently persisted between builds, so a future APK update may require uninstalling the older version first. Until a matching Digital Asset Links file is published, Chrome may show its Custom Tab bar around the site.

## Windows

Run the Setup.exe and follow the installer. Windows may show a SmartScreen warning because the installer is not code-signed. The app opens the production site in an Electron shell. Google sign-in opens the system browser and returns to the installed app.

Before using Google sign-in in the Windows app, add this exact URL to **Supabase → Authentication → URL Configuration → Redirect URLs**:

`zenkia-anime://auth/callback`

Keep the existing production Site URL and redirect URLs. Do not put OAuth client secrets or signing keys in the repository.

## App limits

The site and Supabase account data remain online; these installers do not provide offline playback or store anime episodes locally. GitHub Release downloads persist until a release is removed. Release assets are not temporary Actions artifacts.
