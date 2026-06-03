/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for file uploads (defaults to 100kb, increase to 50MB)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper to extract GitHub credentials from headers, query parameters, or environment
  function getGithubConfig(req: express.Request, requireToken = false) {
    const token = (req.headers["x-github-token"] as string) || 
                  (req.query["x-github-token"] as string) || 
                  (req.query["token"] as string) || 
                  process.env.GITHUB_TOKEN ||
                  process.env.GH_TOKEN;

    const owner = (req.headers["x-github-owner"] as string) || 
                  (req.query["x-github-owner"] as string) || 
                  (req.query["owner"] as string) || 
                  process.env.GITHUB_USERNAME ||
                  process.env.GITHUB_OWNER ||
                  process.env.GITHUB_USER ||
                  process.env.GH_OWNER;

    const repo = (req.headers["x-github-repo"] as string) || 
                 (req.query["x-github-repo"] as string) || 
                 (req.query["repo"] as string) || 
                 process.env.GITHUB_REPO ||
                 process.env.GITHUB_REPOSITORY ||
                 process.env.GH_REPO;

    if (!owner || !repo) {
      throw new Error("GitHub owner and repository name are not configured.");
    }

    if (requireToken && !token) {
      throw new Error("A GitHub Personal Access Token is required for write operations (uploads, deletions, renames).");
    }

    return {
      token: token || "",
      owner,
      repo,
      octokit: token ? new Octokit({ auth: token }) : new Octokit(),
    };
  }

  // Beautiful diagnostics printer for standard Github API error situations
  function handleGithubError(err: any, owner: string, repo: string, action: string) {
    console.error(`Error in ${action}:`, err);
    let message = err.message || `Failed to perform ${action}.`;
    let statusCode = err.status || 500;

    if (statusCode === 404 || message.includes("Not Found")) {
      message = `GitHub returned a 404 Not Found error during ${action}.\n` +
                `This typically occurs due to one of the following reasons:\n` +
                `• Spelcheck: The repository path '${owner}/${repo}' is misspelled or does not exist.\n` +
                `• Scope Issues & Privacy: If the repository '${owner}/${repo}' is private, your GITHUB_TOKEN must be a Classic token with the 'repo' scope, or a Fine-grained token with 'Contents: Read & Write' repository access. Without these, GitHub hides the repository's existence and returns a 404 error instead of 403 to protect privacy.`;
    } else if (statusCode === 401 || message.includes("Bad credentials") || message.includes("status-code: 401")) {
      message = `GitHub returned 401 Unauthorized (Bad credentials) during ${action}.\n` +
                `The Personal Access Token is invalid, expired, or has been revoked. Please verify and update GITHUB_TOKEN under Storage Config or environment variables.`;
    } else if (statusCode === 403 || message.includes("rate limit") || message.includes("forbidden")) {
      message = `GitHub returned 403 Forbidden during ${action}. This could be due to API rate limits or because your token lacks write permission for the repository '${owner}/${repo}'.`;
    }

    return { statusCode, error: message };
  }

  // 1. Get server-side config status (so the UI knows whether env variables are loaded)
  app.get("/api/config-status", (req, res) => {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const owner = process.env.GITHUB_USERNAME || process.env.GITHUB_OWNER || process.env.GITHUB_USER || process.env.GH_OWNER;
    const repo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || process.env.GH_REPO;

    res.json({
      hasEnvConfig: !!(token && owner && repo),
      hasToken: !!token,
      username: owner || "",
      repo: repo || "",
    });
  });

  // 2. List files/directories inside a path
  app.get("/api/files", async (req, res) => {
    let owner = "";
    let repo = "";
    try {
      const config = getGithubConfig(req, false);
      owner = config.owner;
      repo = config.repo;
      const { token, octokit } = config;
      // Clean path parameter (default to 'uploads/drive')
      const reqPath = (req.query.path as string) || "uploads/drive";
      
      // We list everything under the uploads directory
      // If the path doesn't exist, GitHub API will return 404, we return empty list gracefully
      try {
        let response;
        try {
          response = await octokit.repos.getContent({
            owner,
            repo,
            path: reqPath,
          });
        } catch (err: any) {
          // If 401 Unauthorized or "Bad credentials" is returned, retry unauthenticated via native fetch for public repositories
          if (err.status === 401 || err.message?.includes("Bad credentials") || err.message?.includes("status-code: 401")) {
            console.warn("GitHub content listing failed with 401 Bad credentials. Checking public/unauthenticated access...");
            const fetchUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(reqPath)}`;
            const fetchRes = await fetch(fetchUrl, {
              headers: {
                "User-Agent": "GitHub-Drive-Applet"
              }
            });
            if (fetchRes.ok) {
              const data = await fetchRes.json();
              response = { data };
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }

        if (Array.isArray(response.data)) {
          // Map and filter directories / files
          const items = response.data
            .filter((item) => item.name !== ".keep") // Hide keep files
            .map((item) => ({
              name: item.name,
              path: item.path,
              type: item.type as "file" | "dir",
              size: item.size,
              sha: item.sha,
              download_url: `/api/raw?path=${encodeURIComponent(item.path)}`,
              html_url: item.html_url || "",
            }));

          return res.json(items);
        } else {
          // Single file metadata
          return res.json([response.data]);
        }
      } catch (err: any) {
        if (err.status === 404) {
          // Verify if repository itself is missing or inaccessible to distinguish from a missing sub-folder
          try {
            await octokit.repos.get({ owner, repo });
            // The repository exists perfectly, but the sub-path does not. Safely return empty list.
            return res.json([]);
          } catch (repoErr: any) {
            // The repository itself doesn't exist or token fails. Return helpful diagnostic detail.
            const { statusCode, error } = handleGithubError(err, owner, repo, "listing files");
            return res.status(statusCode).json({ error });
          }
        }
        throw err;
      }
    } catch (err: any) {
      console.error("Error in /api/files:", err);
      const { statusCode, error } = handleGithubError(err, owner || "unknown", repo || "unknown", "listing files");
      res.status(statusCode).json({ error });
    }
  });

  function getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case ".html":
      case ".htm":
        return "text/html; charset=utf-8";
      case ".css":
        return "text/css; charset=utf-8";
      case ".js":
      case ".mjs":
        return "application/javascript; charset=utf-8";
      case ".json":
        return "application/json; charset=utf-8";
      case ".svg":
        return "image/svg+xml";
      case ".png":
        return "image/png";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".gif":
        return "image/gif";
      case ".webp":
        return "image/webp";
      case ".pdf":
        return "application/pdf";
      case ".txt":
        return "text/plain; charset=utf-8";
      case ".mp3":
        return "audio/mpeg";
      case ".mp4":
        return "video/mp4";
      case ".csv":
        return "text/csv; charset=utf-8";
      default:
        return "";
    }
  }

  // 3. Raw file access & public sharing proxy (streams directly from GitHub)
  app.get("/api/raw", async (req, res) => {
    try {
      let token = "";
      let owner = "";
      let repo = "";
      try {
        const config = getGithubConfig(req);
        token = config.token;
        owner = config.owner;
        repo = config.repo;
      } catch (e) {
        token = (req.headers["x-github-token"] as string) || (req.query["x-github-token"] as string) || (req.query["token"] as string) || process.env.GITHUB_TOKEN || "";
        owner = (req.headers["x-github-owner"] as string) || (req.query["x-github-owner"] as string) || (req.query["owner"] as string) || process.env.GITHUB_USERNAME || "";
        repo = (req.headers["x-github-repo"] as string) || (req.query["x-github-repo"] as string) || (req.query["repo"] as string) || process.env.GITHUB_REPO || "";
      }

      const filePath = req.query.path as string;
      const ref = req.query.ref as string; // Accept specific git commit ref for version history!

      if (!filePath) {
        return res.status(400).send("Path is required");
      }

      let githubRes;

      // Try public access first (no token needed if public)
      if (owner && repo) {
        const publicRawUrlMain = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/${filePath}`;
        let fallbackRes = await fetch(publicRawUrlMain);
        
        if (!fallbackRes.ok) {
          const publicRawUrlMaster = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/${filePath}`;
          fallbackRes = await fetch(publicRawUrlMaster);
        }
        
        if (fallbackRes.ok) {
          githubRes = fallbackRes;
        }
      }

      // If public raw fetch is not available or failed (e.g. private repo), fall back to authenticated Github API contents endpoint
      if ((!githubRes || !githubRes.ok) && token && owner && repo) {
        const apiEndpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}${
          ref ? `?ref=${ref}` : ""
        }`;

        githubRes = await fetch(apiEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        });
      }

      if (!githubRes || !githubRes.ok) {
        return res.status(githubRes ? githubRes.status : 400).send("GitHub raw content fetch failed.");
      }

      // Stream / pipe headers - set content type gracefully by suffixing file type
      let contentType = getContentType(filePath);
      if (!contentType) {
        contentType = githubRes.headers.get("content-type") || "application/octet-stream";
      }
      res.setHeader("Content-Type", contentType);

      // Force inline or download based on query parameter
      const download = req.query.download === "true";
      const filename = filePath.split("/").pop() || "download";
      if (download) {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      } else {
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      }

      const buffer = await githubRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("Error in /api/raw:", err);
      res.status(500).send(err.message || "Failed to retrieve raw file.");
    }
  });

  // Unique route mapping direct raw paths cleanly like /raw/uploads/drive/your-file-name.html
  app.get("/raw/*", async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params[0]);
      if (!filePath) {
        return res.status(400).send("Path is required");
      }

      let token = "";
      let owner = "";
      let repo = "";
      try {
        const config = getGithubConfig(req);
        token = config.token;
        owner = config.owner;
        repo = config.repo;
      } catch (e) {
        token = (req.headers["x-github-token"] as string) || (req.query["x-github-token"] as string) || (req.query["token"] as string) || process.env.GITHUB_TOKEN || "";
        owner = (req.headers["x-github-owner"] as string) || (req.query["x-github-owner"] as string) || (req.query["owner"] as string) || process.env.GITHUB_USERNAME || "";
        repo = (req.headers["x-github-repo"] as string) || (req.query["x-github-repo"] as string) || (req.query["repo"] as string) || process.env.GITHUB_REPO || "";
      }

      const ref = req.query.ref as string;

      let githubRes;

      // Try public access first (no token needed if public)
      if (owner && repo) {
        const publicRawUrlMain = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/${filePath}`;
        let fallbackRes = await fetch(publicRawUrlMain);
        
        if (!fallbackRes.ok) {
          const publicRawUrlMaster = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/${filePath}`;
          fallbackRes = await fetch(publicRawUrlMaster);
        }
        
        if (fallbackRes.ok) {
          githubRes = fallbackRes;
        }
      }

      // If public raw fetch is not available or failed (e.g. private repo), fall back to authenticated Github API contents endpoint
      if ((!githubRes || !githubRes.ok) && token && owner && repo) {
        const apiEndpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}${
          ref ? `?ref=${ref}` : ""
        }`;

        githubRes = await fetch(apiEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        });
      }

      if (!githubRes || !githubRes.ok) {
        return res.status(githubRes ? githubRes.status : 400).send("GitHub raw content fetch failed.");
      }

      let contentType = getContentType(filePath);
      if (!contentType) {
        contentType = githubRes.headers.get("content-type") || "application/octet-stream";
      }
      res.setHeader("Content-Type", contentType);

      const download = req.query.download === "true";
      const filename = filePath.split("/").pop() || "download";
      if (download) {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      } else {
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      }

      const buffer = await githubRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("Error in /raw/*:", err);
      res.status(500).send(err.message || "Failed to retrieve raw file.");
    }
  });

  // 4. Create folder (GitHub handles "folders" only by committing a placeholder file)
  app.post("/api/create-folder", async (req, res) => {
    try {
      const { owner, repo, octokit } = getGithubConfig(req, true);
      const { folderPath, folderName } = req.body;

      if (!folderName) {
        return res.status(400).json({ error: "Folder name is required" });
      }

      // Path should end in folderName/.keep
      const combinedPath = `${folderPath}/${folderName}/.keep`;

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: combinedPath,
        message: `Create directory: ${folderName}`,
        content: Buffer.from("GitHub Drive Placeholder").toString("base64"),
      });

      res.json({ success: true });
    } catch (err: any) {
      let owner = "unknown";
      let repo = "unknown";
      try {
        const config = getGithubConfig(req, false);
        owner = config.owner;
        repo = config.repo;
      } catch (configErr) {}
      const { statusCode, error } = handleGithubError(err, owner, repo, "creating folder");
      res.status(statusCode).json({ error });
    }
  });

  // 5. Upload a file directly via Base64 payload
  app.post("/api/upload", async (req, res) => {
    try {
      const { owner, repo, octokit } = getGithubConfig(req, true);
      const { fileName, path: directoryPath, content, sha } = req.body;

      if (!fileName || !content) {
        return res.status(400).json({ error: "File name and content are required." });
      }

      const combinedPath = `${directoryPath}/${fileName}`;

      // If SHA is passed, we are overwriting (which also triggers dynamic version history on git commit!)
      const uploadParams: any = {
        owner,
        repo,
        path: combinedPath,
        message: sha ? `Update file: ${fileName}` : `Upload file: ${fileName}`,
        content: content, // base64 encoded file data
      };

      if (sha) {
        uploadParams.sha = sha;
      }

      const response = await octokit.repos.createOrUpdateFileContents(uploadParams);

      res.json({
        success: true,
        sha: response.data.content?.sha,
        path: combinedPath,
      });
    } catch (err: any) {
      let owner = "unknown";
      let repo = "unknown";
      try {
        const config = getGithubConfig(req, false);
        owner = config.owner;
        repo = config.repo;
      } catch (configErr) {}
      const { statusCode, error } = handleGithubError(err, owner, repo, "uploading file");
      res.status(statusCode).json({ error });
    }
  });

  // 6. Delete a file or a folder recursively
  app.post("/api/delete", async (req, res) => {
    try {
      const { owner, repo, octokit } = getGithubConfig(req, true);
      const { path: itemPath, sha, type } = req.body;

      if (!itemPath) {
        return res.status(400).json({ error: "Path is required" });
      }

      if (type === "dir") {
        // Deleting a directory recursively on GitHub: List all references inside and delete them
        async function deleteRecursive(curPath: string) {
          const contents = await octokit.repos.getContent({
            owner,
            repo,
            path: curPath,
          });

          if (Array.isArray(contents.data)) {
            for (const item of contents.data) {
              if (item.type === "dir") {
                await deleteRecursive(item.path);
              } else {
                await octokit.repos.deleteFile({
                  owner,
                  repo,
                  path: item.path,
                  sha: item.sha,
                  message: `Delete file recursively: ${item.name}`,
                });
              }
            }
          }
        }

        await deleteRecursive(itemPath);
        return res.json({ success: true, message: "Directory deleted recursively." });
      } else {
        // Delete simple file
        if (!sha) {
          return res.status(400).json({ error: "SHA is required for file deletion" });
        }

        await octokit.repos.deleteFile({
          owner,
          repo,
          path: itemPath,
          sha,
          message: `Delete file: ${itemPath.split("/").pop()}`,
        });

        res.json({ success: true, message: "File deleted." });
      }
    } catch (err: any) {
      let owner = "unknown";
      let repo = "unknown";
      try {
        const config = getGithubConfig(req, false);
        owner = config.owner;
        repo = config.repo;
      } catch (configErr) {}
      const { statusCode, error } = handleGithubError(err, owner, repo, "deleting item");
      res.status(statusCode).json({ error });
    }
  });

  // 7. Rename or Move a file / directory
  app.post("/api/rename", async (req, res) => {
    try {
      const { token, owner, repo, octokit } = getGithubConfig(req, true);
      const { path: oldPath, sha, newName, newPath, type } = req.body;

      if (!oldPath) {
        return res.status(400).json({ error: "Current path is required" });
      }
      if (!newName && !newPath) {
        return res.status(400).json({ error: "New name or new path is required" });
      }

      let targetPath = newPath;
      if (!targetPath) {
        const parentDir = oldPath.split("/").slice(0, -1).join("/");
        const rawNew = parentDir ? `${parentDir}/${newName}` : newName;
        // Normalize posix path (resolves any ".." etc.)
        targetPath = path.posix.normalize(rawNew);
      }

      if (type === "dir") {
        const filesToMove: { oldPath: string; newPath: string; sha: string }[] = [];

        async function collectFiles(curPath: string, targetPathPrefix: string) {
          try {
            const contents = await octokit.repos.getContent({
              owner,
              repo,
              path: curPath,
            });

            if (Array.isArray(contents.data)) {
              for (const item of contents.data) {
                if (item.type === "dir") {
                  await collectFiles(item.path, `${targetPathPrefix}/${item.name}`);
                } else {
                  filesToMove.push({
                    oldPath: item.path,
                    newPath: `${targetPathPrefix}/${item.name}`,
                    sha: item.sha,
                  });
                }
              }
            } else {
              filesToMove.push({
                oldPath: contents.data.path,
                newPath: targetPathPrefix,
                sha: contents.data.sha,
              });
            }
          } catch (e: any) {
            if (e.status !== 404) {
              throw e;
            }
          }
        }

        await collectFiles(oldPath, targetPath);

        if (filesToMove.length === 0) {
          // Empty directory, create keep placeholder in new target path
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: `${targetPath}/.keep`,
            message: `Create directory placeholder for renamed folder`,
            content: Buffer.from("GitHub Drive Placeholder").toString("base64"),
          });
        } else {
          // Move collected files
          for (const file of filesToMove) {
            const fileRes = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(file.oldPath)}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/vnd.github.v3.raw",
                },
              }
            );

            if (!fileRes.ok) {
              throw new Error(`Could not fetch file content for ${file.oldPath} during directory rename.`);
            }

            const fileBuffer = await fileRes.arrayBuffer();
            const base64Content = Buffer.from(fileBuffer).toString("base64");

            // 1. Put into new file path
            await octokit.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: file.newPath,
              message: `Move folder item to ${file.newPath.split("/").pop()}`,
              content: base64Content,
            });

            // 2. Delete old file path
            await octokit.repos.deleteFile({
              owner,
              repo,
              path: file.oldPath,
              sha: file.sha,
              message: `Cleanup moved folder item: ${file.oldPath.split("/").pop()}`,
            });
          }
        }

        return res.json({ success: true, message: "Directory renamed recursively." });
      } else {
        // Single file rename / move
        const getFileRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(oldPath)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3.raw",
            },
          }
        );

        if (!getFileRes.ok) {
          return res.status(500).json({ error: `Could not fetch old file content for renaming.` });
        }

        const fileBuffer = await getFileRes.arrayBuffer();
        const base64Content = Buffer.from(fileBuffer).toString("base64");

        // 2. Put into new file path
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: targetPath,
          message: `Rename ${oldPath.split("/").pop()} to ${targetPath.split("/").pop()}`,
          content: base64Content,
        });

        // 3. Delete old file path
        await octokit.repos.deleteFile({
          owner,
          repo,
          path: oldPath,
          sha,
          message: `Cleanup renamed file: ${oldPath.split("/").pop()}`,
        });

        res.json({ success: true });
      }
    } catch (err: any) {
      let owner = "unknown";
      let repo = "unknown";
      try {
        const config = getGithubConfig(req, false);
        owner = config.owner;
        repo = config.repo;
      } catch (configErr) {}
      const { statusCode, error } = handleGithubError(err, owner, repo, "renaming item");
      res.status(statusCode).json({ error });
    }
  });

  // 8. Fetch version history (commit logs) for a file
  app.get("/api/history", async (req, res) => {
    try {
      const { token, owner, repo, octokit } = getGithubConfig(req, false);
      const filePath = req.query.path as string;

      if (!filePath) {
        return res.status(400).json({ error: "Path is required" });
      }

      let commits;
      try {
        commits = await octokit.repos.listCommits({
          owner,
          repo,
          path: filePath,
          per_page: 20, // get up to 20 historic commits
        });
      } catch (err: any) {
        // If 401 Unauthorized or "Bad credentials" is returned, retry unauthenticated via native fetch for public repositories
        if (err.status === 401 || err.message?.includes("Bad credentials") || err.message?.includes("status-code: 401")) {
          console.warn("GitHub history fetch failed with 401 Bad credentials. Checking public/unauthenticated access...");
          const fetchUrl = `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(filePath)}&per_page=20`;
          const fetchRes = await fetch(fetchUrl, {
            headers: {
              "User-Agent": "GitHub-Drive-Applet"
            }
          });
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            commits = { data };
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      const mappedCommits = commits.data.map((commit: any) => ({
        sha: commit.sha,
        author: commit.commit.author?.name || "Anonymous",
        date: commit.commit.author?.date || "",
        message: commit.commit.message || "",
      }));

      res.json(mappedCommits);
    } catch (err: any) {
      let owner = "unknown";
      let repo = "unknown";
      try {
        const config = getGithubConfig(req, false);
        owner = config.owner;
        repo = config.repo;
      } catch (configErr) {}
      const { statusCode, error } = handleGithubError(err, owner, repo, "fetching history");
      res.status(statusCode).json({ error });
    }
  });

  // Vite integration middleware
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
  
  return app;
}

const appPromise = startServer();
export default async function (req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}