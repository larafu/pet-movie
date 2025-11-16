import { NextRequest, NextResponse } from 'next/server';

// 简单的折扣码验证
// 后续可以从数据库读取或集成更复杂的折扣系统
const DISCOUNT_CODES = {
  EARLYBIRD70: {
    valid: true,
    discount: 70, // 70% discount (3折)
    description: '早鸟优惠 - 3折',
    expiresAt: '2025-11-24T00:00:00', // 与倒计时同步
  },
  LAUNCH50: {
    valid: true,
    discount: 50, // 50% discount (5折)
    description: '上线特惠 - 5折',
  },
} as Record<
  string,
  {
    valid: boolean;
    discount: number;
    description: string;
    expiresAt?: string;
  }
>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({
        code: 1,
        message: '请提供折扣码',
      });
    }

    const normalizedCode = code.toUpperCase().trim();
    const discountInfo = DISCOUNT_CODES[normalizedCode];

    if (!discountInfo || !discountInfo.valid) {
      return NextResponse.json({
        code: 1,
        message: '折扣码无效或已过期',
      });
    }

    // 检查是否过期（如果设置了过期时间）
    if (discountInfo.expiresAt) {
      const expiryDate = new Date(discountInfo.expiresAt);
      if (expiryDate < new Date()) {
        return NextResponse.json({
          code: 1,
          message: '折扣码已过期',
        });
      }
    }

    return NextResponse.json({
      code: 0,
      message: '折扣码有效',
      data: {
        code: normalizedCode,
        discount: discountInfo.discount,
        description: discountInfo.description,
      },
    });
  } catch (error: any) {
    console.error('Discount validation error:', error);
    return NextResponse.json(
      {
        code: 1,
        message: error.message || '验证失败',
      },
      { status: 500 }
    );
  }
}
