<template>
  <div class="supplier-income">
    <header class="page-header">
      <span class="home-icon">🏠</span>
      <h1 class="page-title">供应商</h1>
      <div class="header-actions">
        <span class="dot-indicator"></span>
      </div>
    </header>

    <!-- 汇总信息 -->
    <IncomeSection title="汇总信息" :data="summaryData.total" :labels="totalLabels" />

    <!-- 零售商品 -->
    <IncomeSection title="零售商品" :data="summaryData.retail" :labels="bizLabels" />

    <!-- 批发商品 -->
    <IncomeSection title="批发商品" :data="summaryData.wholesale" :labels="bizLabels" />

    <!-- 底部导航 -->
    <nav class="bottom-nav">
      <div class="nav-item">
        <span class="nav-icon">🛍️</span>
        <span class="nav-label">商品</span>
      </div>
      <div class="nav-item active">
        <span class="nav-icon">📈</span>
        <span class="nav-label">销量</span>
      </div>
      <div class="nav-item">
        <span class="nav-icon">👤</span>
        <span class="nav-label">我的</span>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { SupplierIncomeSummaryVO } from '@/types/supplier'
import { getSupplierIncomeSummary } from '@/api/supplier'
import IncomeSection from './components/IncomeSection.vue'

const summaryData = ref<SupplierIncomeSummaryVO>({
  total: {
    today: { amount: 0 },
    week: { amount: 0 },
    month: { amount: 0 },
    year: { amount: 0 }
  },
  retail: {
    today: { amount: 0 },
    week: { amount: 0 },
    month: { amount: 0 },
    year: { amount: 0 }
  },
  wholesale: {
    today: { amount: 0 },
    week: { amount: 0 },
    month: { amount: 0 },
    year: { amount: 0 }
  }
})

const totalLabels = {
  today: '今日汇总',
  week: '近七天',
  month: '本月汇总',
  year: '本年汇总'
}

const bizLabels = {
  today: '今日收入',
  week: '近七天',
  month: '本月收入',
  year: '本年收入'
}

onMounted(async () => {
  const data = await getSupplierIncomeSummary()
  summaryData.value = data
})
</script>

<style scoped lang="scss">
.supplier-income {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 70px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #fff;

  .home-icon {
    font-size: 20px;
    cursor: pointer;
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .header-actions {
    .dot-indicator {
      display: inline-block;
      width: 24px;
      height: 24px;
      border-radius: 12px;
      background: #e0e0e0;
    }
  }
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  max-width: 430px;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 10px 0;
  background: #fff;
  border-top: 1px solid #eee;

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;

    .nav-icon {
      font-size: 20px;
    }

    .nav-label {
      font-size: 12px;
      color: #999;
    }

    &.active .nav-label {
      color: #1890ff;
    }
  }
}
</style>
