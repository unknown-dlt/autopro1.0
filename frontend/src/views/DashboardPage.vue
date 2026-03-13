<template>
  <div class="page">
    <h1 class="page-title">Обзор</h1>
    <div class="cards-row">
      <div class="card">
        <div class="card-label">Выставлено счетов</div>
        <div class="card-value">{{ summary.activeRevenue }} ₽</div>
      </div>
      <div class="card">
        <div class="card-label">Запчасти на складе</div>
        <div class="card-value">
          {{ summary.partsCount }} шт. / {{ summary.partsTotalValue }} ₽
        </div>
      </div>
      <div class="card">
        <div class="card-label">Записей на сервис</div>
        <div class="card-value">{{ summary.appointments }}</div>
      </div>
    </div>

    <div class="two-columns">
      <div class="card">
        <div class="card-header">
          <h2>Расписание на сегодня</h2>
          <span class="muted">{{ todayLabel }}</span>
        </div>
        <div v-if="!todayAppointments.length" class="muted">
          На сегодня записей пока нет.
        </div>
        <ul v-else class="list">
          <li v-for="a in todayAppointments" :key="a.id" class="list-item">
            <div class="row-between">
              <span class="time">{{ formatTime(a.datetime) }}</span>
              <span class="badge">{{ statusLabel(a.status) }}</span>
            </div>
            <div class="small">
              {{ a.clientName }} — {{ a.carModel }} ({{ a.licensePlate }})
            </div>
          </li>
        </ul>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>Активные механики сегодня</h2>
          <span class="muted">{{ todayLabel }}</span>
        </div>
        <div v-if="!activeMechanics.length" class="muted">
          Нет активных механиков.
        </div>
        <ul v-else class="list">
          <li v-for="m in activeMechanics" :key="m.id" class="list-item row-between">
            <span>{{ m.fullName }}</span>
            <span class="badge badge-green">Активен</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-header">
        <h2>График работ за месяц</h2>
        <span class="muted">Количество записей по дням</span>
      </div>
      <div v-if="!dailyWork.length" class="muted">
        Пока нет данных для графика.
      </div>
      <div v-else class="work-line-chart-wrap">
        <div class="work-line-main">
          <div class="work-line-yaxis">
            <span
              v-for="tick in yTicks"
              :key="tick"
              class="work-line-ylabel"
            >
              {{ tick }}
            </span>
          </div>
          <svg
            viewBox="0 0 100 60"
            preserveAspectRatio="none"
            class="work-line-chart"
          >
            <!-- горизонтальные линии сетки -->
            <g class="work-line-grid">
              <line v-for="y in [10,20,30,40,50]" :key="y" :x1="0" :x2="100" :y1="y" :y2="y" />
            </g>
            <!-- заливка под графиком -->
            <polygon
              v-if="chartAreaPoints"
              class="work-area"
              :points="chartAreaPoints"
            />
            <!-- линия графика -->
            <polyline
              class="work-line"
              :points="chartPoints"
            />
          </svg>
        </div>
        <div class="work-line-labels">
          <span
            v-for="day in dailyWork"
            :key="day.date"
            class="work-line-label"
          >
            {{ formatDayLabel(day.date) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "DashboardPage",
  data() {
    return {
      summary: {
        partsCount: 0,
        partsTotalValue: "0",
        appointments: 0,
        monthlyActiveAppointments: 0,
        activeRevenue: 0,
      },
      todayAppointments: [],
      activeMechanics: [],
      dailyWork: [],
    };
  },
  computed: {
    todayLabel() {
      const d = new Date();
      return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
    maxDailyCount() {
      // фиксированный максимум для графика: 35 работ в день
      return 35;
    },
    chartPointObjects() {
      if (!this.dailyWork.length) return [];
      const max = this.maxDailyCount || 1;
      const n = this.dailyWork.length;
      return this.dailyWork.map((d, idx) => {
        const x =
          n === 1 ? 50 : (idx / (n - 1)) * 94 + 3; // 3–97% по оси X
        const ratio = (d.count || 0) / max;
        const y = 55 - ratio * 40; // 15–55% по оси Y (чем больше, тем выше)
        return { x, y };
      });
    },
    chartPoints() {
      return this.chartPointObjects.map((p) => `${p.x},${p.y}`).join(" ");
    },
    chartAreaPoints() {
      if (!this.chartPointObjects.length) return "";
      const pts = this.chartPointObjects;
      const start = `0,60`;
      const end = `100,60`;
      const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
      return `${start} ${line} ${end}`;
    },
    yTicks() {
      // фиксированная шкала для сервиса: до 35 работ в день
      return [35, 30, 25, 20, 15, 10, 5, 0];
    },
  },
  async created() {
    const { data } = await axios.get("/api/dashboard");
    this.summary.partsCount = data.partsCount;
    this.summary.partsTotalValue = data.partsTotalValue.toLocaleString("ru-RU");
    this.summary.appointments = data.appointments;
    this.summary.monthlyActiveAppointments = data.monthlyActiveAppointments;
    this.summary.activeRevenue = (data.activeRevenue || 0).toLocaleString("ru-RU");
    this.todayAppointments = data.todaysAppointments || [];
    this.activeMechanics = data.activeMechanics || [];
    this.dailyWork = data.dailyWork || [];
  },
  methods: {
    formatTime(iso) {
      const d = new Date(iso);
      return d.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    statusLabel(status) {
      const map = {
        CREATED: "Создана",
        CONFIRMED: "Подтверждена",
        IN_PROGRESS: "В работе",
        COMPLETED: "Завершена",
        CANCELLED: "Отменена",
      };
      return map[status] || status || "—";
    },
    formatDayLabel(iso) {
      const d = new Date(iso);
      return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });
    },
  },
};
</script>

