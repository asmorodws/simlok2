import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/security/auth';
import { fileManager } from '@/lib/storage/file-manager';

// GET /api/files/manage - List all user files
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const files = await fileManager.listUserFiles(session.user.id);
    
    return NextResponse.json({
      success: true,
      files
    });

  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// POST /api/files/manage - Rename or move file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, oldFileName, newName, category } = body;

    if (action === 'rename') {
      if (!oldFileName || !newName) {
        return NextResponse.json({ 
          error: 'oldFileName and newName are required' 
        }, { status: 400 });
      }

      const result = await fileManager.updateFileName(
        session.user.id,
        oldFileName,
        newName,
        category
      );

      if (!result) {
        return NextResponse.json({ 
          error: 'Failed to rename file' 
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        file: result
      });
    }

    if (action === 'migrate') {
      const result = await fileManager.migrateExistingFiles(session.user.id);
      
      return NextResponse.json({
        success: true,
        migrated: result.moved,
        errors: result.errors
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error managing files:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE /api/files/manage - Delete file
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json({ 
        error: 'fileName is required' 
      }, { status: 400 });
    }

    const success = await fileManager.deleteFile(session.user.id, fileName);

    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to delete file' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
