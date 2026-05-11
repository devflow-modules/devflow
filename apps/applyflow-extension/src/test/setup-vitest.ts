import { beforeEach } from "vitest";

import { chromeStorageBag, installChromeStorageLocalMock } from "./chrome-storage-mock.js";

installChromeStorageLocalMock();

beforeEach(() => {
  chromeStorageBag.clear();
});
