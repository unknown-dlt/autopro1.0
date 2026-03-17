<template>
  <div class="page page--schedule">
    <h1 class="page-title">Расписание</h1>

    <div class="card">
      <div class="schedule-calendar-header">
        <button type="button" class="schedule-month-arrow" aria-label="Предыдущий месяц" @click="prevMonth">←</button>
        <h2>Месяц {{ monthLabel }}</h2>
        <button type="button" class="schedule-month-arrow" aria-label="Следующий месяц" @click="nextMonth">→</button>
      </div>
      <transition name="slide-fade" mode="out-in">
        <div class="schedule-calendar-grid" :key="calendarMonth">
          <div
            v-for="d in weekDays"
            :key="d"
            class="schedule-day-name"
          >
            {{ d }}
          </div>
          <div
            v-for="day in monthDays"
            :key="day.date"
            class="schedule-day-cell"
            :class="{
              today: day.isToday,
              selected: day.date === selectedDate,
            }"
            @click="selectDate(day.date)"
            @dblclick="setFormDate(day.date)"
          >
            {{ day.day }}
          </div>
        </div>
      </transition>
    </div>

    <div class="schedule-layout">
      <div class="card schedule-day-card">
        <div class="schedule-day-header">
          <button
            type="button"
            class="schedule-month-arrow"
            aria-label="Предыдущий день"
            @click="prevDay"
          >
            ←
          </button>
          <h2>День {{ formatDate(selectedDate) }}</h2>
          <button
            type="button"
            class="schedule-month-arrow"
            aria-label="Следующий день"
            @click="nextDay"
          >
            →
          </button>
        </div>
        <transition name="slide-fade" mode="out-in">
          <div class="schedule-day-body" :key="selectedDate">
            <div
              v-for="h in hours"
              :key="h"
              class="schedule-hour-row"
            >
              <div class="schedule-hour-label">
                {{ h }}:00
              </div>
              <div class="schedule-hour-slot">
                <div
                  v-for="(a, idx) in appointmentsByHour[h]"
                  :key="a.id"
                  class="schedule-appointment-chip"
                  :style="appointmentStyle(a, idx, appointmentsByHour[h].length)"
                  @dblclick.stop="openDetails(a)"
                >
                  <div class="schedule-appointment-title">
                    {{ a.clientName || "Без имени" }}
                    <span v-if="a.phone"> · {{ a.phone }}</span>
                  </div>
                  <div class="schedule-appointment-meta">
                    {{ formatTime(a.datetime) }} · {{ serviceName(a.serviceId) }}
                  </div>
                  <button
                    class="schedule-appointment-remove"
                    type="button"
                    @click.stop="remove(a.id)"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div class="card appointment-form-card">
        <div class="appointment-form-header">
          <h2>Новая запись</h2>
          <button
            type="button"
            class="appointment-form-add"
            aria-label="Новая пустая запись"
            @click="openBlankForm"
          >
            +
          </button>
        </div>
        <div class="appointment-form">
          <div class="appointment-form-row">
            <label class="appointment-form-label">Дата</label>
            <input v-model="form.date" class="input appointment-form-input" type="date" />
          </div>
          <div class="appointment-form-row">
            <label class="appointment-form-label">Время</label>
            <input v-model="form.time" class="input appointment-form-input" type="time" />
          </div>
          <div class="appointment-form-row">
            <label class="appointment-form-label">Клиент</label>
            <input
              :value="form.clientName"
              class="input appointment-form-input"
              placeholder="ФИО или имя"
              @keydown="onClientNameKeydown"
              @input="form.clientName = nameOnly($event.target.value)"
            />
          </div>
          <div class="appointment-form-row">
            <label class="appointment-form-label">Телефон</label>
            <input
              :value="form.phone"
              class="input appointment-form-input"
              placeholder="+7 (___) ___-__-__"
              @keydown="onPhoneKeydown"
              @input="onPhoneInput"
            />
          </div>
          <div class="appointment-form-row appointment-form-row--double">
            <div class="appointment-form-field">
              <label class="appointment-form-label">Модель авто</label>
              <input v-model="form.carModel" class="input appointment-form-input" placeholder="Модель" />
            </div>
            <div class="appointment-form-field">
              <label class="appointment-form-label">Год</label>
              <input
                :value="form.carYear"
                class="input appointment-form-input"
                placeholder="Год"
                @keydown="onYearKeydown"
                @input="form.carYear = digitsOnlyMax($event.target.value, 4)"
              />
            </div>
          </div>
          <div class="appointment-form-row appointment-form-row--double">
            <div class="appointment-form-field">
              <label class="appointment-form-label">Госномер</label>
              <input
                :value="form.licensePlate"
                class="input appointment-form-input"
                placeholder="А 000 АА 00"
                @keydown="onLicensePlateKeydown"
                @input="onLicensePlateInput"
              />
            </div>
            <div class="appointment-form-field">
              <label class="appointment-form-label">VIN</label>
              <input
                :value="form.vin"
                class="input appointment-form-input"
                placeholder="17 символов"
                @keydown="onVinKeydown"
                @input="form.vin = vinOnly($event.target.value, 17)"
              />
            </div>
          </div>
          <div class="appointment-form-row appointment-form-row--triple">
            <div class="appointment-form-field">
              <label class="appointment-form-label">Услуга</label>
              <select v-model.number="form.serviceId" class="input appointment-form-input">
                <option disabled :value="0">Выберите</option>
                <option v-for="s in services" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>
            <div class="appointment-form-field">
              <label class="appointment-form-label">Механик</label>
              <select v-model.number="form.mechanicId" class="input appointment-form-input">
                <option disabled :value="0">Выберите</option>
                <option v-for="m in mechanics" :key="m.id" :value="m.id">
                  {{ m.fullName }}
                </option>
              </select>
            </div>
            <div class="appointment-form-field">
              <label class="appointment-form-label">Статус</label>
              <select v-model="form.status" class="input appointment-form-input">
                <option disabled value="">Выберите</option>
                <option value="CREATED">Создан</option>
                <option value="CONFIRMED">Подтверждён</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="COMPLETED">Завершён</option>
                <option value="CANCELLED">Отменён</option>
              </select>
            </div>
          </div>
          <div class="appointment-form-row">
            <label class="appointment-form-label">Необходимые детали</label>
            <div class="appointment-form-parts-row">
              <select
                v-model.number="newPart.partId"
                class="input appointment-form-input"
              >
                <option :value="0" disabled>Выберите деталь</option>
                <option v-for="p in parts" :key="p.id" :value="p.id">
                  {{ p.article }} · {{ p.name }}
                </option>
              </select>
              <input
                :value="newPart.quantity"
                class="input appointment-form-input appointment-form-input--small"
                placeholder="Кол-во"
                @keydown="onDigitsKeydown"
                @input="newPart.quantity = digitsOnlyMax($event.target.value, 3)"
              />
              <button
                type="button"
                class="appointment-form-add"
                @click="addRequiredPart"
              >
                +
              </button>
            </div>
            <div v-if="form.requiredParts.length" class="appointment-form-parts-list">
              <span
                v-for="(rp, idx) in form.requiredParts"
                :key="rp.partId + '-' + idx"
                class="appointment-part-chip"
              >
                {{ partLabel(rp.partId) }} × {{ rp.quantity }}
                <button
                  type="button"
                  class="appointment-part-remove"
                  @click="removeRequiredPart(idx)"
                >
                  ×
                </button>
              </span>
            </div>
          </div>
          <div class="appointment-form-row">
            <label class="appointment-form-label">Комментарий</label>
            <textarea
              v-model="form.comment"
              class="input appointment-form-input appointment-form-textarea"
              placeholder="Примечание к записи"
              rows="1"
              @input="autoResizeComment($event)"
            ></textarea>
          </div>
          <div class="appointment-form-row appointment-form-submit">
            <button class="primary-btn appointment-form-btn" @click="submitForm">
              {{ editingId ? "Сохранить" : "Создать запись" }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <transition name="fade-up">
      <div
        v-if="detailsVisible && currentAppointment"
        class="modal-backdrop"
        @click.self="closeDetails"
      >
        <div class="modal-card">
          <div class="modal-header">
            <h3>
              Запись
              {{ formatDate(currentAppointment.datetime.slice(0, 10)) }}
              в
              {{ formatTime(currentAppointment.datetime) }}
            </h3>
            <button type="button" class="modal-close" @click="closeDetails">×</button>
          </div>
          <div class="modal-body">
            <div class="modal-field">
              <div class="modal-label">Клиент</div>
              <div class="modal-value">
                {{ currentAppointment.clientName || "Без имени" }}
                <span v-if="currentAppointment.phone">
                  · {{ currentAppointment.phone }}
                </span>
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Авто</div>
              <div class="modal-value">
                {{ currentAppointment.carModel || "—" }},
                {{ currentAppointment.carYear || "год не указан" }}
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Госномер / VIN</div>
              <div class="modal-value">
                {{ currentAppointment.licensePlate || "—" }}
                <span v-if="currentAppointment.vin">
                  · VIN: {{ currentAppointment.vin }}
                </span>
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Услуга</div>
              <div class="modal-value">
                {{ serviceName(currentAppointment.serviceId) }}
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Механик</div>
              <div class="modal-value">
                {{ mechanicName(currentAppointment.mechanicId) }}
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Статус</div>
              <div class="modal-value">
                {{ statusLabel(currentAppointment.status) }}
              </div>
            </div>
            <div
              v-if="currentAppointment.requiredParts && currentAppointment.requiredParts.length"
              class="modal-field"
            >
              <div class="modal-label">Детали</div>
              <div class="modal-value">
                <div
                  v-for="(rp, idx) in currentAppointment.requiredParts"
                  :key="rp.partId + '-' + idx"
                >
                  {{ partLabel(rp.partId) }} × {{ rp.quantity }}
                </div>
              </div>
            </div>
            <div class="modal-field">
              <div class="modal-label">Комментарий</div>
              <div class="modal-value">
                {{ currentAppointment.comment || "—" }}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="secondary-btn" @click="editFromDetails">
              Редактировать
            </button>
            <button
              type="button"
              class="danger-btn"
              @click="remove(currentAppointment.id)"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import axios from "axios";
import { formatPhone, digitsOnlyMax, nameOnly, vinOnly } from "@/utils/inputFilters";

function toLocalISO(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

function shiftIsoDate(iso, deltaDays) {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, (m || 1) - 1, d || 1);
  base.setDate(base.getDate() + deltaDays);
  return toLocalISO(base);
}

export default {
  name: "SchedulePage",
  data() {
    const now = new Date();
    const today = toLocalISO(now);
    const firstOfMonth = today.slice(0, 7) + "-01";
    return {
      services: [],
      mechanics: [],
      appointments: [],
      parts: [],
      calendarMonth: firstOfMonth,
      selectedDate: today,
      detailsVisible: false,
      currentAppointment: null,
      editingId: null,
      form: {
        date: today,
        time: "09:00",
        clientName: "",
        phone: "",
        carModel: "",
        carYear: "",
        licensePlate: "",
        vin: "",
        serviceId: 0,
        mechanicId: 0,
        status: "",
        comment: "",
        requiredParts: [],
      },
      newPart: {
        partId: 0,
        quantity: "",
      },
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
    await this.loadAppointments();
  },
  computed: {
    hours() {
      const list = [];
      for (let h = 9; h <= 21; h++) list.push(h);
      return list;
    },
    weekDays() {
      return ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    },
    monthLabel() {
      const d = new Date(this.calendarMonth || new Date());
      return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    },
    monthDays() {
      const base = new Date(this.calendarMonth || new Date());
      const year = base.getFullYear();
      const month = base.getMonth();
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const days = [];
      for (let d = 1; d <= last.getDate(); d++) {
        const date = new Date(year, month, d);
        const iso = toLocalISO(date);
        const isToday = iso === toLocalISO(new Date());
        days.push({ date: iso, day: d, isToday });
      }
      const offset = (first.getDay() + 6) % 7;
      for (let i = 0; i < offset; i++) {
        days.unshift({ date: `pad-${i}`, day: "", isToday: false });
      }
      return days;
    },
    appointmentsByDay() {
      const map = {};
      this.appointments.forEach((a) => {
        const day = a.datetime.slice(0, 10);
        if (!map[day]) map[day] = [];
        map[day].push(a);
      });
      return map;
    },
    appointmentsByHour() {
      const res = {};
      this.hours.forEach((h) => (res[h] = []));
      const list = this.appointmentsByDay[this.selectedDate] || [];
      list.forEach((a) => {
        const d = new Date(a.datetime);
        const h = d.getHours();
        if (!res[h]) res[h] = [];
        res[h].push(a);
      });
      return res;
    },
  },
  methods: {
    formatPhone,
    digitsOnlyMax,
    nameOnly,
    vinOnly,
    appointmentStyle(a, index, total) {
      const d = new Date(a.datetime);
      const minutes = d.getMinutes();
      const topPercent = (minutes / 60) * 100;
      const safeTotal = total || 1;
      const widthPercent = 100 / safeTotal;
      const leftPercent = widthPercent * index;
      return {
        top: `calc(${topPercent}% - 12px)`,
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 4px)`,
      };
    },
    openDetails(a) {
      this.currentAppointment = { ...a };
      this.detailsVisible = true;
    },
    closeDetails() {
      this.detailsVisible = false;
      this.currentAppointment = null;
    },
    resetForm() {
      const baseDate = this.selectedDate || toLocalISO(new Date());
      this.form = {
        date: baseDate,
        time: "09:00",
        clientName: "",
        phone: "",
        carModel: "",
        carYear: "",
        licensePlate: "",
        vin: "",
        serviceId: 0,
        mechanicId: 0,
        status: "",
        comment: "",
        requiredParts: [],
      };
      this.newPart = { partId: 0, quantity: "" };
      this.editingId = null;
    },
    openBlankForm() {
      this.form = {
        date: "",
        time: "",
        clientName: "",
        phone: "",
        carModel: "",
        carYear: "",
        licensePlate: "",
        vin: "",
        serviceId: 0,
        mechanicId: 0,
        status: "",
        comment: "",
        requiredParts: [],
      };
      this.newPart = { partId: 0, quantity: "" };
      this.editingId = null;
    },
    onYearKeydown(e) {
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
      const isDigit = /[0-9]/.test(e.key);
      if (!isDigit) {
        e.preventDefault();
        return;
      }
      const digits = (this.form.carYear || "").replace(/\D/g, "");
      if (digits.length >= 4) {
        e.preventDefault();
      }
    },
    onClientNameKeydown(e) {
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
      const allowed = /[A-Za-zА-Яа-яЁё\s\-']/;
      if (!allowed.test(e.key)) {
        e.preventDefault();
      }
    },
    onPhoneKeydown(e) {
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
      const currentDigits = (this.form.phone || "").replace(/\D/g, "");
      if (currentDigits.length >= 11) {
        e.preventDefault();
        return;
      }
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    },
    onLicensePlateKeydown(e) {
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

      const compact = (this.form.licensePlate || "").replace(/\s/g, "");
      const pos = compact.length;

      const isLetter = /^[A-Za-zА-Яа-яЁё]$/.test(e.key);
      const isDigit = /^[0-9]$/.test(e.key);

      // Позиции: 0 — буква, 1-3 — цифры, 4-5 — буквы, 6-8 — цифры
      if (pos === 0) {
        if (!isLetter) e.preventDefault();
        return;
      }
      if (pos >= 1 && pos <= 3) {
        if (!isDigit) e.preventDefault();
        return;
      }
      if (pos === 4 || pos === 5) {
        if (!isLetter) e.preventDefault();
        return;
      }
      if (pos >= 6 && pos <= 8) {
        if (!isDigit) e.preventDefault();
        return;
      }
      // Больше 9 символов (A000AA000) не разрешаем
      e.preventDefault();
    },
    onLicensePlateInput(e) {
      const raw = (e.target.value || "")
        .toUpperCase()
        .replace(/[^A-ZА-ЯЁ0-9]/g, "");
      const compact = raw.slice(0, 9);

      let res = "";
      if (compact.length > 0) {
        res += compact[0]; // A
      }
      if (compact.length > 1) {
        const digits1 = compact.slice(1, Math.min(4, compact.length)); // 000
        if (digits1) res += " " + digits1;
      }
      if (compact.length > 4) {
        const letters2 = compact.slice(4, Math.min(6, compact.length)); // AA
        if (letters2) res += " " + letters2;
      }
      if (compact.length > 6) {
        const region = compact.slice(6); // 00 или 000
        if (region) res += " " + region;
      }
      this.form.licensePlate = res;
    },
    onVinKeydown(e) {
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
      const allowed = /^[A-Za-zА-Яа-яЁё0-9]$/;
      if (!allowed.test(e.key)) {
        e.preventDefault();
        return;
      }
      const current = (this.form.vin || "").replace(/\s/g, "");
      if (current.length >= 17) {
        e.preventDefault();
      }
    },
    addRequiredPart() {
      const partId = Number(this.newPart.partId) || 0;
      const qty = Number(this.newPart.quantity) || 0;
      if (!partId || qty <= 0) return;
      const existing = this.form.requiredParts.find((rp) => rp.partId === partId);
      if (existing) {
        existing.quantity += qty;
      } else {
        this.form.requiredParts.push({ partId, quantity: qty });
      }
      this.newPart = { partId: 0, quantity: "" };
    },
    removeRequiredPart(index) {
      this.form.requiredParts.splice(index, 1);
    },
    partLabel(partId) {
      const p = this.parts.find((x) => x.id === partId);
      if (!p) return `ID ${partId}`;
      return `${p.article} · ${p.name}`;
    },
    onDigitsKeydown(e) {
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
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    },
    formatTime(datetime) {
      const d = new Date(datetime);
      return d.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    autoResizeComment(e) {
      const el = e.target;
      if (!el) return;
      el.style.height = "auto";
      const maxHeight = 180; // немного больше, но всё ещё внутри блока
      const newHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = newHeight + "px";
    },
    onPhoneInput(e) {
      this.form.phone = formatPhone(e.target.value);
    },
    prevMonth() {
      const d = new Date(this.calendarMonth);
      d.setMonth(d.getMonth() - 1);
      this.calendarMonth = d.toISOString().slice(0, 7) + "-01";
    },
    nextMonth() {
      const d = new Date(this.calendarMonth);
      d.setMonth(d.getMonth() + 1);
      this.calendarMonth = d.toISOString().slice(0, 7) + "-01";
    },
    prevDay() {
      const iso = shiftIsoDate(this.selectedDate, -1);
      this.selectedDate = iso;
      this.form.date = iso;
      this.calendarMonth = iso.slice(0, 7) + "-01";
    },
    nextDay() {
      const iso = shiftIsoDate(this.selectedDate, 1);
      this.selectedDate = iso;
      this.form.date = iso;
      this.calendarMonth = iso.slice(0, 7) + "-01";
    },
    async loadAppointments() {
      const { data } = await axios.get("/api/appointments");
      this.appointments = data;
    },
    async submitForm() {
      if (!this.form.clientName.trim()) return;
      if (!this.form.status) {
        window.alert("Выберите статус записи.");
        return;
      }
      const isEdit = !!this.editingId;
      const confirmText = isEdit
        ? "Сохранить изменения записи?"
        : "Проверьте данные. Сохранить запись?";
      if (!window.confirm(confirmText)) {
        return;
      }
      const datetime = new Date(
        this.form.date + "T" + this.form.time + ":00"
      ).toISOString();
      const payload = {
        ...this.form,
        datetime,
        serviceId: this.form.serviceId || null,
        mechanicId: this.form.mechanicId || null,
      };
      try {
        if (isEdit) {
          await axios.put(`/api/appointments/${this.editingId}`, payload);
        } else {
          await axios.post("/api/appointments", payload);
        }
        await this.loadAppointments();
        this.resetForm();
      } catch (e) {
        const message =
          (e.response && e.response.data && e.response.data.error) ||
          "Не удалось сохранить запись. Попробуйте ещё раз.";
        window.alert(message);
      }
    },
    editFromDetails() {
      if (!this.currentAppointment) return;
      const a = this.currentAppointment;
      const d = new Date(a.datetime);
      const isoDate = toLocalISO(d);
      const time = d.toTimeString().slice(0, 5);
      this.selectedDate = isoDate;
      this.calendarMonth = isoDate.slice(0, 7) + "-01";
      this.form = {
        date: isoDate,
        time,
        clientName: a.clientName || "",
        phone: a.phone || "",
        carModel: a.carModel || "",
        carYear: a.carYear || "",
        licensePlate: a.licensePlate || "",
        vin: a.vin || "",
        serviceId: a.serviceId || 0,
        mechanicId: a.mechanicId || 0,
        status: a.status || "CREATED",
        comment: a.comment || "",
        requiredParts: Array.isArray(a.requiredParts)
          ? a.requiredParts.map((rp) => ({
              partId: Number(rp.partId || rp.id) || 0,
              quantity: Number(rp.quantity) || 0,
            }))
          : [],
      };
      this.detailsVisible = false;
      this.editingId = a.id || null;
    },
    selectDate(date) {
      if (date.startsWith("pad-")) return;
      this.selectedDate = date;
    },
    setFormDate(date) {
      if (date.startsWith("pad-")) return;
      this.selectedDate = date;
      this.form.date = date;
    },
    async remove(id) {
      if (!confirm("Удалить запись из расписания?")) return;
      await axios.delete(`/api/appointments/${id}`);
      await this.loadAppointments();
    },
    serviceName(id) {
      const s = this.services.find((x) => x.id === id);
      return s ? s.name : "—";
    },
    mechanicName(id) {
      const m = this.mechanics.find((x) => x.id === id);
      return m ? m.fullName : "—";
    },
    formatDate(iso) {
      const d = new Date(iso);
      return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
    statusLabel(s) {
      if (!s) return "—";
      const map = {
        CREATED: "Создан",
        CONFIRMED: "Подтверждён",
        IN_PROGRESS: "В работе",
        COMPLETED: "Завершён",
        CANCELLED: "Отменён",
      };
      return map[s] || s;
    },
  },
};
</script>
<style scoped>
.appointment-form-textarea {
  resize: none;
  min-height: 40px;
  max-height: 180px;
  line-height: 1.4;
}
</style>

