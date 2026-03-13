<template>
  <div class="page">
    <h1 class="page-title">История обслуживаний</h1>
    <div class="card">
      <h2>Найти историю по госномеру</h2>
      <div class="form-row">
        <input
          v-model="plate"
          class="input flex-1"
          placeholder="Например, А123ВС77"
        />
        <button class="primary-btn" @click="search">Найти</button>
      </div>
    </div>
    <div class="card table-card" v-if="items.length">
      <table>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Госномер</th>
            <th>Услуга</th>
            <th>Механик</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="h in items"
            :key="h.id"
            @dblclick="openDetails(h)"
            style="cursor:pointer;"
          >
            <td>{{ formatDate(h.datetime) }}</td>
            <td>{{ h.licensePlate }}</td>
            <td>{{ serviceName(h.serviceId) }}</td>
            <td>{{ mechanicName(h.mechanicId) }}</td>
            <td>{{ statusLabel(h.status) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="muted" style="margin-top:16px;">
      Ничего не найдено.
    </div>

    <transition name="fade-up">
      <div
        v-if="detailsVisible && current"
        class="modal-backdrop"
        @click.self="closeDetails"
      >
        <div class="modal-card">
          <div class="modal-header">
            <h3>
              Обслуживание
              {{ formatDate(current.datetime) }}
              в
              {{ formatTime(current.datetime) }}
            </h3>
            <button type="button" class="modal-close" @click="closeDetails">×</button>
          </div>
          <div class="modal-body">
            <div class="modal-field">
              <div class="modal-label">Клиент</div>
              <div class="modal-value">
                {{ current.clientName || "Без имени" }}
                <span v-if="current.phone">
                  · {{ current.phone }}
                </span>
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Авто</div>
              <div class="modal-value">
                {{ current.carModel || "—" }},
                {{ current.carYear || "год не указан" }}
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Госномер / VIN</div>
              <div class="modal-value">
                {{ current.licensePlate || "—" }}
                <span v-if="current.vin">
                  · VIN: {{ current.vin }}
                </span>
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Услуга</div>
              <div class="modal-value">
                {{ serviceName(current.serviceId) }}
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Механик</div>
              <div class="modal-value">
                {{ mechanicName(current.mechanicId) }}
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Статус</div>
              <div class="modal-value">
                {{ statusLabel(current.status) }}
              </div>
            </div>
            <div
              v-if="current.requiredParts && current.requiredParts.length"
              class="modal-field"
            >
              <div class="modal-label">Детали</div>
              <div class="modal-value">
                <div
                  v-for="(rp, idx) in current.requiredParts"
                  :key="rp.partId + '-' + idx"
                >
                  {{ partLabel(rp.partId) }} × {{ rp.quantity }}
                </div>
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Комментарий</div>
              <div class="modal-value">
                {{ current.comment || "—" }}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="secondary-btn" @click="closeDetails">
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "HistoryPage",
  data() {
    return {
      plate: "",
      items: [],
      services: [],
      mechanics: [],
      parts: [],
      detailsVisible: false,
      current: null,
    };
  },
  async created() {
    const [s, m, p] = await Promise.all([
      axios.get("/api/services"),
      axios.get("/api/mechanics"),
      axios.get("/api/parts"),
    ]);
    this.services = s.data;
    this.mechanics = m.data;
    this.parts = p.data;
    await this.search();
  },
  methods: {
    async search() {
      const params = this.plate.trim()
        ? { params: { plate: this.plate.trim() } }
        : {};
      const { data } = await axios.get("/api/history", params);
      this.items = data;
    },
    formatDate(iso) {
      const d = new Date(iso);
      return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
    formatTime(iso) {
      const d = new Date(iso);
      return d.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    serviceName(id) {
      const s = this.services.find((x) => x.id === id);
      return s ? s.name : "—";
    },
    mechanicName(id) {
      const m = this.mechanics.find((x) => x.id === id);
      return m ? m.fullName : "—";
    },
    partLabel(partId) {
      const p = this.parts.find((x) => x.id === partId);
      if (!p) return `ID ${partId}`;
      return `${p.article} · ${p.name}`;
    },
    statusLabel(s) {
      const map = {
        CREATED: "Создана",
        CONFIRMED: "Подтверждена",
        IN_PROGRESS: "В работе",
        COMPLETED: "Завершена",
        CANCELLED: "Отменена",
      };
      return map[s] || s || "—";
    },
    openDetails(h) {
      const a = h.appointment || {};
      const datetime = h.datetime || a.datetime;
      this.current = {
        datetime,
        clientName: a.clientName || "",
        phone: a.phone || "",
        carModel: a.carModel || "",
        carYear: a.carYear || "",
        licensePlate: h.licensePlate || a.licensePlate || "",
        vin: a.vin || "",
        serviceId: h.serviceId || a.serviceId || null,
        mechanicId: h.mechanicId || a.mechanicId || null,
        status: h.status || a.status || "",
        comment: a.comment || "",
        requiredParts: Array.isArray(a.requiredParts)
          ? a.requiredParts.map((rp) => ({
              partId: Number(rp.partId || rp.id) || 0,
              quantity: Number(rp.quantity) || 0,
            }))
          : [],
      };
      this.detailsVisible = true;
    },
    closeDetails() {
      this.detailsVisible = false;
      this.current = null;
    },
  },
};
</script>

