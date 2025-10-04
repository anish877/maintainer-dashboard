import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    // Try to find in pending comments first
    let pendingComment = await prisma.pendingComment.findUnique({
      where: { id: resolvedParams.id }
    });

    // If not found, try completeness analysis
    let completenessAnalysis = null;
    if (!pendingComment) {
      completenessAnalysis = await prisma.completenessAnalysis.findUnique({
        where: { id: resolvedParams.id }
      });
    }

    if (!pendingComment && !completenessAnalysis) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      pendingComment,
      completenessAnalysis,
      found: !!(pendingComment || completenessAnalysis)
    });

  } catch (error) {
    console.error('Error fetching issue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issue' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    
    // Handle status updates for pending comments
    if (body.status && Object.keys(body).length === 1) {
      if (!['PENDING', 'APPROVED', 'REJECTED', 'POSTED', 'FAILED', 'EXPIRED'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      const updatedComment = await prisma.pendingComment.update({
        where: { id: resolvedParams.id },
        data: { 
          status: body.status,
          approvedAt: body.status === 'APPROVED' ? new Date() : null,
          approvedBy: body.status === 'APPROVED' ? 'admin' : null, // TODO: Get from session
          rejectedAt: body.status === 'REJECTED' ? new Date() : null,
          rejectedBy: body.status === 'REJECTED' ? 'admin' : null
        }
      });

      return NextResponse.json({ 
        message: 'Comment status updated successfully',
        comment: updatedComment
      });
    }

    // Handle comment editing
    const { finalComment } = body;

    if (!finalComment) {
      return NextResponse.json(
        { error: 'Missing comment content' },
        { status: 400 }
      );
    }

    const updatedComment = await prisma.pendingComment.update({
      where: { id: resolvedParams.id },
      data: {
        finalComment,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      message: 'Comment updated successfully',
      comment: updatedComment
    });

  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}
