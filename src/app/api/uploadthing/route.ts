import { createRouteHandler } from "uploadthing/next";

import { uploadRouter } from "./core";

export const maxDuration = 300;

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
});
