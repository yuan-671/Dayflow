# Dayflow Android APK

This project packages the Dayflow React app as an Android app using Capacitor and adds Android local notifications.

## Build on GitHub from a phone
1. Upload the contents of this ZIP into the root of your private `yuan-671/Dayflow` repository (not the ZIP file itself). Keep `README.md` if you want.
2. Commit the files to the `main` branch.
3. Open the repository's **Actions** tab and choose **Build Dayflow Android APK**. If it has not run automatically, tap **Run workflow**.
4. When the run succeeds, open it and download the `dayflow-debug-apk` artifact. Extract it and install `app-debug.apk`.

## Notes
- The APK is built by GitHub Actions; this source ZIP is not itself an APK.
- Allow notifications when prompted. Android battery optimization and force-stop behavior can still delay or prevent notifications.
- The app stores tasks locally in the WebView. This workflow has not been executed in this environment, so the APK must be built and checked by GitHub Actions before treating it as verified.
