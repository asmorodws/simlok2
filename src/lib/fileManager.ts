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
  category: 'sika' | 'simja' | 'id_card' | 'other';
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
      idCard: join(userBaseDir, 'id-card'),
      other: join(userBaseDir, 'lainnya')
    };
  }

  /**
   * Determine file category based on field name or file content
   */
  private getFileCategory(fieldName?: string, fileName?: string): 'sika' | 'simja' | 'id_card' | 'other' {
    if (fieldName) {
      if (fieldName.includes('sika')) return 'sika';
      if (fieldName.includes('simja')) return 'simja';
      if (fieldName.includes('id_card') || fieldName.includes('id-card')) return 'id_card';
    }
    
    if (fileName) {
      const lowerName = fileName.toLowerCase();
      if (lowerName.includes('sika')) return 'sika';
      if (lowerName.includes('simja')) return 'simja';
      if (lowerName.includes('ktp') || lowerName.includes('id') || lowerName.includes('identitas')) return 'id_card';
    }
    
    return 'other';
  }

  /**
   * Generate a clean, descriptive filename
   */
  private generateFileName(originalName: string, category: string, userId: string): string {
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
      id_card: 'ID-Card',
      other: 'Doc'
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
      id_card: folders.idCard,
      other: folders.other
    }[category];

    // Save file
    const filePath = join(targetFolder, newFileName);
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, fileBuffer);

    // Get file stats
    const stats = await stat(filePath);

    // Generate URLs
    const relativePath = join(userId, {
      sika: 'dokumen-sika',
      simja: 'dokumen-simja', 
      id_card: 'id-card',
      other: 'lainnya'
    }[category], newFileName);

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
  async renameFile(
    userId: string,
    oldFileName: string,
    newName: string,
    category?: 'sika' | 'simja' | 'id_card' | 'other'
  ): Promise<FileInfo | null> {
    try {
      const folders = this.getUserFolderStructure(userId);
      
      // Find the file in any category folder
      let currentFilePath: string | null = null;
      let currentCategory: string | null = null;

      for (const [cat, folder] of Object.entries({
        sika: folders.sika,
        simja: folders.simja,
        id_card: folders.idCard,
        other: folders.other
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
      const targetCategory = category || currentCategory as 'sika' | 'simja' | 'id_card' | 'other';
      
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
        id_card: folders.idCard,
        other: folders.other
      }[targetCategory];

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
        id_card: folders.idCard,
        other: folders.other
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
      id_card: [],
      other: []
    };

    for (const [category, folder] of Object.entries({
      sika: folders.sika,
      simja: folders.simja,
      id_card: folders.idCard,
      other: folders.other
    })) {
      try {
        if (existsSync(folder)) {
          const files = await readdir(folder);
          
          for (const fileName of files) {
            const filePath = join(folder, fileName);
            const stats = await stat(filePath);
            
            result[category].push({
              originalName: fileName,
              newName: fileName,
              path: filePath,
              url: `/api/files/${userId}/${category}/${fileName}`,
              size: stats.size,
              type: this.getFileType(fileName),
              category: category as 'sika' | 'simja' | 'id_card' | 'other'
            });
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
            id_card: folders.idCard,
            other: folders.other
          }[category];

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
