<template>
  <div class="page">
    <h1 class="page-title">Механики</h1>
    <div class="card">
      <h2>Добавить механика</h2>
      <div class="form-row">
        <input
          :value="form.fullName"
          class="input"
          placeholder="ФИО"
          @keydown="onNameKeydown"
          @input="form.fullName = nameOnly($event.target.value)"
        />
        <input v-model="form.position" class="input" placeholder="Должность" />
        <input v-model="form.hireDate" class="input" type="date" placeholder="Дата приёма" />
        <button class="primary-btn" @click="saveNew">Сохранить</button>
      </div>
    </div>
    <div class="card table-card">
      <table>
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Должность</th>
            <th>Принят</th>
            <th>Активно</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in mechanics" :key="m.id">
            <td>{{ m.fullName }}</td>
            <td>{{ m.position }}</td>
            <td>{{ m.hireDate }}</td>
            <td>
              <span class="badge" :class="m.active ? 'badge-green' : ''">
                {{ m.active ? "Активно" : "Неактивно" }}
              </span>
            </td>
            <td>
              <button class="secondary-btn small" @click="toggleActive(m)">
                Переключить
              </button>
              <button class="danger-btn small" @click="remove(m.id)">Удалить</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { nameOnly } from "@/utils/inputFilters";

export default {
  name: "MechanicsPage",
  data() {
    return {
      mechanics: [],
      form: { fullName: "", position: "", hireDate: "" },
    };
  },
  async created() {
    await this.load();
  },
  methods: {
    nameOnly,
    onNameKeydown(e) {
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
    async load() {
      const { data } = await axios.get("/api/mechanics");
      this.mechanics = data;
    },
    async saveNew() {
      if (!this.form.fullName.trim()) return;
      await axios.post("/api/mechanics", { ...this.form, active: false });
      this.form = { fullName: "", position: "", hireDate: "" };
      await this.load();
    },
    async toggleActive(m) {
      await axios.put(`/api/mechanics/${m.id}`, { active: !m.active });
      await this.load();
    },
    async remove(id) {
      if (!confirm("Удалить механика?")) return;
      await axios.delete(`/api/mechanics/${id}`);
      await this.load();
    },
  },
};
</script>

