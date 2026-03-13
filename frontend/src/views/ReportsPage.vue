<template>
  <div class="page">
    <h1 class="page-title">Отчёты</h1>
    <div class="card">
      <h2>Период</h2>
      <div class="form-row">
        <input
          :value="period"
          class="input"
          placeholder="ГГГГ-ММ (например 2026-03)"
          @keydown="onPeriodKeydown"
          @input="onPeriodInput"
        />
        <button class="primary-btn" @click="load">Обновить</button>
      </div>
      <div class="cards-row" style="margin-top:12px;">
        <div class="card">
          <div class="card-label">Выручка за период</div>
          <div class="card-value">{{ report.revenue }} ₽</div>
        </div>
        <div class="card">
          <div class="card-label">Завершённых заявок</div>
          <div class="card-value">{{ report.completedCount }}</div>
        </div>
        <div class="card">
          <div class="card-label">Фонд оплаты труда механиков</div>
          <div class="card-value">{{ report.totalPayroll }} ₽</div>
        </div>
      </div>
    </div>

    <div class="card table-card" style="margin-top:16px;">
      <h2>По услугам</h2>
      <table>
        <thead>
          <tr>
            <th>Услуга</th>
            <th>Кол-во</th>
            <th>Выручка</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in report.byService" :key="row.name">
            <td>{{ row.name }}</td>
            <td>{{ row.count }}</td>
            <td>{{ row.revenue }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card table-card" style="margin-top:16px;">
      <h2>Заработная плата механиков</h2>
      <table>
        <thead>
          <tr>
            <th>Механик</th>
            <th>Должность</th>
            <th>Выполнено работ</th>
            <th>Оклад</th>
            <th>Доплата за работу</th>
            <th>Итого зарплата</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in report.byMechanic" :key="row.id">
            <td>{{ row.name }}</td>
            <td>{{ row.position }}</td>
            <td>{{ row.completedCount }}</td>
            <td>{{ row.baseSalary }} ₽</td>
            <td>{{ row.bonusTotal }} ₽ ({{ row.bonusPerService }} ₽ × {{ row.completedCount }})</td>
            <td>{{ row.totalSalary }} ₽</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "ReportsPage",
  data() {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    return {
      period: ym,
      report: {
        revenue: 0,
        completedCount: 0,
        byService: [],
        totalPayroll: 0,
        byMechanic: [],
      },
    };
  },
  async created() {
    await this.load();
  },
  methods: {
    onPeriodKeydown(e) {
      const controlKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Tab",
        "Enter",
        "Home",
        "End",
      ];
      if (controlKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      const isDigit = /^[0-9]$/.test(e.key);
      const isDash = e.key === "-";
      if (!isDigit && !isDash) {
        e.preventDefault();
        return;
      }
      const raw = (this.period || "").replace(/[^0-9-]/g, "");
      // Формат YYYY-MM: максимум 7 символов, тире только на позиции 4
      if (raw.length >= 7) {
        e.preventDefault();
        return;
      }
      if (isDash && raw.length !== 4) {
        e.preventDefault();
      }
    },
    onPeriodInput(e) {
      let v = (e.target.value || "").replace(/[^0-9-]/g, "");
      // Удаляем все тире и вставляем одно после года
      v = v.replace(/-/g, "");
      if (v.length > 6) v = v.slice(0, 6);
      if (v.length >= 5) {
        v = v.slice(0, 4) + "-" + v.slice(4);
      }
      this.period = v;
    },
    async load() {
      const { data } = await axios.get("/api/reports", {
        params: { period: this.period },
      });
      this.report = data;
    },
  },
};
</script>

