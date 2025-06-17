// This file contains the implementation to be added to obsidian-local-rest-api
// File: src/requestHandler.ts

// Add to the imports at the top:
import { TFile } from "obsidian";

// Add to setupRouter() method, after the existing vault routes:
this.api
  .route("/vault/*/rename")
  .post(this.authenticate.bind(this), this.vaultRename.bind(this));

// Add this new method to the RequestHandler class:
async vaultRename(req: express.Request, res: express.Response) {
  // Extract the old path from the URL
  const oldPath = decodeURIComponent(req.path.slice("/vault/".length, -"/rename".length));
  
  if (!oldPath || oldPath.endsWith("/")) {
    this.returnCannedResponse(res, {
      errorCode: ErrorCode.RequestMethodValidOnlyForFiles,
    });
    return;
  }

  // Parse request body for new path
  const { newPath } = req.body;
  
  if (!newPath || typeof newPath !== 'string') {
    res.status(400).json({
      errorCode: 40001,
      message: "newPath is required in request body"
    });
    return;
  }

  // Validate new path
  if (newPath.endsWith("/")) {
    res.status(400).json({
      errorCode: 40002,
      message: "newPath must be a file path, not a directory"
    });
    return;
  }

  // Check if source file exists
  const sourceFile = this.app.vault.getAbstractFileByPath(oldPath);
  if (!sourceFile || !(sourceFile instanceof TFile)) {
    this.returnCannedResponse(res, { statusCode: 404 });
    return;
  }

  // Check if destination already exists
  const destExists = await this.app.vault.adapter.exists(newPath);
  if (destExists) {
    res.status(409).json({
      errorCode: 40901,
      message: "Destination file already exists"
    });
    return;
  }

  try {
    // Use FileManager to rename the file (preserves history and updates links)
    await this.app.fileManager.renameFile(sourceFile, newPath);
    
    res.status(200).json({
      message: "File successfully renamed",
      oldPath: oldPath,
      newPath: newPath
    });
  } catch (error) {
    res.status(500).json({
      errorCode: 50001,
      message: `Failed to rename file: ${error.message}`
    });
  }
}

// Alternative implementation using MOVE method (more RESTful):
// In setupRouter():
this.api
  .route("/vault/*")
  .move(this.authenticate.bind(this), this.vaultMove.bind(this));

async vaultMove(req: express.Request, res: express.Response) {
  const sourcePath = this.getPathFromParams(req);
  const destinationHeader = req.headers['destination'];
  
  if (!sourcePath || sourcePath.endsWith("/")) {
    this.returnCannedResponse(res, {
      errorCode: ErrorCode.RequestMethodValidOnlyForFiles,
    });
    return;
  }

  if (!destinationHeader || typeof destinationHeader !== 'string') {
    res.status(400).json({
      errorCode: 40003,
      message: "Destination header is required"
    });
    return;
  }

  // Extract path from destination header (remove protocol and host if present)
  const destUrl = new URL(destinationHeader, `http://localhost`);
  const newPath = destUrl.pathname.startsWith('/vault/') 
    ? destUrl.pathname.slice('/vault/'.length) 
    : destinationHeader;

  // Rest of the implementation is the same as vaultRename...
  const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
  if (!sourceFile || !(sourceFile instanceof TFile)) {
    this.returnCannedResponse(res, { statusCode: 404 });
    return;
  }

  const destExists = await this.app.vault.adapter.exists(newPath);
  if (destExists) {
    res.status(409).json({
      errorCode: 40901,
      message: "Destination file already exists"
    });
    return;
  }

  try {
    await this.app.fileManager.renameFile(sourceFile, newPath);
    
    res.status(204).send(); // 204 No Content is standard for MOVE
  } catch (error) {
    res.status(500).json({
      errorCode: 50001,
      message: `Failed to move file: ${error.message}`
    });
  }
}