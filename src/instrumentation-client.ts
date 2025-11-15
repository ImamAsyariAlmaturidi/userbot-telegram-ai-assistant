// This file is normally used for setting up analytics and other
// services that require one-time initialization on the client.

import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { init } from "./core/init";
import { mockEnv } from "./mockEnv";

mockEnv()
  .then(() => {
    try {
      const launchParams = retrieveLaunchParams();
      const { tgWebAppPlatform: platform } = launchParams;
      const debug =
        (launchParams.tgWebAppStartParam || "").includes("debug") ||
        process.env.NODE_ENV === "development";

      // Configure all application dependencies.
      init({
        debug,
        eruda: debug && ["ios", "android"].includes(platform),
        mockForMacOS: platform === "macos",
      });
    } catch (e) {
      console.error("Error retrieving launch params:", e);
      // Fallback: initialize with default settings for development
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "⚠️ Running in development mode without Telegram environment. Some features may not work."
        );
        init({
          debug: true,
          eruda: false,
          mockForMacOS: false,
        });
      } else {
        throw e;
      }
    }
  })
  .catch((error) => {
    console.error("Error in mockEnv:", error);
    // Fallback: initialize with default settings for development
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️ Running in development mode without Telegram environment. Some features may not work."
      );
      init({
        debug: true,
        eruda: false,
        mockForMacOS: false,
      });
    } else {
      throw error;
    }
  });
