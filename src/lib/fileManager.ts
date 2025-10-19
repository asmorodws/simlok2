import { join } from 'path';
import { mkdir, rename, unlink, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import crypto from 'crypto';

export interface FileInfo {
  originalName: string;
  newName: string;
  path: string;
  url: string;
  size: number;
  type: string;
  category: 'sika' | 'simja' | 'hsse' | 'hsse-worker' | 'document' | 'worker-photo';
}

export class FileManager {
  private baseUploadDir: string;

  constructor() {
    this.baseUploadDir = join(process.cwd(), 'public', 'uploads');
  }

  /**
   * Get organized folder structure for user files
   */
  private getUserFolderStructure(userId: string) {
    const userBaseDir = join(this.baseUploadDir, userId);
    return {
      base: userBaseDir,
      sika: join(userBaseDir, 'dokumen-sika'),
      simja: join(userBaseDir, 'dokumen-simja'),
      hsse: join(userBaseDir, 'dokumen-hsse'),
      hsseWorker: join(userBaseDir, 'dokumen-hsse-pekerja'),
      document: join(userBaseDir, 'dokumen'),
      workerPhoto: join(userBaseDir, 'foto-pekerja')
    };
  }

  /**
   * Determine file category based on field name or file content
   */
  private getFileCategory(fieldName?: string, fileName?: string): 'sika' | 'simja' | 'hsse' | 'hsse-worker' | 'document' | 'worker-photo' {
    if (fieldName) {
      if (fieldName.includes('sika')) return 'sika';
      if (fieldName.includes('simja')) return 'simja';
      // Worker HSSE document - check for hsse_doc pattern (from form field)
      if (fieldName.includes('hsse_doc')) return 'hsse-worker';
      // Submission-level HSSE document
      if (fieldName.includes('hsse_pass_document_upload')) return 'hsse';
      if (fieldName.includes('hsse')) return 'hsse';
      if (fieldName.includes('worker_photo') || fieldName.includes('pekerja')) return 'worker-photo';
      if (fieldName.includes('supporting') || fieldName.includes('pendukung')) return 'document';
    }
    
    if (fileName) {
      const lowerName = fileName.toLowerCase();
      if (lowerName.includes('sika')) return 'sika';
      if (lowerName.includes('simja')) return 'simja';
      if (lowerName.includes('hsse')) return 'hsse';
      if (lowerName.includes('worker') || lowerName.includes('pekerja') || lowerName.includes('foto')) return 'worker-photo';
    }
    
    return 'document';
  }

  /**
   * Generate a clean, descriptive filename
   */
  private generateFileName(originalName: string, category: string, _userId: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    
    // Clean original name
    const cleanOriginalName = originalName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9\-_]/g, '_') // Replace special chars
      .substring(0, 30); // Limit length

    // Create descriptive name based on category
    const categoryPrefix = {
      sika: 'SIKA',
      simja: 'SIMJA', 
      other: 'Doc',
      'worker-photo': 'Worker'
    }[category] || 'Doc';

    return `${categoryPrefix}_${timestamp}_${randomString}_${cleanOriginalName}.${extension}`;
  }

  /**
   * Create all necessary directories
   */
  private async createDirectories(userId: string): Promise<void> {
    const folders = this.getUserFolderStructure(userId);
    
    for (const folder of Object.values(folders)) {
      if (!existsSync(folder)) {
        await mkdir(folder, { recursive: true });
      }
    }
  }

  /**
   * Save worker photo with worker's name as filename
   */
  async saveWorkerPhoto(
    fileBuffer: Buffer,
    originalName: string,
    userId: string,
    workerName: string
  ): Promise<FileInfo> {
    // Clean worker name for filename
    const cleanWorkerName = workerName
      .replace(/[^a-zA-Z0-9\-_\s]/g, '') // Remove special chars except space
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .substring(0, 50); // Limit length

    // Get file extension
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Generate filename with worker name
    const timestamp = Date.now();
    const newFileName = `${cleanWorkerName}_${timestamp}.${extension}`;
    
    // Create directories
    await this.createDirectories(userId);
    
    // Get worker photo folder
    const folders = this.getUserFolderStructure(userId);
    const targetFolder = folders.workerPhoto;

    // Save file
    const filePath = join(targetFolder, newFileName);
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, fileBuffer);

    // Get file stats
    const stats = await stat(filePath);

    return {
      originalName,
      newName: newFileName,
      path: filePath,
      url: `/api/files/${userId}/worker-photo/${newFileName}`,
      size: stats.size,
      type: this.getFileType(originalName),
      category: 'worker-photo'
    };
  }

  /**
   * Save uploaded file with proper organization
   */
  async saveFile(
    fileBuffer: Buffer,
    originalName: string,
    userId: string,
    fieldName?: string
  ): Promise<FileInfo> {
    // Determine category and generate filename
    const category = this.getFileCategory(fieldName, originalName);
    const newFileName = this.generateFileName(originalName, category, userId);
    
    // Create directories
    await this.createDirectories(userId);
    
    // Get target folder
    const folders = this.getUserFolderStructure(userId);
    const targetFolder = {
      sika: folders.sika,
      simja: folders.simja,
      hsse: folders.hsse,
      'hsse-worker': folders.hsseWorker,
      document: folders.document,
      'worker-photo': folders.workerPhoto
    }[category];

    if (!targetFolder) {
      throw new Error(`Invalid category: ${category}`);
    }

    // Save file
    const filePath = join(targetFolder, newFileName);
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, fileBuffer);

    // Get file stats
    const stats = await stat(filePath);

    return {
      originalName,
      newName: newFileName,
      path: filePath,
      url: `/api/files/${userId}/${category}/${newFileName}`,
      size: stats.size,
      type: this.getFileType(originalName),
      category
    };
  }

  /**
   * Rename existing file
   */
  async updateFileName(
    userId: string,
    oldFileName: string,
    newName: string,
    category?: 'sika' | 'simja' | 'hsse' | 'hsse-worker' | 'document' | 'worker-photo'
  ): Promise<FileInfo | null> {
    try {
      const folders = this.getUserFolderStructure(userId);
      
      // Find the file in any category folder
      let currentFilePath: string | null = null;
      let currentCategory: string | null = null;

      for (const [cat, folder] of Object.entries({
        sika: folders.sika,
        simja: folders.simja,
        hsse: folders.hsse,
        'hsse-worker': folders.hsseWorker,
        document: folders.document,
        'worker-photo': folders.workerPhoto
      })) {
        const testPath = join(folder, oldFileName);
        if (existsSync(testPath)) {
          currentFilePath = testPath;
          currentCategory = cat;
          break;
        }
      }

      if (!currentFilePath || !currentCategory) {
        throw new Error('File not found');
      }

      // Determine new category (use provided or keep current)
      const targetCategory = category || currentCategory as 'sika' | 'simja' | 'hsse' | 'hsse-worker' | 'document' | 'worker-photo';
      
      // Generate new filename
      const extension = oldFileName.split('.').pop()?.toLowerCase() || '';
      const cleanNewName = newName.replace(/[^a-zA-Z0-9\-_]/g, '_');
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(4).toString('hex');
      
      const newFileName = `${targetCategory.toUpperCase()}_${timestamp}_${randomString}_${cleanNewName}.${extension}`;
      
      // Get target folder
      const targetFolder = {
        sika: folders.sika,
        simja: folders.simja,
        hsse: folders.hsse,
        'hsse-worker': folders.hsseWorker,
        document: folders.document,
        'worker-photo': folders.workerPhoto
      }[targetCategory];

      if (!targetFolder) {
        throw new Error(`Invalid target category: ${targetCategory}`);
      }

      const newFilePath = join(targetFolder, newFileName);

      // Rename/move file
      await rename(currentFilePath, newFilePath);

      // Get file stats
      const stats = await stat(newFilePath);

      return {
        originalName: oldFileName,
        newName: newFileName,
        path: newFilePath,
        url: `/api/files/${userId}/${targetCategory}/${newFileName}`,
        size: stats.size,
        type: this.getFileType(newFileName),
        category: targetCategory
      };

    } catch (error) {
      console.error('Error renaming file:', error);
      return null;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(userId: string, fileName: string): Promise<boolean> {
    try {
      const folders = this.getUserFolderStructure(userId);
      
      // Find and delete the file from any category folder
      for (const folder of Object.values({
        sika: folders.sika,
        simja: folders.simja,
        hsse: folders.hsse,
        'hsse-worker': folders.hsseWorker,
        document: folders.document,
        'worker-photo': folders.workerPhoto
      })) {
        const filePath = join(folder, fileName);
        if (existsSync(filePath)) {
          await unlink(filePath);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * List all files for a user
   */
  async listUserFiles(userId: string): Promise<{ [category: string]: FileInfo[] }> {
    const folders = this.getUserFolderStructure(userId);
    const result: { [category: string]: FileInfo[] } = {
      sika: [],
      simja: [],
      hsse: [],
      'hsse-worker': [],
      document: [],
      'worker-photo': []
    };

    for (const [category, folder] of Object.entries({
      sika: folders.sika,
      simja: folders.simja,
      hsse: folders.hsse,
      'hsse-worker': folders.hsseWorker,
      document: folders.document,
      'worker-photo': folders.workerPhoto
    })) {
      try {
        if (existsSync(folder)) {
          const files = await readdir(folder);
          
          for (const fileName of files) {
            const filePath = join(folder, fileName);
            const stats = await stat(filePath);
            
            if (result[category]) {
              result[category].push({
                originalName: fileName,
                newName: fileName,
                path: filePath,
                url: `/api/files/${userId}/${category}/${fileName}`,
                size: stats.size,
                type: this.getFileType(fileName),
                category: category as 'sika' | 'simja' | 'hsse' | 'hsse-worker' | 'document' | 'worker-photo'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error reading folder ${category}:`, error);
      }
    }

    return result;
  }

  /**
   * Get file type from filename
   */
  private getFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const types: { [key: string]: string } = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif'
    };

    return types[extension || ''] || 'application/octet-stream';
  }

  /**
   * Move existing files to organized structure (migration utility)
   */
  async migrateExistingFiles(userId: string): Promise<{ moved: number; errors: string[] }> {
    const oldUserDir = join(this.baseUploadDir, userId);
    const errors: string[] = [];
    let moved = 0;

    if (!existsSync(oldUserDir)) {
      return { moved: 0, errors: ['User directory not found'] };
    }

    try {
      // Create new organized structure
      await this.createDirectories(userId);
      
      // Read files from old structure
      const files = await readdir(oldUserDir);
      
      for (const fileName of files) {
        const oldPath = join(oldUserDir, fileName);
        const stats = await stat(oldPath);
        
        // Skip if it's a directory (already organized)
        if (stats.isDirectory()) continue;
        
        try {
          // Determine category from filename
          const category = this.getFileCategory(undefined, fileName);
          
          // Get target folder
          const folders = this.getUserFolderStructure(userId);
          const targetFolder = {
            sika: folders.sika,
            simja: folders.simja,
            hsse: folders.hsse,
            'hsse-worker': folders.hsseWorker,
            document: folders.document,
            'worker-photo': folders.workerPhoto
          }[category];

          if (!targetFolder) {
            errors.push(`Invalid category ${category} for file ${fileName}`);
            continue;
          }

          // Generate new organized filename
          const newFileName = this.generateFileName(fileName, category, userId);
          const newPath = join(targetFolder, newFileName);

          // Move file
          await rename(oldPath, newPath);
          moved++;
          
        } catch (error) {
          errors.push(`Failed to move ${fileName}: ${error}`);
        }
      }

    } catch (error) {
      errors.push(`Migration error: ${error}`);
    }

    return { moved, errors };
  }
}

// Export singleton instance
export const fileManager = new FileManager();
