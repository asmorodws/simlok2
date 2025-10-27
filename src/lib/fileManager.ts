import { join } from 'path';
import { mkdir, rename, unlink, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';

export interface FileInfo {
  originalName: string;
  newName: string;
  path: string;
  url: string;
  size: number;
  type: string;
  category: 'simja' | 'sika' | 'work-order' | 'kontrak-kerja' | 'jsa' | 'hsse-worker' | 'worker-photo';
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
      workOrder: join(userBaseDir, 'dokumen-work-order'),
      kontrakKerja: join(userBaseDir, 'dokumen-kontrak-kerja'),
      jsa: join(userBaseDir, 'dokumen-jsa'),
      hsseWorker: join(userBaseDir, 'dokumen-hsse-pekerja'),
      workerPhoto: join(userBaseDir, 'foto-pekerja')
    };
  }

  /**
   * Determine file category based on field name or file content
   */
  private getFileCategory(fieldName?: string, fileName?: string): 'sika' | 'simja' | 'work-order' | 'kontrak-kerja' | 'jsa' | 'hsse-worker' | 'worker-photo' {
    if (fieldName) {
      if (fieldName.includes('sika')) return 'sika';
      if (fieldName.includes('simja')) return 'simja';
      if (fieldName.includes('work_order') || fieldName.includes('work-order')) return 'work-order';
      if (fieldName.includes('kontrak_kerja') || fieldName.includes('kontrak-kerja')) return 'kontrak-kerja';
      if (fieldName.includes('jsa')) return 'jsa';
      // Worker HSSE document - check for hsse_doc pattern (from form field)
      if (fieldName.includes('hsse_doc')) return 'hsse-worker';
      if (fieldName.includes('worker_photo') || fieldName.includes('pekerja')) return 'worker-photo';
      // Default untuk supporting documents yang tidak spesifik
      if (fieldName.includes('supporting') || fieldName.includes('pendukung')) {
        // Coba deteksi dari nama file
        if (fileName) {
          const lowerName = fileName.toLowerCase();
          if (lowerName.includes('work') && lowerName.includes('order')) return 'work-order';
          if (lowerName.includes('kontrak')) return 'kontrak-kerja';
          if (lowerName.includes('jsa')) return 'jsa';
          if (lowerName.includes('sika')) return 'sika';
          if (lowerName.includes('simja')) return 'simja';
        }
        // Default ke SIMJA jika tidak terdeteksi
        return 'simja';
      }
    }
    
    if (fileName) {
      const lowerName = fileName.toLowerCase();
      if (lowerName.includes('sika')) return 'sika';
      if (lowerName.includes('simja')) return 'simja';
      if (lowerName.includes('work') && lowerName.includes('order')) return 'work-order';
      if (lowerName.includes('kontrak')) return 'kontrak-kerja';
      if (lowerName.includes('jsa')) return 'jsa';
      if (lowerName.includes('hsse')) return 'hsse-worker';
      if (lowerName.includes('worker') || lowerName.includes('pekerja') || lowerName.includes('foto')) return 'worker-photo';
    }
    
    // Default category jika tidak terdeteksi
    return 'simja';
  }

  /**
   * Generate a clean, descriptive filename
   */
  private generateFileName(originalName: string, _category: string, _userId: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    
    // Clean original name - preserve original name as much as possible
    const cleanOriginalName = originalName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9\-_]/g, '_'); // Replace special chars with underscore

    return `${cleanOriginalName}_${timestamp}.${extension}`;
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
      'work-order': folders.workOrder,
      'kontrak-kerja': folders.kontrakKerja,
      jsa: folders.jsa,
      'hsse-worker': folders.hsseWorker,
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
    category?: 'sika' | 'simja' | 'work-order' | 'kontrak-kerja' | 'jsa' | 'hsse-worker' | 'worker-photo'
  ): Promise<FileInfo | null> {
    try {
      const folders = this.getUserFolderStructure(userId);
      
      // Find the file in any category folder
      let currentFilePath: string | null = null;
      let currentCategory: string | null = null;

      for (const [cat, folder] of Object.entries({
        sika: folders.sika,
        simja: folders.simja,
        'work-order': folders.workOrder,
        'kontrak-kerja': folders.kontrakKerja,
        jsa: folders.jsa,
        'hsse-worker': folders.hsseWorker,
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
      const targetCategory = category || currentCategory as 'sika' | 'simja' | 'work-order' | 'kontrak-kerja' | 'jsa' | 'hsse-worker' | 'worker-photo';
      
      // Generate new filename
      const extension = oldFileName.split('.').pop()?.toLowerCase() || '';
      const cleanNewName = newName.replace(/[^a-zA-Z0-9\-_]/g, '_');
      const timestamp = Date.now();
      
      const newFileName = `${cleanNewName}_${timestamp}.${extension}`;
      
      // Get target folder
      const targetFolder = {
        sika: folders.sika,
        simja: folders.simja,
        'work-order': folders.workOrder,
        'kontrak-kerja': folders.kontrakKerja,
        jsa: folders.jsa,
        'hsse-worker': folders.hsseWorker,
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
        'work-order': folders.workOrder,
        'kontrak-kerja': folders.kontrakKerja,
        jsa: folders.jsa,
        'hsse-worker': folders.hsseWorker,
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
      'work-order': [],
      'kontrak-kerja': [],
      jsa: [],
      'hsse-worker': [],
      'worker-photo': []
    };

    for (const [category, folder] of Object.entries({
      sika: folders.sika,
      simja: folders.simja,
      'work-order': folders.workOrder,
      'kontrak-kerja': folders.kontrakKerja,
      jsa: folders.jsa,
      'hsse-worker': folders.hsseWorker,
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
                category: category as 'sika' | 'simja' | 'work-order' | 'kontrak-kerja' | 'jsa' | 'hsse-worker' | 'worker-photo'
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
            'work-order': folders.workOrder,
            'kontrak-kerja': folders.kontrakKerja,
            jsa: folders.jsa,
            'hsse-worker': folders.hsseWorker,
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
