import type { SupplierIncomeSummaryVO } from '@/types/supplier'

/**
 * 获取供应商收入汇总数据
 * 包含汇总(零售+批发)、零售(biz_line=1)、批发(biz_line=2) 三个维度
 * 每个维度分别统计：当天/近七天/本月/本年收入，当天和近七天含增长率
 */
export function getSupplierIncomeSummary(): Promise<SupplierIncomeSummaryVO> {
  // TODO: 对接真实后端接口，示例: return request.get('/pay/supplier-wallet-income-sum/summary')
  return Promise.resolve(mockData)
}

/** Mock 数据，用于前端开发联调 */
const mockData: SupplierIncomeSummaryVO = {
  total: {
    today: { amount: 856305, growthRate: 12.5 },
    week: { amount: 4528000, growthRate: -2.5 },
    month: { amount: 18642025, growthRate: undefined },
    year: { amount: 124568014, growthRate: undefined }
  },
  retail: {
    today: { amount: 856305, growthRate: 12.5 },
    week: { amount: 4528000, growthRate: 12.5 },
    month: { amount: 18642025, growthRate: undefined },
    year: { amount: 124568014, growthRate: undefined }
  },
  wholesale: {
    today: { amount: 856305, growthRate: 12.5 },
    week: { amount: 4528000, growthRate: 12.5 },
    month: { amount: 18642025, growthRate: undefined },
    year: { amount: 124568014, growthRate: undefined }
  }
}
