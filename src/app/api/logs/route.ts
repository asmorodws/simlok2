import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { LogLevel } from '@/lib/logging/logger';
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { logService } from '@/services/LogService';

// GET /api/logs - Get logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.SUPER_ADMINS, 'Only super admins can view logs');
    if (userOrError instanceof NextResponse) return userOrError;

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const level = searchParams.get('level') as LogLevel | null;
    const search = searchParams.get('search');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const result = await logService.getLogs({
      startDate,
      endDate,
      level,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to retrieve logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/logs - Clear logs
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.SUPER_ADMINS, 'Only super admins can delete logs');
    if (userOrError instanceof NextResponse) return userOrError;

    const body = await request.json();
    const { startDate, endDate } = body;

    const result = await logService.clearLogs(
      userOrError.id,
      userOrError.email,
      startDate && endDate ? { startDate, endDate } : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to delete logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/logs - Get list of log files
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.SUPER_ADMINS, 'Only super admins can view log files');
    if (userOrError instanceof NextResponse) return userOrError;

    const result = await logService.getLogFiles();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to list log files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
