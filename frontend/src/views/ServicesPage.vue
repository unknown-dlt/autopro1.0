<template>
  <div class="page">
    <h1 class="page-title">Каталог услуг</h1>
    <div class="card">
      <h2>Добавить услугу</h2>
      <div class="form-row">
        <input v-model="form.name" class="input flex-1" placeholder="Название" />
        <input
          :value="form.duration"
          class="input"
          placeholder="Длительность (мин)"
          @keydown="onDigitsKeydown"
          @input="form.duration = digitsOnly($event.target.value)"
        />
        <input
          :value="form.price"
          class="input"
          placeholder="Цена (в руб.)"
          @keydown="onDigitsKeydown"
          @input="form.price = digitsOnly($event.target.value)"
        />
        <input
          v-model="form.description"
          class="input flex-1"
          placeholder="Описание"
        />
        <button class="primary-btn" @click="saveNew">Добавить</button>
      </div>
    </div>
    <div class="card table-card">
      <table class="services-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Описание</th>
            <th>Длительность (мин)</th>
            <th>Цена</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in services" :key="s.id">
            <td class="col-name">
              <input v-if="editingId === s.id" v-model="editForm.name" class="input input-full" />
              <span v-else>{{ s.name }}</span>
            </td>
            <td class="col-description">
              <input v-if="editingId === s.id" v-model="editForm.description" class="input input-full" />
              <span v-else>{{ s.description }}</span>
            </td>
            <td class="col-duration">
              <input
                v-if="editingId === s.id"
                :value="editForm.duration"
                class="input input-edit-duration"
                @keydown="onDigitsKeydown"
                @input="editForm.duration = digitsOnly($event.target.value) || ''"
              />
              <span v-else>{{ s.duration }}</span>
            </td>
            <td class="col-price">
              <input
                v-if="editingId === s.id"
                :value="editForm.price"
                class="input input-edit-price"
                @keydown="onDigitsKeydown"
                @input="editForm.price = digitsOnly($event.target.value) || ''"
              />
              <span v-else>{{ s.price }} ₽</span>
            </td>
            <td class="col-actions">
              <template v-if="editingId === s.id">
                <button class="primary-btn small" @click="saveEdit(s.id)">
                  Сохранить
                </button>
                <button class="secondary-btn small" @click="cancelEdit">
                  Отмена
                </button>
              </template>
              <template v-else>
                <button class="secondary-btn small" @click="startEdit(s)">
                  Редактировать
                </button>
                <button class="danger-btn small" @click="remove(s.id)">
                  Удалить
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { digitsOnly } from "@/utils/inputFilters";

export default {
  name: "ServicesPage",
  data() {
    return {
      services: [],
      form: { name: "", description: "", duration: "", price: "" },
      editingId: null,
      editForm: { name: "", description: "", duration: "", price: "" },
    };
  },
  async created() {
    await this.load();
  },
  methods: {
    digitsOnly,
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
    async load() {
      const { data } = await axios.get("/api/services");
      this.services = data;
    },
    async saveNew() {
      if (!this.form.name.trim()) return;
      await axios.post("/api/services", this.form);
      this.form = { name: "", description: "", duration: "", price: "" };
      await this.load();
    },
    startEdit(s) {
      this.editingId = s.id;
      this.editForm = { ...s };
    },
    cancelEdit() {
      this.editingId = null;
    },
    async saveEdit(id) {
      const payload = {
        ...this.editForm,
        duration: Number(this.editForm.duration) || 0,
        price: Number(this.editForm.price) || 0,
      };
      await axios.put(`/api/services/${id}`, payload);
      this.cancelEdit();
      await this.load();
    },
    async remove(id) {
      if (!confirm("Удалить услугу?")) return;
      await axios.delete(`/api/services/${id}`);
      await this.load();
    },
  },
};
</script>

