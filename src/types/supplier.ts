/** 业务线类型: 1=零售, 2=批发 */
export type BizLineType = 1 | 2

/** 单个时间维度的收入数据 */
export interface IncomeMetric {
  /** 收入金额，单位：分 */
  amount: number
  /** 增长率（百分比），仅 today/week 有值 */
  growthRate?: number
}

/** 某个业务线的收入汇总 */
export interface BizLineIncomeSummary {
  /** 今日收入 */
  today: IncomeMetric
  /** 近七天收入 */
  week: IncomeMetric
  /** 本月收入 */
  month: IncomeMetric
  /** 本年收入 */
  year: IncomeMetric
}

/** 供应商收入汇总响应 */
export interface SupplierIncomeSummaryVO {
  /** 汇总（零售+批发） */
  total: BizLineIncomeSummary
  /** 零售 biz_line=1 */
  retail: BizLineIncomeSummary
  /** 批发 biz_line=2 */
  wholesale: BizLineIncomeSummary
}
