/**
 * 分享下载统计API
 * Share download statistics API
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateShareStats } from '@/shared/services/community/service';

/**
 * POST /api/community/share/[shareId]/download
 * 更新下载统计
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const { shareId } = params;
    await updateShareStats(shareId, 'download');
    return NextResponse.json({ success: true });
  } catch (error) {
    // 统计失败不影响主流程
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
