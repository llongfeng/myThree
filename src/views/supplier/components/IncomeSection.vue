<template>
  <div class="income-section">
    <div class="section-header">
      <h2 class="section-title">{{ title }}</h2>
      <div class="section-dots">
        <span v-for="i in 5" :key="i" class="dot"></span>
      </div>
    </div>

    <div class="metrics-grid">
      <!-- 今日 -->
      <div class="metric-card">
        <div class="metric-trend">
          <span class="trend-icon">📈</span>
          <span
            v-if="data.today.growthRate !== undefined"
            class="growth-rate"
            :class="data.today.growthRate >= 0 ? 'positive' : 'negative'"
          >
            {{ formatGrowthRate(data.today.growthRate) }}
          </span>
        </div>
        <div class="metric-label">{{ labels.today }}</div>
        <div class="metric-amount">¥{{ formatAmount(data.today.amount) }}</div>
      </div>

      <!-- 近七天 -->
      <div class="metric-card">
        <div class="metric-trend">
          <span class="trend-icon">📈</span>
          <span
            v-if="data.week.growthRate !== undefined"
            class="growth-rate"
            :class="data.week.growthRate >= 0 ? 'positive' : 'negative'"
          >
            {{ formatGrowthRate(data.week.growthRate) }}
          </span>
        </div>
        <div class="metric-label">{{ labels.week }}</div>
        <div class="metric-amount">¥{{ formatAmount(data.week.amount) }}</div>
      </div>

      <!-- 本月 -->
      <div class="metric-card">
        <div class="metric-trend">
          <span class="trend-icon">📈</span>
        </div>
        <div class="metric-label">{{ labels.month }}</div>
        <div class="metric-amount">¥{{ formatAmount(data.month.amount) }}</div>
      </div>

      <!-- 本年 -->
      <div class="metric-card">
        <div class="metric-trend">
          <span class="trend-icon">📈</span>
        </div>
        <div class="metric-label">{{ labels.year }}</div>
        <div class="metric-amount">¥{{ formatAmount(data.year.amount) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BizLineIncomeSummary } from '@/types/supplier'

interface Labels {
  today: string
  week: string
  month: string
  year: string
}

defineProps<{
  title: string
  data: BizLineIncomeSummary
  labels: Labels
}>()

/** 金额格式化: 分 → 元，保留两位小数，添加千分位 */
function formatAmount(amountInCents: number): string {
  const yuan = amountInCents / 100
  return yuan.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** 增长率格式化 */
function formatGrowthRate(rate: number): string {
  const prefix = rate >= 0 ? '+' : ''
  return `${prefix}${rate.toFixed(1)}%`
}
</script>

<style scoped lang="scss">
.income-section {
  margin: 12px 16px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #1890ff;
  }

  .section-dots {
    display: flex;
    gap: 4px;

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #1890ff;
      opacity: 0.6;
    }
  }
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.metric-card {
  .metric-trend {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;

    .trend-icon {
      font-size: 16px;
    }

    .growth-rate {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;

      &.positive {
        color: #52c41a;
        background: #f6ffed;
      }

      &.negative {
        color: #ff4d4f;
        background: #fff2f0;
      }
    }
  }

  .metric-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 4px;
  }

  .metric-amount {
    font-size: 18px;
    font-weight: 700;
    color: #333;
  }
}
</style>
