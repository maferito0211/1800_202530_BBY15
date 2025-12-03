import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        loginPage: resolve(__dirname, "loginPage.html"),
        forumMain: resolve(__dirname, "forumMain.html"),
        profilePage: resolve(__dirname, "profilePage.html"),
        editProfile: resolve(__dirname, "editProfile.html"),
        map: resolve(__dirname, "map.html"),
        forumnew: resolve(__dirname, "forumnew.html"),
        forumpost: resolve(__dirname, "forumpost.html"),
        secret: resolve(__dirname, "secret.html"),
      },
    },
  },
});
