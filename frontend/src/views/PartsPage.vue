<template>
  <div class="page">
    <h1 class="page-title">Склад запчастей</h1>
    <div class="card">
      <h2>Добавить позицию</h2>
      <div class="form-row">
        <input v-model="form.article" class="input" placeholder="Артикул" />
        <input v-model="form.name" class="input flex-1" placeholder="Название" />
        <input
          :value="form.price"
          class="input"
          placeholder="Цена (в руб.)"
          @keydown="onDigitsKeydown"
          @input="form.price = digitsOnly($event.target.value)"
        />
        <input
          :value="form.quantity"
          class="input"
          placeholder="Количество"
          @keydown="onDigitsKeydown"
          @input="form.quantity = digitsOnly($event.target.value)"
        />
        <button class="primary-btn" @click="saveNew">Добавить</button>
        <button class="secondary-btn" @click="printList">Распечатать</button>
      </div>
    </div>
    <div class="card table-card">
      <table>
        <thead>
          <tr>
            <th>Артикул</th>
            <th>Название</th>
            <th>Цена (руб.)</th>
            <th>Количество</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in parts" :key="p.id">
            <td>{{ p.article }}</td>
            <td>{{ p.name }}</td>
            <td>{{ p.price }}</td>
            <td>{{ p.quantity }}</td>
            <td>
              <button class="danger-btn small" @click="remove(p.id)">Удалить</button>
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
  name: "PartsPage",
  data() {
    return {
      parts: [],
      form: { article: "", name: "", price: "", quantity: "" },
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
      const { data } = await axios.get("/api/parts");
      this.parts = data;
    },
    async saveNew() {
      if (!this.form.article.trim() || !this.form.name.trim()) return;
      await axios.post("/api/parts", {
        article: this.form.article,
        name: this.form.name,
        price: Number(this.form.price) || 0,
        quantity: Number(this.form.quantity) || 0,
      });
      this.form = { article: "", name: "", price: "", quantity: "" };
      await this.load();
    },
    async remove(id) {
      if (!confirm("Удалить позицию?")) return;
      await axios.delete(`/api/parts/${id}`);
      await this.load();
    },
    escapeHtml(s) {
      if (s == null) return "";
      const t = String(s);
      return t
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },
    printList() {
      const rows = this.parts
        .map(
          (p) =>
            "<tr><td>" +
            this.escapeHtml(p.article) +
            "</td><td>" +
            this.escapeHtml(p.name) +
            "</td><td>" +
            p.price +
            "</td><td>" +
            p.quantity +
            "</td></tr>"
        )
        .join("");
      const tbody = rows || "<tr><td colspan=\"4\">Нет данных</td></tr>";
      const html =
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Склад запчастей</title>" +
        "<style>body{font-family:system-ui,sans-serif;padding:16px}h1{margin:0 0 12px;font-size:18px}" +
        "table{width:100%;border-collapse:collapse;font-size:14px}th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}" +
        "th{background:#f5f5f5;font-weight:600}</style></head><body>" +
        "<h1>Склад запчастей</h1><table><thead><tr><th>Артикул</th><th>Название</th><th>Цена (руб.)</th><th>Количество</th></tr></thead>" +
        "<tbody>" +
        tbody +
        "</tbody></table></body></html>";
      const iframe = document.createElement("iframe");
      iframe.setAttribute("style", "position:absolute;width:0;height:0;border:0;visibility:hidden");
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      let printed = false;
      const doPrint = () => {
        if (printed) return;
        printed = true;
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe);
          }, 500);
        }
      };
      iframe.onload = doPrint;
      setTimeout(doPrint, 150);
    },
  },
};
</script>

