import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const issue = await prisma.processedIssue.findUnique({
      where: { id: params.id },
      include: {
        scrapedPost: true
      }
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ issue });

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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Handle status-only updates (from approve/reject buttons)
    if (body.status && Object.keys(body).length === 1) {
      if (!['pending', 'approved', 'rejected', 'duplicate'].includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      const updatedIssue = await prisma.processedIssue.update({
        where: { id: params.id },
        data: { 
          status: body.status,
          reviewedAt: new Date(),
          reviewedBy: 'admin' // TODO: Get from session
        },
        include: {
          scrapedPost: true
        }
      });

      return NextResponse.json({ 
        message: 'Issue status updated successfully',
        issue: updatedIssue
      });
    }

    // Handle full issue editing (from edit form)
    const {
      summary,
      severity,
      type,
      suggestedLabels,
      affectedArea,
      technicalDetails
    } = body;

    if (!summary || !severity || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updatedIssue = await prisma.processedIssue.update({
      where: { id: params.id },
      data: {
        summary,
        severity,
        type,
        suggestedLabels: suggestedLabels || [],
        affectedArea,
        technicalDetails,
        reviewedAt: new Date(),
        reviewedBy: 'admin' // TODO: Get from session
      },
      include: {
        scrapedPost: true
      }
    });

    return NextResponse.json({ 
      message: 'Issue updated successfully',
      issue: updatedIssue
    });

  } catch (error) {
    console.error('Error updating issue:', error);
    return NextResponse.json(
      { error: 'Failed to update issue' },
      { status: 500 }
    );
  }
}
