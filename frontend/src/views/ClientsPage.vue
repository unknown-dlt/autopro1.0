<template>
  <div class="page">
    <h1 class="page-title">Клиенты</h1>
    <div class="card">
      <h2>Добавить клиента</h2>
      <div class="form-row">
        <input
          :value="form.name"
          class="input"
          placeholder="Имя"
          @keydown="onNameKeydown"
          @input="form.name = nameOnly($event.target.value)"
        />
        <input
          v-model="form.phone"
          class="input"
          placeholder="Телефон"
          @keydown="onPhoneKeydown"
          @input="onPhoneInput"
        />
        <input
          v-model="form.note"
          class="input flex-1"
          placeholder="Примечание (необязательно)"
        />
        <button class="primary-btn" @click="addClient">Сохранить</button>
      </div>
    </div>

    <div class="card table-card">
      <table>
        <thead>
          <tr>
            <th>Имя</th>
            <th>Телефон</th>
            <th>Примечание</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in clients" :key="c.id">
            <td>{{ c.name }}</td>
            <td>{{ c.phone }}</td>
            <td>{{ c.note || "—" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { formatPhone, nameOnly } from "@/utils/inputFilters";

export default {
  name: "ClientsPage",
  data() {
    return {
      clients: [],
      form: { name: "", phone: "", note: "" },
    };
  },
  async created() {
    await this.loadClients();
  },
  methods: {
    formatPhone,
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
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    },
    async loadClients() {
      const { data } = await axios.get("/api/clients");
      this.clients = data;
    },
    onPhoneInput(e) {
      this.form.phone = formatPhone(e.target.value);
    },
    async addClient() {
      if (!this.form.name.trim() || !this.form.phone.trim()) {
        alert("Укажите имя и телефон");
        return;
      }
      await axios.post("/api/clients", this.form);
      this.form = { name: "", phone: "", note: "" };
      await this.loadClients();
    },
  },
};
</script>

