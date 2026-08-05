import fs from "node:fs/promises";

import {
  McpServer
} from "@modelcontextprotocol/server";

import {
  serveStdio
} from "@modelcontextprotocol/server/stdio";

import * as z from "zod/v4";

import {
  ensureRoot,
  listCaptureIds,
  capsuleDirectory,
  capsuleFile,
  walkFiles,
  mimeTypeFor,
  safeCaptureId,
  safeRelativePath
} from "./common.js";

await ensureRoot();

serveStdio(() => {
  const server = new McpServer({
    name: "context-capsule",
    version: "0.1.0"
  });

  server.registerTool(
    "list_captures",

    {
      description:
        "List locally stored browser context captures.",

      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
      }),

      annotations: {
        readOnlyHint: true
      }
    },

    async ({ limit }) => {
      const captures =
        (
          await listCaptureIds()
        ).slice(0, limit);

      return {
        content: [
          {
            type: "text",

            text:
              JSON.stringify(
                captures,
                null,
                2
              )
          }
        ]
      };
    }
  );

  server.registerTool(
    "list_capture_files",

    {
      description:
        "List every file in one browser context capture.",

      inputSchema: z.object({
        captureId:
          z.string().min(1)
      }),

      annotations: {
        readOnlyHint: true
      }
    },

    async ({ captureId }) => {
      const id =
        safeCaptureId(captureId);

      const files =
        await walkFiles(
          capsuleDirectory(id)
        );

      return {
        content: [
          {
            type: "text",

            text:
              JSON.stringify(
                files,
                null,
                2
              )
          }
        ]
      };
    }
  );

  server.registerTool(
    "read_capture_file",

    {
      description:
        "Read one text or image file from a browser context capture.",

      inputSchema: z.object({
        captureId:
          z.string().min(1),

        path:
          z.string().min(1)
      }),

      annotations: {
        readOnlyHint: true
      }
    },

    async ({
      captureId,
      path: relativePath
    }) => {
      const id =
        safeCaptureId(captureId);

      const safePath =
        safeRelativePath(
          relativePath
        );

      const absolute =
        capsuleFile(
          id,
          safePath
        );

      const mimeType =
        mimeTypeFor(absolute);

      const data =
        await fs.readFile(
          absolute
        );

      if (
        mimeType.startsWith(
          "image/"
        )
      ) {
        return {
          content: [
            {
              type: "image",
              data:
                data.toString(
                  "base64"
                ),
              mimeType
            }
          ]
        };
      }

      return {
        content: [
          {
            type: "text",

            text:
              data.toString(
                "utf8"
              )
          }
        ]
      };
    }
  );

  server.registerResource(
    "latest-capture-index",

    "capsule://latest",

    {
      title:
        "Latest Context Capsule",

      description:
        "Manifest and file index for the newest local browser context capture.",

      mimeType:
        "application/json"
    },

    async (uri) => {
      const [latest] =
        await listCaptureIds();

      if (!latest) {
        return {
          contents: [
            {
              uri: uri.href,

              mimeType:
                "application/json",

              text:
                JSON.stringify({
                  capture: null,
                  files: []
                })
            }
          ]
        };
      }

      const files =
        await walkFiles(
          capsuleDirectory(
            latest
          )
        );

      return {
        contents: [
          {
            uri: uri.href,

            mimeType:
              "application/json",

            text:
              JSON.stringify(
                {
                  capture: latest,
                  files
                },
                null,
                2
              )
          }
        ]
      };
    }
  );

  return server;
});
